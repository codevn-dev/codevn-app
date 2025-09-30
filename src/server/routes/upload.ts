import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware } from '../middleware';
import { uploadService } from '../services';
import { CommonError } from '@/types/shared';
import { ok, fail } from '../utils/response';

export async function uploadRoutes(fastify: FastifyInstance) {
  // POST /api/upload/image - Upload image
  fastify.post(
    '/image',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await (request as any).file();
        if (!data) {
          return reply.status(400).send(fail(CommonError.BAD_REQUEST));
        }
        const response = await uploadService.uploadImage(data);
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );
}
