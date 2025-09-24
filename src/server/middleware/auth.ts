import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, extractTokenFromHeader } from './jwt';
import { logger } from '@/lib/utils/logger';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
  };
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.authorization;
    let token = extractTokenFromHeader(authHeader);

    // If no token in header, try to get from cookie
    if (!token) {
      token = request.cookies['auth-token'] || null;
    }

    if (!token) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    // Use Redis-verified token validation
    const payload = await verifyToken(token);
    if (!payload) {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }

    // Attach minimal user info to request (id, email, and role from JWT)
    (request as AuthenticatedRequest).user = {
      id: payload.id,
      email: payload.email,
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
      token = request.cookies['auth-token'] || null;
    }

    if (token) {
      // Use Redis-verified token validation
      const payload = await verifyToken(token);
      if (payload) {
        // Attach minimal user info to request if token is valid
        (request as AuthenticatedRequest).user = {
          id: payload.id,
          email: payload.email,
        };
      }
    }
    // If no token or invalid token, continue without user info
  } catch (error) {
    logger.error('Optional auth middleware error', undefined, error as Error);
    // Continue without user info
  }
}
