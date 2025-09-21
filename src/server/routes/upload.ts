import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { fileUpload } from '@/lib/server';
import { authMiddleware } from '../middleware';
import { logger } from '@/lib/utils/logger';

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
          return reply.status(400).send({ error: 'File is required' });
        }

        // Upload image using utils
        const uploadResult = await fileUpload.uploadImage(data, 'images');

        return reply.send({
          success: true,
          imageUrl: uploadResult.publicPath,
          fileName: uploadResult.originalName,
          size: uploadResult.size,
          type: uploadResult.type,
        });
      } catch (error) {
        logger.error('Upload image error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
