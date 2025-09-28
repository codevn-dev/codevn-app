import { getRedis } from '@/lib/server';
import { logger } from '@/lib/utils/logger';

export class RedisFirstUserService {
  private readonly key = 'system:first_user_exists';

  /**
   * Check if first user exists from Redis cache
   * Returns null if not cached, true/false if cached
   */
  async get(): Promise<boolean | null> {
    try {
      const redis = getRedis();
      const value = await redis.get(this.key);

      if (value === null) {
        return null; // Not cached
      }

      return value === 'true';
    } catch (error) {
      logger.error('Error getting first user status from Redis', undefined, error as Error);
      return null; // Fallback to database
    }
  }

  /**
   * Set first user status in Redis cache (permanent, no TTL)
   */
  async set(hasFirstUser: boolean): Promise<void> {
    try {
      const redis = getRedis();
      await redis.set(this.key, hasFirstUser.toString());
    } catch (error) {
      logger.error('Error setting first user status in Redis', undefined, error as Error);
      // Don't throw, just log the error
    }
  }
}

export function createRedisFirstUserService(): RedisFirstUserService {
  return new RedisFirstUserService();
}
