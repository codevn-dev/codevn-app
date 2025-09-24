import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { categoryRepository } from '@/lib/database/repository';
import { logger } from '@/lib/utils/logger';
import { Category } from '@/types/shared/category';

export async function categoryRoutes(fastify: FastifyInstance) {
  // GET /api/categories - Get all categories with counts
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rootCategories = await categoryRepository.findAllWithCounts();
      const response = rootCategories.map((category: any) => {
        const { createdById, createdByName, ...categoryWithoutFlatFields } = category;
        return {
          ...categoryWithoutFlatFields,
          createdBy: {
            id: category.createdBy?.id || createdById,
            name: category.createdBy?.name || 'Unknown',
          },
          children: category.children?.map((child: any) => {
            const {
              createdById: childCreatedById,
              createdByName: childCreatedByName,
              ...childWithoutFlatFields
            } = child;
            return {
              ...childWithoutFlatFields,
              createdBy: {
                id: child.createdBy?.id || childCreatedById,
                name: child.createdBy?.name || 'Unknown',
              },
            };
          }),
        };
      }) as unknown as Category[];
      return reply.send(response);
    } catch (error) {
      logger.error('Get categories error', undefined, error as Error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}
