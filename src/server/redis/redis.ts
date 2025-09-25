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
    const key = `auth:user:${userId}:sessions`;
    await this.redis.del(key);
  }
}

// Factory function to create Redis service
export function createRedisAuthService(): RedisAuthService {
  return new RedisAuthService();
}
