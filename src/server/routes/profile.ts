import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userRepository } from '@/lib/database/repository';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { fileUpload } from '@/lib/server';
import { logger } from '@/lib/utils/logger';
import { UpdateProfileRequest, UserResponse } from '@/types/shared/user';
import { UploadAvatarResponse } from '@/types/shared';

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

        // Get user statistics
        const statistics = await userRepository.getUserStatistics(authRequest.user!.id);

        const response: UserResponse = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: (user.avatar || undefined) as any,
            role: user.role,
            createdAt: user.createdAt as any,
            statistics,
          },
        };
        return reply.send(response);
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
        const response: UserResponse = { user: updatedUser[0] as any };
        return reply.send(response);
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

        const response: UploadAvatarResponse = {
          success: true,
          avatar: uploadResult.publicPath,
          user: updatedUser[0] as any,
        };
        return reply.send(response);
      } catch (error) {
        logger.error('Upload avatar error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
