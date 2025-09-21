import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { categoryRepository } from '@/lib/database/repository';
import { logger } from '@/lib/utils/logger';

export async function categoryRoutes(fastify: FastifyInstance) {
  // GET /api/categories - Get all categories with counts
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rootCategories = await categoryRepository.findAllWithCounts();
      return reply.send(rootCategories);
    } catch (error) {
      logger.error('Get categories error', undefined, error as Error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
