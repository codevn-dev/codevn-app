import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { categoriesService, adminService } from '../services';
import { CommonError, CategoryError } from '@/types/shared';
import { CreateCategoryRequest, UpdateCategoryRequest } from '@/types/shared/category';

export async function categoryRoutes(fastify: FastifyInstance) {
  // GET /api/categories - Get all categories with counts (public)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const response = await categoriesService.getCategories();
      return reply.send(response);
    } catch {
      return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
    }
  });

  // POST /api/categories - Create category (admin only)
  fastify.post<{ Body: CreateCategoryRequest }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: CreateCategoryRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const body = request.body as CreateCategoryRequest;
        const response = await adminService.createCategory(authRequest.user!, body);
        return reply.status(201).send(response);
      } catch {
        return reply.status(400).send({ error: CommonError.BAD_REQUEST });
      }
    }
  );

  // PUT /api/categories - Update category (admin only)
  fastify.put<{ Body: UpdateCategoryRequest }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: UpdateCategoryRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const body = request.body as UpdateCategoryRequest;
        const response = await adminService.updateCategory(authRequest.user!, body);
        return reply.send(response);
      } catch (err: any) {
        const message = err?.message || 'Unable to update category. Please try again.';
        return reply.status(400).send({ error: message });
      }
    }
  );

  // DELETE /api/categories - Delete category (admin only)
  fastify.delete(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const query = request.query as any;
        const categoryId = query.id;
        const response = await adminService.deleteCategory(authRequest.user!, categoryId);
        return reply.send(response);
      } catch (err: any) {
        const message = err?.message || '';
        const isFk =
          message.includes('violates foreign key') || message === 'CATEGORY_DELETE_CONFLICT';
        const status = isFk ? 409 : 400;
        return reply
          .status(status)
          .send({ error: isFk ? CategoryError.DELETE_CONFLICT : CommonError.BAD_REQUEST });
      }
    }
  );
}
