import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { createRedisAuthService } from '../redis';

export interface SessionMetadata {
  countryCode?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
  loginTime: string;
  lastActive?: string;
}

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  role: 'user' | 'admin';
  sessionMetadata?: SessionMetadata;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  id: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Global Redis service instance - will be set during server initialization
let redisService: any = null;

export function setRedisService(service: any): void {
  redisService = service;
}

export async function generateTokenPair(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  sessionMetadata?: SessionMetadata
): Promise<{ accessToken: string; refreshToken: string }> {
  // Generate access token (15 minutes)
  const accessToken = jwt.sign(payload, config.auth.secret, {
    expiresIn: '15m',
  });

  // Generate refresh token (7 days)
  const refreshTokenPayload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
    id: payload.id,
    email: payload.email,
  };
  
  const refreshToken = jwt.sign(refreshTokenPayload, config.auth.secret, {
    expiresIn: '7d',
  });

  // Store user data in Redis for fast access
  if (redisService) {
    try {
      const redisPayload = {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        avatar: payload.avatar,
        role: payload.role,
        sessionMetadata: sessionMetadata,
      };

      // Store access token data
      await redisService.storeToken(accessToken, redisPayload, 'access');
      await redisService.addTokenToUser(payload.id, accessToken);
      
      // Store refresh token data
      await redisService.storeToken(refreshToken, {
        userId: payload.id,
        createdAt: new Date().toISOString(),
      }, 'refresh');
      
      // Store mapping: access token -> refresh token
      await redisService.storeToken(`pair:${accessToken}`, refreshToken, 'access', 7 * 24 * 60 * 60); // 7 days
    } catch (error) {
      console.error('[JWT] Error storing token data in Redis:', error);
    }
  }

  return { accessToken, refreshToken };
}

export async function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  sessionMetadata?: SessionMetadata
): Promise<string> {
  const { accessToken } = await generateTokenPair(payload, sessionMetadata);
  return accessToken;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // First verify JWT signature and expiration
    const payload = jwt.verify(token, config.auth.secret) as JWTPayload;

    // Then check if token exists in Redis (for logout functionality)
    if (redisService) {
      const isValid = await redisService.isTokenValid(token, 'access');
      if (!isValid) {
        return null;
      }
    }

    return payload;
  } catch {
    return null;
  }
}

export async function revokeToken(token: string): Promise<void> {
  if (redisService) {
    const payload = await redisService.getToken(token, 'access');
    
    if (payload) {
      // Remove token from user's token set
      await redisService.removeTokenFromUser(payload.id, token);
      
      // Delete the access token
      await redisService.deleteToken(token, 'access');
    }
  }
}

/**
 * Revoke both access token and refresh token
 */
export async function revokeTokenPair(accessToken?: string | null, refreshToken?: string | null): Promise<void> {
  if (redisService) {
    // Revoke access token if provided
    if (accessToken) {
      const payload = await redisService.getToken(accessToken, 'access');
      
      if (payload) {
        // Remove token from user's token set
        await redisService.removeTokenFromUser(payload.id, accessToken);
        
        // Delete the access token
        await redisService.deleteToken(accessToken, 'access');
        
        // Find and delete corresponding refresh token
        const correspondingRefreshToken = await redisService.getToken(`pair:${accessToken}`, 'access');
        if (correspondingRefreshToken) {
          await redisService.deleteToken(correspondingRefreshToken, 'refresh');
          await redisService.deleteToken(`pair:${accessToken}`, 'access'); // Delete mapping
        }
      }
    }
    
    // Revoke refresh token if provided
    if (refreshToken) {
      await redisService.deleteToken(refreshToken, 'refresh');
    }
  }
}

export async function refreshToken(token: string): Promise<void> {
  if (redisService) {
    await redisService.refreshToken(token, 'access');
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function verifyRefreshToken(refreshToken: string): Promise<RefreshTokenPayload | null> {
  try {
    // First verify JWT signature and expiration
    const payload = jwt.verify(refreshToken, config.auth.secret) as RefreshTokenPayload;

    // Then check if refresh token exists in Redis
    if (redisService) {
      const isValid = await redisService.isTokenValid(refreshToken, 'refresh');
      if (!isValid) {
        return null; // Refresh token was revoked
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
    const payload = jwt.verify(token, config.auth.secret) as JWTPayload;

    // Then check if token exists in Redis and get cached user data
    if (redisService) {
      const cachedUser = await redisService.getToken(token, 'access');
      if (!cachedUser) {
        return null; // Token was revoked
      }

      // Extend TTL for user's tokens set when user is active

      // Update lastActive time for this session
      if (cachedUser.sessionMetadata) {
        cachedUser.sessionMetadata.lastActive = new Date().toISOString();
        await redisService.storeToken(token, cachedUser, 'access');
      }

      // Return cached user data (more up-to-date than JWT payload)
      return {
        id: cachedUser.id,
        email: cachedUser.email,
        name: cachedUser.name,
        avatar: cachedUser.avatar,
        role: cachedUser.role,
        sessionMetadata: cachedUser.sessionMetadata,
        iat: payload.iat,
        exp: payload.exp,
      };
    }

    return payload;
  } catch {
    return null;
  }
}

