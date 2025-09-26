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
   * Add access JTI to user's token set (called when token is created)
   */
  async addTokenToUser(userId: string, token: string): Promise<void> {
    const userTokensKey = `auth:user:${userId}:tokens`;
    await this.redis.sadd(userTokensKey, token);
    // Align the lifetime of the user's token set with refresh token lifetime
    await this.redis.expire(userTokensKey, config.auth.refreshTokenExpiresIn);
  }

  /**
   * Remove access JTI from user's token set (called when token is deleted)
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
   * Get all access JTIs for a user
   */
  async getUserTokens(userId: string): Promise<string[]> {
    const userTokensKey = `auth:user:${userId}:tokens`;
    return await this.redis.smembers(userTokensKey);
  }

  /**
   * Update user data in all active access tokens (for role changes)
   */
  async updateUserInAllTokens(userId: string, updatedUserData: any): Promise<void> {
    const tokens = await this.getUserTokens(userId);

    for (const token of tokens) {
      // token is access JTI
      const tokenData = await this.redis.get(`auth:access:${token}`);
      if (tokenData) {
        try {
          const parsed = JSON.parse(tokenData);
          // Update user data while preserving other fields
          const updatedTokenData = {
            ...parsed,
            ...updatedUserData,
          };
          await this.redis.setex(
            `auth:access:${token}`,
            config.auth.accessTokenExpiresIn,
            JSON.stringify(updatedTokenData)
          );
        } catch (error) {
          logger.error('Error updating token data', undefined, error as Error);
        }
      }
    }
  }
}
