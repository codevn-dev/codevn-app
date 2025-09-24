import { FastifyInstance } from 'fastify';
import { authRoutes } from './auth';
import { articleRoutes } from './articles';
import { categoryRoutes } from './categories';
import { commentRoutes } from './comments';
import { chatRoutes } from './chat';
import { profileRoutes } from './profile';
import { uploadRoutes } from './upload';
import { userRoutes } from './users';
import { adminRoutes } from './admin';

export async function setupRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/api/health', async (_request, _reply) => {
    return { ok: true, timestamp: new Date().toISOString() };
  });

  // Register all route modules
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(articleRoutes, { prefix: '/api/articles' });
  await fastify.register(categoryRoutes, { prefix: '/api/categories' });
  await fastify.register(commentRoutes, { prefix: '/api/comments' });
  await fastify.register(chatRoutes, { prefix: '/api/chat' });
  await fastify.register(profileRoutes, { prefix: '/api/profile' });
  await fastify.register(uploadRoutes, { prefix: '/api/upload' });
  await fastify.register(userRoutes, { prefix: '/api/users' });
  await fastify.register(adminRoutes, { prefix: '/api/admin' });
}
