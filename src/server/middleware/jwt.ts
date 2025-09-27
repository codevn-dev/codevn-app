import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/config';
import type { JWTPayload, RefreshTokenPayload, SessionMetadata } from '@/types/shared/auth';

// Global Redis service instance - will be set during server initialization
let redisService: any = null;

export function setRedisService(service: any): void {
  redisService = service;
}

export async function generateTokenPair(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  sessionMetadata?: SessionMetadata
): Promise<{ accessToken: string; refreshToken: string }> {
  // Generate JTIs for access and refresh
  const accessJti = uuidv4();
  const refreshJti = uuidv4();

  // Refresh token
  const refreshTokenPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    id: payload.id,
    sessionMetadata: sessionMetadata,
  };
  const refreshToken = jwt.sign(refreshTokenPayload, config.auth.secret, {
    expiresIn: config.auth.refreshTokenExpiresIn,
    jwtid: refreshJti,
  });

  // Access token (include sessionMetadata for consistency)
  const accessTokenPayload = {
    id: payload.id,
    role: payload.role,
    sessionMetadata: sessionMetadata,
  };
  const accessToken = jwt.sign(accessTokenPayload, config.auth.secret, {
    expiresIn: config.auth.accessTokenExpiresIn,
    jwtid: accessJti,
  });

  // Store user data in Redis for fast access
  if (redisService) {
    try {
      const accessRedisPayload = {
        userId: payload.id,
        refreshJti,
        sessionMetadata: sessionMetadata,
      };

      const refreshRedisPayload = {
        userId: payload.id,
        sessionMetadata: sessionMetadata,
      };

      // Store by JTI
      await redisService.storeToken(accessJti, accessRedisPayload, 'access');
      await redisService.storeToken(refreshJti, refreshRedisPayload, 'refresh');
      await redisService.addTokenToUser(payload.id, refreshJti);
    } catch (error) {
      console.error('[JWT] Error storing token data in Redis:', error);
    }
  }

  return { accessToken, refreshToken };
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // First verify JWT signature and expiration
    const payload = jwt.verify(token, config.auth.secret as string) as JWTPayload;

    // Then check if token exists in Redis (for logout functionality)
    if (redisService) {
      const decoded = jwt.decode(token, { complete: true }) as any;
      const jti = decoded?.payload?.jti as string | undefined;
      if (!jti) return null;
      const isValid = await redisService.isTokenValid(jti, 'access');
      if (!isValid) {
        return null;
      }
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Revoke both access token and refresh token
 */
export async function revokeTokenPair(
  accessToken?: string | null,
  refreshToken?: string | null
): Promise<void> {
  if (redisService) {
    // Revoke access token if provided
    if (accessToken) {
      const decoded = jwt.decode(accessToken, { complete: true }) as any;
      const accessJti = decoded?.payload?.jti as string | undefined;
      if (accessJti) {
        const payload = await redisService.getToken(accessJti, 'access');
        if (payload) {
          await redisService.deleteToken(accessJti, 'access');
          if (payload.refreshJti) {
            await redisService.removeTokenFromUser(payload.id, payload.refreshJti);
            await redisService.deleteToken(payload.refreshJti, 'refresh');
          }
        }
      }
    }

    // Revoke refresh token if provided
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken, { complete: true }) as any;
      const refreshJti = decoded?.payload?.jti as string | undefined;
      if (refreshJti) {
        const refreshData = await redisService.getToken(refreshJti, 'refresh');
        if (refreshData) {
          await redisService.removeTokenFromUser(refreshData.userId, refreshJti);
          await redisService.deleteToken(refreshJti, 'refresh');
          if (refreshData.accessJti) {
            await redisService.deleteToken(refreshData.accessJti, 'access');
          }
        }
      }
    }
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function verifyRefreshToken(
  refreshToken: string
): Promise<RefreshTokenPayload | null> {
  try {
    // First verify JWT signature and expiration
    const payload = jwt.verify(refreshToken, config.auth.secret) as RefreshTokenPayload;

    // Then check if refresh token exists in Redis and get sessionMetadata
    if (redisService) {
      const decoded = jwt.decode(refreshToken, { complete: true }) as any;
      const refreshJti = decoded?.payload?.jti as string | undefined;
      if (!refreshJti) return null;
      const isValid = await redisService.isTokenValid(refreshJti, 'refresh');
      if (!isValid) {
        return null; // Refresh token was revoked
      }

      // Get sessionMetadata from Redis (for consistency, though it's also in JWT payload)
      const refreshData = await redisService.getToken(refreshJti, 'refresh');
      if (refreshData?.sessionMetadata) {
        payload.sessionMetadata = refreshData.sessionMetadata;
      }
    }

    return payload;
  } catch (error) {
    console.error('[JWT] Error verifying refresh token:', error);
    return null;
  }
}

export async function getUserFromToken(token: string): Promise<JWTPayload | null> {
  try {
    // First verify JWT signature and expiration
    const payload = jwt.verify(token, config.auth.secret as string) as JWTPayload;

    // Then check if token exists in Redis and get cached user data
    if (redisService) {
      const decoded = jwt.decode(token, { complete: true }) as any;
      const jti = decoded?.payload?.jti as string | undefined;
      if (!jti) return null;
      const accessData = await redisService.getToken(jti, 'access');
      if (!accessData) {
        return null; // Token was revoked
      }

      // Extend TTL for user's tokens set when user is active

      // Get sessionMetadata from access token (now stored in both tokens)
      const sessionMetadata = accessData.sessionMetadata;
      if (sessionMetadata) {
        // Update lastActive time for this session (only in access token)
        sessionMetadata.lastActive = new Date().toISOString();
        await redisService.storeToken(jti, accessData, 'access');
      }

      // Fetch latest role from user profile cache if available
      let latestRole = payload.role;
      try {
        const userProfile = await redisService.getUserProfile(payload.id);
        if (userProfile?.role) {
          latestRole = userProfile.role;
        }
      } catch {}

      // Return user data combining JWT claims with latest cached session/profile info
      return {
        id: payload.id,
        role: latestRole,
        sessionMetadata: sessionMetadata,
        iat: payload.iat,
        exp: payload.exp,
      };
    }

    return payload;
  } catch {
    return null;
  }
}
