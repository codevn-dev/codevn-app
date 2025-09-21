import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userRepository } from '@/lib/database/repository';
import { maskUserEmail, isAdmin } from '@/lib/utils';
import { authMiddleware, AuthenticatedRequest } from '../middleware';

export async function userRoutes(fastify: FastifyInstance) {
  // GET /api/users/:id - Get user profile
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const userId = request.params.id;

        if (!userId) {
          return reply.status(400).send({ error: 'User ID is required' });
        }

        const user = await userRepository.findById(userId);

        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        // Return user data without sensitive information
        const userProfile = {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          createdAt: user.createdAt,
        };

        // Mask email for privacy unless user is admin or viewing own profile
        const isOwnProfile = authRequest.user!.id === userId;
        const finalUserProfile =
          isAdmin(authRequest.user!.role) || isOwnProfile
            ? userProfile
            : maskUserEmail(userProfile);

        return reply.send({ user: finalUserProfile });
      } catch (error) {
        console.error('Get user error:', error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
