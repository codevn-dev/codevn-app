import { config } from '@/config';
import { logger } from '@/lib/utils/logger';
import { getRedis } from '@/lib/server';

export interface RedisService {
  storeToken(token: string, payload: any, ttl?: number): Promise<void>;
  getToken(token: string): Promise<any | null>;
  deleteToken(token: string): Promise<void>;
  setUserProfile(userId: string, data: any, ttlSeconds?: number): Promise<void>;
  getUserProfile(userId: string): Promise<any | null>;
  deleteUserProfile(userId: string): Promise<void>;
  storeSession(sessionId: string, data: any, ttl?: number): Promise<void>;
  getSession(sessionId: string): Promise<any | null>;
  deleteSession(sessionId: string): Promise<void>;
  isTokenValid(token: string): Promise<boolean>;
  refreshToken(token: string, ttl?: number): Promise<void>;
}

export class RedisAuthService implements RedisService {
  private redis: any;

  constructor() {
    this.redis = getRedis();
  }

  /**
   * Store JWT token in Redis with user payload
   */
  async storeToken(token: string, payload: any, ttl?: number): Promise<void> {
    const key = `auth:token:${token}`;
    const ttlSeconds = ttl || config.auth.maxAge;

    await this.redis.setex(key, ttlSeconds, JSON.stringify(payload));
  }

  /**
   * Get user payload from Redis by token
   */
  async getToken(token: string): Promise<any | null> {
    const key = `auth:token:${token}`;
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
  async deleteToken(token: string): Promise<void> {
    const key = `auth:token:${token}`;
    await this.redis.del(key);
  }

  /**
   * Cache user profile payload by user id
   */
  async setUserProfile(userId: string, data: any, ttlSeconds: number = 3600): Promise<void> {
    const key = `user:profile:${userId}`;
    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
  }

  /**
   * Get cached user profile payload by user id
   */
  async getUserProfile(userId: string): Promise<any | null> {
    const key = `user:profile:${userId}`;
    const data = await this.redis.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error parsing user profile from Redis', undefined, error as Error);
      return null;
    }
  }

  /**
   * Delete cached user profile payload by user id
   */
  async deleteUserProfile(userId: string): Promise<void> {
    const key = `user:profile:${userId}`;
    await this.redis.del(key);
  }

  /**
   * Store session data in Redis
   */
  async storeSession(sessionId: string, data: any, ttl?: number): Promise<void> {
    const key = `auth:session:${sessionId}`;
    const ttlSeconds = ttl || 24 * 60 * 60; // 24 hours default

    await this.redis.setex(key, ttlSeconds, JSON.stringify(data));
  }

  /**
   * Get session data from Redis
   */
  async getSession(sessionId: string): Promise<any | null> {
    const key = `auth:session:${sessionId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data);
    } catch (error) {
      logger.error('Error parsing session data from Redis', undefined, error as Error);
      return null;
    }
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionId: string): Promise<void> {
    const key = `auth:session:${sessionId}`;
    await this.redis.del(key);
  }

  /**
   * Check if token exists and is valid in Redis
   */
  async isTokenValid(token: string): Promise<boolean> {
    const key = `auth:token:${token}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Refresh token TTL in Redis
   */
  async refreshToken(token: string, ttl?: number): Promise<void> {
    const key = `auth:token:${token}`;
    const ttlSeconds = ttl || config.auth.maxAge;

    // Check if token exists first
    const exists = await this.redis.exists(key);
    if (exists === 1) {
      await this.redis.expire(key, ttlSeconds);
    }
  }

  /**
   * Store user's active sessions (for logout from all devices)
   */
  async storeUserSession(userId: string, sessionId: string, ttl?: number): Promise<void> {
    const key = `auth:user:${userId}:sessions`;
    const ttlSeconds = ttl || config.auth.maxAge;

    // Add session to set
    await this.redis.sadd(key, sessionId);
    await this.redis.expire(key, ttlSeconds);
  }

  /**
   * Get all active sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const key = `auth:user:${userId}:sessions`;
    return await this.redis.smembers(key);
  }

  /**
   * Remove user session from active sessions
   */
  async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `auth:user:${userId}:sessions`;
    await this.redis.srem(key, sessionId);
  }

  /**
   * Logout user from all devices (clear all sessions)
   */
  async logoutAllDevices(userId: string): Promise<void> {
    const sessions = await this.getUserSessions(userId);

    // Delete all session data
    for (const sessionId of sessions) {
      await this.deleteSession(sessionId);
    }

    // Clear user sessions set
    const sessionsKey = `auth:user:${userId}:sessions`;
    await this.redis.del(sessionsKey);

    // Clear user tokens set
    const tokensKey = `auth:user:${userId}:tokens`;
    await this.redis.del(tokensKey);
  }

  /**
   * Update user data in all active tokens (for role changes)
   * This is complex because we need to find all tokens for a user
   * Alternative: Use a user->tokens mapping
   */
  async updateUserInAllTokens(userId: string, updatedUserData: any): Promise<void> {
    // Get all tokens for this user from the user sessions
    const userTokensKey = `auth:user:${userId}:tokens`;
    const tokens = await this.redis.smembers(userTokensKey);

    if (tokens.length === 0) {
      // Fallback: If tokens set expired, we can't update existing tokens
      // User will need to login again to get updated role
      return;
    }

    // Update each token's payload
    for (const token of tokens) {
      await this.storeToken(token, updatedUserData);
    }
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
    await this.redis.srem(userTokensKey, token);

    // Check if set is empty and remove it
    const remainingTokens = await this.redis.scard(userTokensKey);
    if (remainingTokens === 0) {
      await this.redis.del(userTokensKey);
    }
  }

  /**
   * Logout specific session by token
   */
  async terminateSession(userId: string, token: string): Promise<void> {
    // Remove token from user's token set
    await this.removeTokenFromUser(userId, token);
    // Delete token data
    await this.deleteToken(token);
  }

  /**
   * Find token by prefix (for session management)
   */
  async findTokenByPrefix(userId: string, tokenPrefix: string): Promise<string | null> {
    const userTokensKey = `auth:user:${userId}:tokens`;
    const tokens = await this.redis.smembers(userTokensKey);

    for (const token of tokens) {
      if (token.startsWith(tokenPrefix.replace('...', ''))) {
        return token;
      }
    }

    return null;
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string, currentToken?: string): Promise<any[]> {
    const userTokensKey = `auth:user:${userId}:tokens`;
    const tokens = await this.redis.smembers(userTokensKey);

    const sessions = [];
    for (const token of tokens) {
      const tokenData = await this.getToken(token);
      if (tokenData && tokenData.sessionMetadata) {
        const isCurrent = currentToken ? token === currentToken : false;

        sessions.push({
          token: token, // Return full token
          countryCode: tokenData.sessionMetadata.countryCode,
          deviceInfo: tokenData.sessionMetadata.deviceInfo,
          loginTime: tokenData.sessionMetadata.loginTime,
          lastActive: tokenData.sessionMetadata.lastActive,
          isCurrent,
        });
      }
    }

    return sessions;
  }

  /**
   * Get all tokens for a user
   */
  async getUserTokens(userId: string): Promise<string[]> {
    const key = `auth:user:${userId}:tokens`;
    const tokens = await this.redis.smembers(key);
    return tokens;
  }
}

// Factory function to create Redis service
export function createRedisAuthService(): RedisAuthService {
  return new RedisAuthService();
}
