import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { profileService } from '../services';
import { CommonError } from '@/types/shared';
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
      } catch (e: any) {
        const message = e?.message || '';
        const isNotFound = message.toLowerCase().includes('not found');
        return reply
          .status(isNotFound ? 404 : 500)
          .send({ error: isNotFound ? CommonError.NOT_FOUND : CommonError.INTERNAL_ERROR });
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
        if (!data) {
          return reply.status(400).send({ error: 'No file provided', code: 'BAD_REQUEST' });
        }
        const response = await profileService.uploadAvatar(authRequest.user!.id, data);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: CommonError.INTERNAL_ERROR });
      }
    }
  );
}
