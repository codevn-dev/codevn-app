import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userRepository } from '@/lib/database/repository';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import { fileUpload } from '@/lib/server';

interface UpdateProfileBody {
  name: string;
  email: string;
}

export async function profileRoutes(fastify: FastifyInstance) {
  // PUT /api/profile - Update user profile
  fastify.put<{ Body: UpdateProfileBody }>(
    '/',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Body: UpdateProfileBody }>, reply: FastifyReply) => {
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
        console.error('Update profile error:', error);
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
        console.error('Upload avatar error:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
