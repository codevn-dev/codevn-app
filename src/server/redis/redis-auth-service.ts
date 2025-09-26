import { TokenService } from './token-service';
import { UserService } from './user-service';
import { SessionService } from './session-service';

export interface RedisService {
  // Token management
  storeToken(
    token: string,
    payload: any,
    tokenType: 'access' | 'refresh',
    ttl?: number
  ): Promise<void>;
  getToken(token: string, tokenType: 'access' | 'refresh'): Promise<any | null>;
  deleteToken(token: string, tokenType: 'access' | 'refresh'): Promise<void>;
  isTokenValid(token: string, tokenType: 'access' | 'refresh'): Promise<boolean>;

  // User profile caching
  setUserProfile(userId: string, data: any, ttlSeconds?: number): Promise<void>;
  getUserProfile(userId: string): Promise<any | null>;
  deleteUserProfile(userId: string): Promise<void>;

  // User token tracking
  addTokenToUser(userId: string, token: string): Promise<void>;
  removeTokenFromUser(userId: string, token: string): Promise<void>;
  getUserTokens(userId: string): Promise<string[]>;
  getUserActiveSessions(userId: string, currentToken?: string): Promise<any[]>;

  // Token updates
  updateUserInAllTokens(userId: string, updatedUserData: any): Promise<void>;

  // Session termination
  terminateSession(userId: string, token: string): Promise<void>;
}

export class RedisAuthService implements RedisService {
  private tokenService: TokenService;
  private userService: UserService;
  private sessionService: SessionService;

  constructor() {
    this.tokenService = new TokenService();
    this.userService = new UserService();
    this.sessionService = new SessionService();
  }

  // Token management
  async storeToken(
    token: string,
    payload: any,
    tokenType: 'access' | 'refresh',
    ttl?: number
  ): Promise<void> {
    return this.tokenService.storeToken(token, payload, tokenType, ttl);
  }

  async getToken(token: string, tokenType: 'access' | 'refresh'): Promise<any | null> {
    return this.tokenService.getToken(token, tokenType);
  }

  async deleteToken(token: string, tokenType: 'access' | 'refresh'): Promise<void> {
    return this.tokenService.deleteToken(token, tokenType);
  }

  async isTokenValid(token: string, tokenType: 'access' | 'refresh'): Promise<boolean> {
    return this.tokenService.isTokenValid(token, tokenType);
  }

  // User profile caching
  async setUserProfile(userId: string, data: any, ttlSeconds?: number): Promise<void> {
    return this.userService.setUserProfile(userId, data, ttlSeconds);
  }

  async getUserProfile(userId: string): Promise<any | null> {
    return this.userService.getUserProfile(userId);
  }

  async deleteUserProfile(userId: string): Promise<void> {
    return this.userService.deleteUserProfile(userId);
  }

  // User token tracking
  async addTokenToUser(userId: string, token: string): Promise<void> {
    return this.userService.addTokenToUser(userId, token);
  }

  async removeTokenFromUser(userId: string, token: string): Promise<void> {
    return this.userService.removeTokenFromUser(userId, token);
  }

  async getUserTokens(userId: string): Promise<string[]> {
    return this.userService.getUserTokens(userId);
  }

  async getUserActiveSessions(userId: string, currentToken?: string): Promise<any[]> {
    return this.sessionService.getUserActiveSessions(userId, currentToken);
  }

  // Token updates
  async updateUserInAllTokens(userId: string, updatedUserData: any): Promise<void> {
    return this.userService.updateUserInAllTokens(userId, updatedUserData);
  }

  // Session termination
  async terminateSession(userId: string, token: string): Promise<void> {
    return this.sessionService.terminateSession(userId, token);
  }
}
