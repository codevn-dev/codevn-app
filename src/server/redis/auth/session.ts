import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { TokenService } from './token';
import { UserService } from './user';
import { CountryService } from '../../services/country';
import { logger } from '@/lib/utils/logger';

export class SessionService {
  private tokenService: TokenService;
  private userService: UserService;

  constructor() {
    this.tokenService = new TokenService();
    this.userService = new UserService();
  }

  async getUserActiveSessions(userId: string, currentToken?: string): Promise<any[]> {
    const tokens = await this.userService.getUserTokens(userId);
    const sessions = [] as any[];
    let currentJti: string | null = null;

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
        const countryCode = tokenData.sessionMetadata?.country?.code || 'Unknown';

        // Get country name from country service
        let country = null;

        if (countryCode !== 'Unknown') {
          try {
            const countryInfo = await CountryService.getByCode(countryCode);
            if (countryInfo) {
              country = {
                code: countryCode,
                name: countryInfo.name,
              };
            }
          } catch (error) {
            // If country lookup fails, keep default values
            logger.error('Failed to get country info:', { error });
          }
        }

        sessions.push({
          token,
          country,
          deviceInfo: tokenData.sessionMetadata?.deviceInfo || 'Unknown Device',
          loginTime: tokenData.sessionMetadata?.loginTime || new Date().toISOString(),
          lastActive: tokenData.sessionMetadata?.lastActive || new Date().toISOString(),
          isCurrent: currentJti ? token === currentJti : false,
        });
      }
    }

    return sessions;
  }

  async terminateSession(userId: string, accessJti: string): Promise<void> {
    const tokenData = await this.tokenService.getToken(accessJti, 'access');
    await this.userService.removeTokenFromUser(userId, accessJti);
    await this.tokenService.deleteToken(accessJti, 'access');
    if (tokenData?.refreshJti) {
      await this.tokenService.deleteToken(tokenData.refreshJti, 'refresh');
    }
  }
}
