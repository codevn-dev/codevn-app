import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { usersService } from '../services';

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/users/leaderboard - Get leaderboard data
  fastify.get<{ Querystring: { timeframe?: '7d' | '30d' | '90d' | '1y' | 'all'; limit?: string } }>(
    '/leaderboard',
    async (
      request: FastifyRequest<{
        Querystring: { timeframe?: '7d' | '30d' | '90d' | '1y' | 'all'; limit?: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { timeframe = '7d', limit = '10' } = request.query;
        const limitNum = parseInt(limit, 10);

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
          return reply.status(400).send({ error: 'Invalid limit parameter' });
        }

        if (!['7d', '30d', '90d', '1y', 'all'].includes(timeframe)) {
          return reply.status(400).send({ error: 'Invalid timeframe parameter' });
        }

        const response = await usersService.getLeaderboard(
          timeframe as '7d' | '30d' | '90d' | '1y' | 'all',
          limitNum
        );
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

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
