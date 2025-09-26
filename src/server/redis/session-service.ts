import { logger } from '@/lib/utils/logger';
import { getRedis } from '@/lib/server';
import { TokenService } from './token-service';
import { UserService } from './user-service';

export class SessionService {
  private redis: any;
  private tokenService: TokenService;
  private userService: UserService;

  constructor() {
    this.redis = getRedis();
    this.tokenService = new TokenService();
    this.userService = new UserService();
  }

  /**
   * Store session data in Redis
   */
  async storeSession(sessionId: string, data: any, ttl?: number): Promise<void> {
    const key = `auth:session:${sessionId}`;
    const ttlSeconds = ttl || 30 * 24 * 60 * 60; // 30 days default
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
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string, currentToken?: string): Promise<any[]> {
    const tokens = await this.userService.getUserTokens(userId);
    const sessions = [];

    for (const token of tokens) {
      const tokenData = await this.tokenService.getToken(token, 'access');
      if (tokenData) {
        const session = {
          token,
          countryCode: tokenData.sessionMetadata?.countryCode || 'Unknown',
          deviceInfo: tokenData.sessionMetadata?.deviceInfo || 'Unknown Device',
          loginTime: tokenData.sessionMetadata?.loginTime || new Date().toISOString(),
          lastActive: tokenData.sessionMetadata?.lastActive || new Date().toISOString(),
          isCurrent: currentToken ? token === currentToken : false,
        };
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(userId: string, token: string): Promise<void> {
    await this.userService.removeTokenFromUser(userId, token);
    await this.tokenService.deleteToken(token, 'access');
    
    // Find and delete corresponding refresh token
    const correspondingRefreshToken = await this.tokenService.getToken(`pair:${token}`, 'access');
    if (correspondingRefreshToken) {
      await this.tokenService.deleteToken(correspondingRefreshToken, 'refresh');
      await this.tokenService.deleteToken(`pair:${token}`, 'access'); // Delete mapping
    }
  }
}
