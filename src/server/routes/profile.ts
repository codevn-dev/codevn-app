import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { profileService } from '../services';
import { UpdateProfileRequest } from '@/types/shared/user';

export async function profileRoutes(fastify: FastifyInstance) {
  // GET /api/profile - Get current user profile
  fastify.get(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const response = await profileService.getProfile(authRequest.user!.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // PUT /api/profile - Update user profile
  fastify.put<{ Body: UpdateProfileRequest }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: UpdateProfileRequest }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const body = request.body as UpdateProfileRequest;
        const response = await profileService.updateProfile(authRequest.user!.id, body);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // POST /api/profile/avatar - Upload profile avatar
  fastify.post(
    '/avatar',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const data = await (request as any).file();
        const response = await profileService.uploadAvatar(authRequest.user!.id, data);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
