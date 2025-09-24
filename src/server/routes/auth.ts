import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import fastifyPassport from '@fastify/passport';
import { config } from '@/config';
import { authService } from '../services';
import {
  RegisterRequest as RegisterBody,
  CheckEmailRequest as CheckEmailBody,
} from '@/types/shared/auth';

export async function authRoutes(fastify: FastifyInstance) {
  // Sign-in endpoint
  fastify.post(
    '/sign-in',
    {
      preHandler: fastifyPassport.authenticate('local', { session: false }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const response = await authService.signIn(user, reply);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Sign-up endpoint
  fastify.post(
    '/sign-up',
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      try {
        const body = request.body as RegisterBody;
        const response = await authService.signUp(body, reply);
        return reply.status(201).send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Check email availability
  fastify.post(
    '/check-email',
    async (request: FastifyRequest<{ Body: CheckEmailBody }>, reply: FastifyReply) => {
      try {
        const body = request.body as CheckEmailBody;
        const response = await authService.checkEmail(body);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Google OAuth login
  fastify.get('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    // Capture desired return URL (same-origin only)
    const returnUrl = (request.query as any)?.returnUrl as string | undefined;
    try {
      if (returnUrl && typeof returnUrl === 'string') {
        const url = new URL(returnUrl);
        const appUrl = new URL(config.api.clientUrl);
        if (url.origin === appUrl.origin) {
          reply.setCookie('oauth_return_url', returnUrl, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 10 * 60, // 10 minutes
          });
        }
      }
    } catch {}

    return (fastifyPassport.authenticate('google', { scope: ['profile', 'email'] }) as any)(
      request as any,
      reply as any
    );
  });

  // Google OAuth callback
  fastify.get(
    '/google/callback',
    {
      preHandler: fastifyPassport.authenticate('google', { session: false }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const storedReturnUrl = request.cookies?.['oauth_return_url'];

        if (storedReturnUrl) {
          reply.clearCookie('oauth_return_url');
        }

        await authService.handleGoogleOAuth(user, reply, storedReturnUrl);
      } catch {
        return reply.status(500).send({ error: 'Authentication failed' });
      }
    }
  );

  // Sign-out endpoint (POST)
  fastify.post('/sign-out', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get token from cookie or header
      const token =
        request.cookies['auth-token'] ||
        (request.headers.authorization?.startsWith('Bearer ')
          ? request.headers.authorization.substring(7)
          : null);

      const response = await authService.signOut(token, reply);
      return reply.send(response);
    } catch {
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get current user
  fastify.get(
    '/me',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const response = await authService.getCurrentUser(authRequest.user!.id);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Logout from all devices (Redis-powered)
  fastify.post(
    '/logout-all-devices',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const authRequest = request as AuthenticatedRequest;
        const response = await authService.logoutAllDevices(authRequest.user!.id, reply);
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Refresh token (extend TTL in Redis)
  fastify.post(
    '/refresh-token',
    {
      preHandler: authMiddleware,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const token =
          request.cookies['auth-token'] ||
          (request.headers.authorization?.startsWith('Bearer ')
            ? request.headers.authorization.substring(7)
            : null);

        const response = await authService.refreshUserToken(token || '');
        return reply.send(response);
      } catch {
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
