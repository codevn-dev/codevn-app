import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { systemUsersService } from '../services';
import { CommonError } from '@/types/shared/errors';
import { CreateSystemUserRequest, UpdateSystemUserRequest } from '@/types/shared/auth';
import { isAdmin } from '@/lib/utils';

export async function systemUserRoutes(fastify: FastifyInstance) {
  // GET /api/system-users - Get all system users
  fastify.get(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;

        // Only admins can access system users
        if (!isAdmin(authRequest.user!.role)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const response = await systemUsersService.getSystemUsers();
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );

  // GET /api/system-users/chat - Get system users for chat (public for all users)
  fastify.get(
    '/chat',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const response = await systemUsersService.getSystemUsers();
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );

  // POST /api/system-users - Create a new system user
  fastify.post<{ Body: CreateSystemUserRequest }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: CreateSystemUserRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;

        // Only admins can create system users
        if (!isAdmin(authRequest.user!.role)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const body = request.body as CreateSystemUserRequest;
        const response = await systemUsersService.createSystemUser(body);
        return reply.status(201).send(response);
      } catch (e: any) {
        const message = e?.message || '';
        const isBad =
          message.toLowerCase().includes('invalid') || message.toLowerCase().includes('required');
        return reply
          .status(isBad ? 400 : 500)
          .send({ error: isBad ? CommonError.BAD_REQUEST : CommonError.INTERNAL_ERROR });
      }
    }
  );

  // POST /api/system-users/:id/send-message - Enqueue system message to users
  fastify.post<{
    Params: { id: string };
    Body: { toUserIds?: string[]; text: string; isSendAll?: boolean };
  }>(
    '/:id/send-message',
    {
      preHandler: authMiddleware,
    },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { toUserIds?: string[]; text: string; isSendAll?: boolean };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const authRequest = request as AuthenticatedRequest;

        // Only admins can send via system users
        if (!isAdmin(authRequest.user!.role)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const systemUserId = request.params.id;
        const { toUserIds, text, isSendAll } = request.body || {};

        // Use service to send message
        const result = await systemUsersService.sendMessage({
          systemUserId,
          toUserIds,
          text,
          isSendAll,
        });

        return reply.send(result);
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );

  // PUT /api/system-users/:id - Update a system user
  fastify.put<{ Params: { id: string }; Body: UpdateSystemUserRequest }>(
    '/:id',
    {
      preHandler: authMiddleware,
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateSystemUserRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const authRequest = request as AuthenticatedRequest;

        // Only admins can update system users
        if (!isAdmin(authRequest.user!.role)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const userId = request.params.id;
        const body = request.body as UpdateSystemUserRequest;
        const response = await systemUsersService.updateSystemUser(userId, body);
        return reply.send(response);
      } catch (e: any) {
        const message = e?.message || '';
        const isNotFound = message.toLowerCase().includes('not found');
        const isBad =
          message.toLowerCase().includes('invalid') || message.toLowerCase().includes('required');
        return reply.status(isNotFound ? 404 : isBad ? 400 : 500).send({
          error: isNotFound
            ? CommonError.NOT_FOUND
            : isBad
              ? CommonError.BAD_REQUEST
              : CommonError.INTERNAL_ERROR,
        });
      }
    }
  );

  // DELETE /api/system-users/:id - Delete a system user
  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;

        // Only admins can delete system users
        if (!isAdmin(authRequest.user!.role)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const userId = request.params.id;
        const response = await systemUsersService.deleteSystemUser(userId);
        return reply.send(response);
      } catch (e: any) {
        const message = e?.message || '';
        const isNotFound = message.toLowerCase().includes('not found');
        const isBad =
          message.toLowerCase().includes('invalid') || message.toLowerCase().includes('required');
        return reply.status(isNotFound ? 404 : isBad ? 400 : 500).send({
          error: isNotFound
            ? CommonError.NOT_FOUND
            : isBad
              ? CommonError.BAD_REQUEST
              : CommonError.INTERNAL_ERROR,
        });
      }
    }
  );

  // POST /api/system-users/:id/avatar - Upload avatar for a system user
  fastify.post<{ Params: { id: string } }>(
    '/:id/avatar',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;

        // Only admins can upload avatars for system users
        if (!isAdmin(authRequest.user!.role)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        const userId = request.params.id;
        const data = await (request as any).file();
        if (!data) {
          return reply.status(400).send({ error: 'No file provided', code: 'BAD_REQUEST' });
        }

        const response = await systemUsersService.uploadSystemUserAvatar(userId, data);
        return reply.send(response);
      } catch (e: any) {
        const message = e?.message || '';
        const isNotFound = message.toLowerCase().includes('not found');
        const isBad =
          message.toLowerCase().includes('invalid') || message.toLowerCase().includes('required');
        return reply.status(isNotFound ? 404 : isBad ? 400 : 500).send({
          error: isNotFound
            ? CommonError.NOT_FOUND
            : isBad
              ? CommonError.BAD_REQUEST
              : CommonError.INTERNAL_ERROR,
        });
      }
    }
  );
}
