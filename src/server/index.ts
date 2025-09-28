import 'dotenv/config';
import Fastify from 'fastify';
import { config } from '@/config';
import { setupPassport } from './middleware/passport';
import { setupRoutes } from './routes';
import { setupPlugins } from './plugins';
import { createRedisAuthService } from './redis';
import { setRedisService } from './middleware/jwt';
import { CountryService } from './services/country';
import { startWorkerService, stopWorkerService } from './worker';
import { logger } from '@/lib/utils/logger';

async function buildServer() {
  const fastify = Fastify({
    disableRequestLogging: true,
    logger: {
      level: config.logging.level,
      ...(process.env.NODE_ENV !== 'production'
        ? {
            transport: {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname,reqId',
              },
            },
          }
        : {}),
    },
  });

  // Setup plugins
  await setupPlugins(fastify);

  // Initialize Redis service for authentication
  const redisService = createRedisAuthService();
  setRedisService(redisService);

  // Preload country cache
  try {
    await CountryService.preloadCache();
    logger.info('Country cache preloaded successfully');
  } catch (error) {
    logger.warn('Failed to preload country cache', { error });
  }

  // Start worker service
  try {
    logger.info('🔄 Starting worker service...');
    await startWorkerService();
    logger.info('✅ Worker service started successfully');
  } catch (error) {
    logger.error('❌ Failed to start worker service', undefined, error as Error);
    throw error; // Re-throw to see the error
  }

  // Setup passport authentication
  await setupPassport(fastify);

  // Setup routes
  await setupRoutes(fastify);

  // Unified request logging (method, url, ip, status). No reqId.
  fastify.addHook('onResponse', (request, reply, done) => {
    try {
      fastify.log.info({
        method: request.method,
        url: request.url,
        ip: request.ip,
        statusCode: reply.statusCode,
      });
    } catch {
      // no-op
    }
    done();
  });

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

      // Stop worker service
      try {
        await stopWorkerService();
        logger.info('Worker service stopped');
      } catch (error) {
        logger.error('Error stopping worker service', undefined, error as Error);
      }

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
