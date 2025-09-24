import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { usersService } from '../services';

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/users/:id - Get user profile
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const userId = request.params.id;
        const response = await usersService.getUserProfile(userId, authRequest.user!.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
