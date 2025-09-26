import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { TokenService } from './token-service';
import { UserService } from './user-service';

export class SessionService {
  private tokenService: TokenService;
  private userService: UserService;

  constructor() {
    this.tokenService = new TokenService();
    this.userService = new UserService();
  }

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userId: string, currentToken?: string): Promise<any[]> {
    const tokens = await this.userService.getUserTokens(userId); // access JTIs
    const sessions = [];
    let currentJti: string | null = null;

    // Verify current token and extract its JTI
    if (currentToken) {
      try {
        jwt.verify(currentToken, config.auth.secret);
        const decoded = jwt.decode(currentToken, { complete: true }) as any;
        currentJti = decoded?.payload?.jti || null;
      } catch {
        currentJti = null;
      }
    }

    for (const token of tokens) {
      const tokenData = await this.tokenService.getToken(token, 'access');
      if (tokenData) {
        const session = {
          token,
          countryCode: tokenData.sessionMetadata?.countryCode || 'Unknown',
          deviceInfo: tokenData.sessionMetadata?.deviceInfo || 'Unknown Device',
          loginTime: tokenData.sessionMetadata?.loginTime || new Date().toISOString(),
          lastActive: tokenData.sessionMetadata?.lastActive || new Date().toISOString(),
          isCurrent: currentJti ? token === currentJti : false,
        };
        sessions.push(session);
      }
    }

    return sessions;
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(userId: string, accessJti: string): Promise<void> {
    const tokenData = await this.tokenService.getToken(accessJti, 'access');
    await this.userService.removeTokenFromUser(userId, accessJti);
    await this.tokenService.deleteToken(accessJti, 'access');
    if (tokenData?.refreshJti) {
      await this.tokenService.deleteToken(tokenData.refreshJti, 'refresh');
    }
  }
}
