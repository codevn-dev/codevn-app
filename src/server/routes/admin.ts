import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { adminService } from '../services';
import { CreateCategoryRequest, UpdateCategoryRequest } from '@/types/shared/category';
import { UpdateUserRoleRequest } from '@/types/shared/user';

export async function adminRoutes(fastify: FastifyInstance) {
  // Admin users routes
  await fastify.register(async function (fastify) {
    // GET /api/admin/users - Get all users with pagination
    fastify.get(
      '/users',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          const query = request.query as any;
          const response = await adminService.getUsers(authRequest.user!.id, query);
          return reply.send(response);
        } catch {
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );

    // PUT /api/admin/users - Update user role
    fastify.put<{ Body: UpdateUserRoleRequest }>(
      '/users',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest<{ Body: UpdateUserRoleRequest }>, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          const body = request.body as UpdateUserRoleRequest;
          const response = await adminService.updateUserRole(authRequest.user!.id, body);
          return reply.send(response);
        } catch {
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );
  });

  // Admin categories routes
  await fastify.register(async function (fastify) {
    // GET /api/admin/categories - Get all categories for admin
    fastify.get(
      '/categories',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          const response = await adminService.getCategories(authRequest.user!.id);
          return reply.send(response);
        } catch {
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );

    // POST /api/admin/categories - Create category
    fastify.post<{ Body: CreateCategoryRequest }>(
      '/categories',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest<{ Body: CreateCategoryRequest }>, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          const body = request.body as CreateCategoryRequest;
          const response = await adminService.createCategory(authRequest.user!.id, body);
          return reply.status(201).send(response);
        } catch {
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );

    // PUT /api/admin/categories - Update category
    fastify.put<{ Body: UpdateCategoryRequest }>(
      '/categories',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest<{ Body: UpdateCategoryRequest }>, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          const body = request.body as UpdateCategoryRequest;
          const response = await adminService.updateCategory(authRequest.user!.id, body);
          return reply.send(response);
        } catch {
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );

    // DELETE /api/admin/categories - Delete category
    fastify.delete(
      '/categories',
      {
        preHandler: authMiddleware,
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const authRequest = request as AuthenticatedRequest;
          const query = request.query as any;
          const categoryId = query.id;
          const response = await adminService.deleteCategory(authRequest.user!.id, categoryId);
          return reply.send(response);
        } catch {
          return reply.status(500).send({ error: 'Internal server error' });
        }
      }
    );
  });
}
