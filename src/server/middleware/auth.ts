import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, extractTokenFromHeader } from '../jwt';

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar?: string;
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

    const payload = verifyToken(token);
    if (!payload) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    // Attach user info to request
    (request as AuthenticatedRequest).user = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      avatar: payload.avatar,
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
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
      const payload = verifyToken(token);
      if (payload) {
        // Attach user info to request if token is valid
        (request as AuthenticatedRequest).user = {
          id: payload.id,
          email: payload.email,
          name: payload.name,
          role: payload.role,
          avatar: payload.avatar,
        };
      }
    }
    // If no token or invalid token, continue without user info
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without user info
  }
}
