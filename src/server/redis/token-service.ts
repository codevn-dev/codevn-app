import { config } from '@/config';
import { logger } from '@/lib/utils/logger';
import { getRedis } from '@/lib/server';

export class TokenService {
  private redis: any;

  constructor() {
    this.redis = getRedis();
  }

  private getDefaultTtlSeconds(tokenType: 'access' | 'refresh'): number {
    return tokenType === 'access'
      ? config.auth.accessTokenExpiresIn
      : config.auth.refreshTokenExpiresIn;
  }

  /**
   * Store JWT token in Redis with user payload
   */
  async storeToken(
    token: string,
    payload: any,
    tokenType: 'access' | 'refresh',
    ttl?: number
  ): Promise<void> {
    const key = `auth:${tokenType}:${token}`;
    // Default TTL uses numeric seconds from config.auth.*ExpiresIn
    const ttlSeconds = ttl || this.getDefaultTtlSeconds(tokenType);

    await this.redis.setex(key, ttlSeconds, JSON.stringify(payload));
  }

  /**
   * Get user payload from Redis by token
   */
  async getToken(token: string, tokenType: 'access' | 'refresh'): Promise<any | null> {
    const key = `auth:${tokenType}:${token}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error parsing token data from Redis', undefined, error as Error);
      return null;
    }
  }

  /**
   * Delete token from Redis
   */
  async deleteToken(token: string, tokenType: 'access' | 'refresh'): Promise<void> {
    const key = `auth:${tokenType}:${token}`;
    await this.redis.del(key);
  }

  /**
   * Check if token exists in Redis
   */
  async isTokenValid(token: string, tokenType: 'access' | 'refresh'): Promise<boolean> {
    const key = `auth:${tokenType}:${token}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }
}
