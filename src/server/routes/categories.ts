import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { categoryRepository } from '@/lib/database/repository';
import { logger } from '@/lib/utils/logger';
import { Category } from '@/types/shared/category';

export async function categoryRoutes(fastify: FastifyInstance) {
  // GET /api/categories - Get all categories with counts
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rootCategories = await categoryRepository.findAllWithCounts();
      const response = rootCategories as unknown as Category[];
      return reply.send(response);
    } catch (error) {
      logger.error('Get categories error', undefined, error as Error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
