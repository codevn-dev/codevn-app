import 'dotenv/config';
import Fastify from 'fastify';
import { config } from '@/config';
import { setupPassport } from './passport';
import { setupRoutes } from './routes';
import { setupPlugins } from './plugins';
import { createRedisAuthService } from './redis';
import { setRedisService } from './jwt';
import { logger } from '@/lib/utils/logger';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
    },
  });

  // Setup plugins
  await setupPlugins(fastify);

  // Initialize Redis service for authentication
  console.log('[SERVER] Initializing Redis service...');
  const redisService = createRedisAuthService();
  setRedisService(redisService);
  console.log('[SERVER] Redis service initialized and set');

  // Setup passport authentication
  await setupPassport(fastify);

  // Setup routes
  await setupRoutes(fastify);

  return fastify;
}

async function start() {
  try {
    const fastify = await buildServer();

    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    logger.info(`🚀 Fastify server running on http://${host}:${port}`);

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down server...');
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    logger.error('Server startup error', undefined, err as Error);
    process.exit(1);
  }
}

start();
