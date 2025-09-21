import { FastifyInstance } from 'fastify';
import { config } from '@/config';

export async function setupPlugins(fastify: FastifyInstance) {
  // CORS
  await fastify.register(require('@fastify/cors'), {
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  });

  // Cookie support
  await fastify.register(require('@fastify/cookie'), {
    secret: config.auth.secret,
  });

  // Session support (required for @fastify/passport)
  await fastify.register(require('@fastify/session'), {
    secret: config.auth.secret,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  // Multipart support for file uploads
  await fastify.register(require('@fastify/multipart'), {
    limits: {
      fileSize: config.upload.maxFileSize,
    },
  });

  // Static file serving
  await fastify.register(require('@fastify/static'), {
    root: process.cwd() + '/public',
    prefix: '/public/',
  });

  // WebSocket support
  await fastify.register(require('@fastify/websocket'));

  // Security headers
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: false, // Disable for development
  });

  // Rate limiting - DISABLED for development
  // await fastify.register(require('@fastify/rate-limit'), {
  //   max: config.rateLimit.maxRequests,
  //   timeWindow: config.rateLimit.windowMs,
  // });
}
