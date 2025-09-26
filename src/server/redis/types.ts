export interface RedisService {
  // Token management
  storeToken(token: string, payload: any, tokenType: 'access' | 'refresh', ttl?: number): Promise<void>;
  getToken(token: string, tokenType: 'access' | 'refresh'): Promise<any | null>;
  deleteToken(token: string, tokenType: 'access' | 'refresh'): Promise<void>;
  isTokenValid(token: string, tokenType: 'access' | 'refresh'): Promise<boolean>;
  refreshToken(token: string, tokenType: 'access' | 'refresh', ttl?: number): Promise<void>;

  // User profile caching
  setUserProfile(userId: string, data: any, ttlSeconds?: number): Promise<void>;
  getUserProfile(userId: string): Promise<any | null>;
  deleteUserProfile(userId: string): Promise<void>;

  // Session management
  storeSession(sessionId: string, data: any, ttl?: number): Promise<void>;
  getSession(sessionId: string): Promise<any | null>;
  deleteSession(sessionId: string): Promise<void>;

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
