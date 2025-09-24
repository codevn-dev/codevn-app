import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { categoriesService } from '../services';

export async function categoryRoutes(fastify: FastifyInstance) {
  // GET /api/categories - Get all categories with counts
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const response = await categoriesService.getCategories();
      return reply.send(response);
    } catch {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
