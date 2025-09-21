import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userRepository } from '@/lib/database/repository';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { fileUpload } from '@/lib/server';
import { logger } from '@/lib/utils/logger';
import { UpdateProfileRequest } from '@/types/shared/user';

// Use shared type directly

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

        // Get fresh user data from database
        const user = await userRepository.findById(authRequest.user!.id);
        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        return reply.send({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.createdAt,
        });
      } catch (error) {
        logger.error('Get profile error', undefined, error as Error);
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
        const { name, email } = request.body;

        if (!name || !email) {
          return reply.status(400).send({ error: 'Name and email are required' });
        }

        // Check if email is already taken by another user
        const existingUser = await userRepository.findByEmail(email);

        if (existingUser && existingUser.id !== authRequest.user!.id) {
          return reply.status(400).send({ error: 'Email is already taken' });
        }

        const updatedUser = await userRepository.update(authRequest.user!.id, {
          name,
          email,
        });

        return reply.send(updatedUser[0]);
      } catch (error) {
        logger.error('Update profile error', undefined, error as Error);
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

        if (!data) {
          return reply.status(400).send({ error: 'File is required' });
        }

        // Upload avatar using utils
        const uploadResult = await fileUpload.uploadImage(data, 'avatars');

        // Update user's avatar in database
        const updatedUser = await userRepository.update(authRequest.user!.id, {
          avatar: uploadResult.publicPath,
        });

        return reply.send({
          success: true,
          avatar: uploadResult.publicPath,
          user: updatedUser[0],
        });
      } catch (error) {
        logger.error('Upload avatar error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
