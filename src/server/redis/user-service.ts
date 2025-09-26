import { config } from '@/config';
import { logger } from '@/lib/utils/logger';
import { getRedis } from '@/lib/server';

export class UserService {
  private redis: any;

  constructor() {
    this.redis = getRedis();
  }

  /**
   * Set user profile cache
   */
  async setUserProfile(userId: string, data: any, ttlSeconds?: number): Promise<void> {
    const key = `user:profile:${userId}`;
    const ttl = ttlSeconds || 60 * 60; // 1 hour default
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  /**
   * Get user profile from cache
   */
  async getUserProfile(userId: string): Promise<any | null> {
    const key = `user:profile:${userId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error parsing user profile data from Redis', undefined, error as Error);
      return null;
    }
  }

  /**
   * Delete user profile cache
   */
  async deleteUserProfile(userId: string): Promise<void> {
    const key = `user:profile:${userId}`;
    await this.redis.del(key);
  }

  /**
   * Add token to user's token set (called when token is created)
   */
  async addTokenToUser(userId: string, token: string): Promise<void> {
    const userTokensKey = `auth:user:${userId}:tokens`;

    // Add token to set (no TTL - keep permanently)
    await this.redis.sadd(userTokensKey, token);
  }

  /**
   * Remove token from user's token set (called when token is deleted)
   */
  async removeTokenFromUser(userId: string, token: string): Promise<void> {
    const userTokensKey = `auth:user:${userId}:tokens`;

    // Remove token from set
    await this.redis.srem(userTokensKey, token);

    // If set is empty, delete the key entirely
    const remainingTokens = await this.redis.scard(userTokensKey);
    if (remainingTokens === 0) {
      await this.redis.del(userTokensKey);
    }
  }

  /**
   * Get all tokens for a user
   */
  async getUserTokens(userId: string): Promise<string[]> {
    const userTokensKey = `auth:user:${userId}:tokens`;
    return await this.redis.smembers(userTokensKey);
  }

  /**
   * Update user data in all active tokens (for role changes)
   */
  async updateUserInAllTokens(userId: string, updatedUserData: any): Promise<void> {
    const tokens = await this.getUserTokens(userId);

    for (const token of tokens) {
      // Get current token data
      const tokenData = await this.redis.get(`auth:token:${token}`);
      if (tokenData) {
        try {
          const parsed = JSON.parse(tokenData);
          // Update user data while preserving other fields
          const updatedTokenData = {
            ...parsed,
            ...updatedUserData,
          };
          await this.redis.setex(`auth:token:${token}`, config.auth.maxAge, JSON.stringify(updatedTokenData));
        } catch (error) {
          logger.error('Error updating token data', undefined, error as Error);
        }
      }
    }
  }
}
