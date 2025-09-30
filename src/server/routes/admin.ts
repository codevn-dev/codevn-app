import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { adminService } from '../services';
import { CommonError } from '@/types/shared';
import { ok, fail } from '../utils/response';
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
          const response = await adminService.getUsers(authRequest.user!, query);
          return reply.send(ok(response));
        } catch {
          return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
          const response = await adminService.updateUserRole(authRequest.user!, body);
          return reply.send(ok(response));
        } catch {
          return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
        }
      }
    );
  });
}
