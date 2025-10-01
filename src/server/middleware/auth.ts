import { FastifyRequest, FastifyReply } from 'fastify';
import { extractTokenFromHeader, getUserFromToken } from './jwt';
import { logger } from '@/lib/utils/logger';
import { UserRole } from '@/types/shared/roles';
import { ACCESS_TOKEN } from '@/types/shared/tokens';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    role: UserRole;
  };
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.authorization;
    let token = extractTokenFromHeader(authHeader);

    // If no token in header, try to get from cookie
    if (!token) {
      token = request.cookies[ACCESS_TOKEN] || null;
    }

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Use Redis-verified token validation with cached user data
    const user = await getUserFromToken(token);

    if (!user) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    // Attach user info to request (from Redis cache)
    (request as AuthenticatedRequest).user = {
      id: user.id,
      role: user.role,
    };
  } catch (error) {
    logger.error('Auth middleware error', undefined, error as Error);
    return reply.status(401).send({ error: 'Unauthorized' });
  }
}

export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.authorization;
    let token = extractTokenFromHeader(authHeader);

    // If no token in header, try to get from cookie
    if (!token) {
      token = request.cookies[ACCESS_TOKEN] || null;
    }

    if (token) {
      // Use Redis-verified token validation with cached user data
      const user = await getUserFromToken(token);
      if (user) {
        // Attach user info to request if token is valid
        (request as AuthenticatedRequest).user = {
          id: user.id,
          role: user.role,
        };
      }
    }
    // If no token or invalid token, continue without user info
  } catch (error) {
    logger.error('Optional auth middleware error', undefined, error as Error);
    // Continue without user info
  }
}
