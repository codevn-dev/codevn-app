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
    const refreshTokens = await this.userService.getUserTokens(userId); // Now contains refresh JTIs
    const sessions = [] as any[];
    let currentRefreshJti: string | null = null;

    if (currentToken) {
      try {
        jwt.verify(currentToken, config.auth.secret);
        const decoded = jwt.decode(currentToken, { complete: true }) as any;
        const currentAccessJti = decoded?.payload?.jti || null;

        // Find the refresh token that corresponds to this access token
        if (currentAccessJti) {
          const currentAccessData = await this.tokenService.getToken(currentAccessJti, 'access');
          currentRefreshJti = currentAccessData?.refreshJti || null;
        }
      } catch {
        currentRefreshJti = null;
      }
    }

    for (const refreshJti of refreshTokens) {
      // Get session data directly from refresh token (more reliable for active sessions)
      const refreshData = await this.tokenService.getToken(refreshJti, 'refresh');
      if (refreshData && refreshData.sessionMetadata) {
        const sessionMetadata = refreshData.sessionMetadata;
        const countryCode = sessionMetadata.country?.code;

        // Get country name from country service
        let country = null;

        if (countryCode && countryCode !== 'Unknown') {
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

        // Check if this is the current session by comparing refresh JTI
        const isCurrent = currentRefreshJti ? refreshJti === currentRefreshJti : false;

        sessions.push({
          token: refreshJti, // Use refresh JTI for token field (for terminateSession)
          country,
          deviceInfo: sessionMetadata.deviceInfo || 'Unknown Device',
          loginTime: sessionMetadata.loginTime || new Date().toISOString(),
          lastActive: sessionMetadata.lastActive || new Date().toISOString(),
          isCurrent,
        });
      }
    }

    return sessions;
  }

  async terminateSession(userId: string, refreshJti: string): Promise<void> {
    const refreshData = await this.tokenService.getToken(refreshJti, 'refresh');
    if (refreshData) {
      // Remove refresh token from user's token set
      await this.userService.removeTokenFromUser(userId, refreshJti);
      // Delete both tokens
      await this.tokenService.deleteToken(refreshJti, 'refresh');
      if (refreshData.accessJti) {
        await this.tokenService.deleteToken(refreshData.accessJti, 'access');
      }
    }
  }
}
