import { FastifyRequest, FastifyReply } from 'fastify';
import { getRedis } from '@/lib/server';
import { config } from '@/config';
import { logger } from '@/lib/utils/logger';

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (request: FastifyRequest) => string;
  skip?: (request: FastifyRequest) => boolean;
}

export class RedisRateLimit {
  private redis: any;
  private options: RateLimitOptions;

  constructor(options: RateLimitOptions) {
    this.redis = getRedis();
    this.options = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      keyGenerator: this.defaultKeyGenerator,
      skip: this.defaultSkip,
      ...options,
    };
  }

  /**
   * Default key generator - uses IP address
   */
  private defaultKeyGenerator(request: FastifyRequest): string {
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    return `rate_limit:${ip}`;
  }

  /**
   * Default skip function - skips for trusted internal calls
   */
  private defaultSkip(request: FastifyRequest): boolean {
    // Skip for health checks
    const isHealthCheck = request.url?.includes('/health') || request.url?.includes('/api/health');

    // Skip for internal calls with valid secret token
    const internalToken = request.headers['x-internal-token'];
    const isValidInternalCall = internalToken === config.api.internalSecret;

    return isHealthCheck || isValidInternalCall;
  }

  /**
   * Check if request should be rate limited
   */
  async check(request: FastifyRequest): Promise<{
    allowed: boolean;
    totalHits: number;
    remaining: number;
    resetTime: number;
  }> {
    // Skip rate limiting if conditions are met
    if (this.options.skip!(request)) {
      return {
        allowed: true,
        totalHits: 0,
        remaining: this.options.maxRequests,
        resetTime: Date.now() + this.options.windowMs,
      };
    }

    const key = this.options.keyGenerator!(request);
    const windowMs = this.options.windowMs;
    const maxRequests = this.options.maxRequests;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Get current count
      pipeline.get(key);

      // Set expiration if key doesn't exist
      pipeline.expire(key, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      const currentCount = results[0][1] ? parseInt(results[0][1] as string) : 0;

      if (currentCount >= maxRequests) {
        // Rate limit exceeded
        const ttl = await this.redis.ttl(key);
        const resetTime = Date.now() + ttl * 1000;

        return {
          allowed: false,
          totalHits: currentCount,
          remaining: 0,
          resetTime,
        };
      }

      // Increment counter
      const newCount = await this.redis.incr(key);

      // Set expiration on first increment
      if (newCount === 1) {
        await this.redis.expire(key, Math.ceil(windowMs / 1000));
      }

      return {
        allowed: true,
        totalHits: newCount,
        remaining: Math.max(0, maxRequests - newCount),
        resetTime: Date.now() + windowMs,
      };
    } catch (error) {
      logger.error('Rate limit Redis error', undefined, error as Error);

      // On Redis error, allow the request (fail open)
      return {
        allowed: true,
        totalHits: 0,
        remaining: this.options.maxRequests,
        resetTime: Date.now() + windowMs,
      };
    }
  }

  /**
   * Fastify plugin function
   */
  async plugin(fastify: any) {
    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await this.check(request);

      // Set rate limit headers
      reply.header('X-RateLimit-Limit', this.options.maxRequests);
      reply.header('X-RateLimit-Remaining', result.remaining);
      reply.header('X-RateLimit-Reset', new Date(result.resetTime).toISOString());

      if (!result.allowed) {
        reply.status(429).send({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        });
        return;
      }
    });
  }
}

/**
 * Create a rate limit instance with default configuration
 */
export function createRateLimit(options?: Partial<RateLimitOptions>): RedisRateLimit {
  return new RedisRateLimit({
    maxRequests: config.rateLimit.maxRequests,
    windowMs: config.rateLimit.windowMs,
    ...options,
  });
}

/**
 * Fastify plugin for rate limiting
 */
export async function rateLimitPlugin(fastify: any, options?: Partial<RateLimitOptions>) {
  const rateLimit = createRateLimit(options);
  await rateLimit.plugin(fastify);
}
