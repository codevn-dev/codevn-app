import { FastifyInstance } from 'fastify';
import { authRoutes } from './routes/auth';
import { articleRoutes } from './routes/articles';
import { categoryRoutes } from './routes/categories';
import { commentRoutes } from './routes/comments';
import { chatRoutes } from './routes/chat';
import { profileRoutes } from './routes/profile';
import { uploadRoutes } from './routes/upload';
import { userRoutes } from './routes/users';
import { adminRoutes } from './routes/admin';

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
