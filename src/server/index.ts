import 'dotenv/config';
import Fastify from 'fastify';
import { config } from '@/config';
import { setupPassport } from './passport';
import { setupRoutes } from './routes';
import { setupPlugins } from './plugins';

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: config.logging.level,
    },
  });

  // Setup plugins
  await setupPlugins(fastify);

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
    console.log(`🚀 Fastify server running on http://${host}:${port}`);

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down server...');
      await fastify.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
