import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { RedisAuthService } from './redis';

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Global Redis service instance - will be set during server initialization
let redisService: RedisAuthService | null = null;

export function setRedisService(service: RedisAuthService): void {
  redisService = service;
}

export async function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const token = jwt.sign(payload, config.auth.secret, {
    expiresIn: config.auth.maxAge,
  });

  // Store minimal data in Redis (only id and email)
  if (redisService) {
    try {
      const redisPayload = {
        id: payload.id,
        email: payload.email,
      };
      await redisService.storeToken(token, redisPayload);
    } catch (error) {
      console.error('[JWT] Error storing token in Redis:', error);
    }
  }

  return token;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // First verify JWT signature and expiration
    const payload = jwt.verify(token, config.auth.secret) as JWTPayload;

    // Then check if token exists in Redis (for logout functionality)
    if (redisService) {
      const isValid = await redisService.isTokenValid(token);
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
    await redisService.deleteToken(token);
  }
}

export async function refreshToken(token: string): Promise<void> {
  if (redisService) {
    await redisService.refreshToken(token);
  }
}

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}
