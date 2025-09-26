import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { authService } from '../services/auth';
import { AuthError, CommonError } from '@/types/shared/errors';

export async function sessionRoutes(fastify: FastifyInstance) {
  // GET /api/session - Get user's active sessions
  fastify.get(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        // Get token from cookie or header
        const token =
          authRequest.cookies['auth-token'] ||
          authRequest.headers.authorization?.replace('Bearer ', '') ||
          undefined;

        const sessions = await authService.getUserActiveSessions(authRequest.user!.id, token);

        return reply.send({
          success: true,
          sessions,
        });
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );

  // POST /api/session/terminate - Terminate session(s)
  fastify.post(
    '/terminate',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const { tokens } = request.body as { tokens: string[] };

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
          return reply.status(400).send({ error: AuthError.TOKENS_REQUIRED });
        }

        const result = await authService.terminateSessions(authRequest.user!.id, tokens);

        return reply.send({
          success: true,
          message: result.message,
        });
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );
}
