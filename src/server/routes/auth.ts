import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import fastifyPassport from '@fastify/passport';
import { config } from '@/config';
import { AuthError, CommonError } from '@/types/shared';
import { authService } from '../services';
import { ok, fail } from '../utils/response';
import {
  RegisterRequest as RegisterBody,
  CheckEmailRequest as CheckEmailBody,
} from '@/types/shared/auth';
import { ACCESS_TOKEN, REFRESH_TOKEN } from '@/types/shared/tokens';

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
        const response = await authService.signIn(user, reply, request);
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );

  // Sign-up endpoint
  fastify.post(
    '/sign-up',
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      try {
        const body = request.body as RegisterBody;
        const response = await authService.signUp(body, reply, request);
        return reply.status(201).send(ok(response));
      } catch (e: any) {
        if (e?.code === AuthError.EMAIL_EXISTS) {
          return reply.status(400).send(fail(AuthError.EMAIL_EXISTS));
        }
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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

        await authService.handleGoogleOAuth(user, reply, storedReturnUrl, request);
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );

  // Sign-out endpoint (POST)
  fastify.post('/sign-out', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get access token from cookie or header
      const accessToken =
        request.cookies[ACCESS_TOKEN] ||
        (request.headers.authorization?.startsWith('Bearer ')
          ? request.headers.authorization.substring(7)
          : null);

      // Get refresh token from cookie
      const refreshToken = request.cookies[REFRESH_TOKEN];

      const response = await authService.signOut(reply, accessToken, refreshToken);
      return reply.send(ok(response));
    } catch {
      return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
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
        return reply.send(ok(response));
      } catch {
        return reply.status(500).send(fail(CommonError.INTERNAL_ERROR));
      }
    }
  );

  // Refresh token (from cookie)
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const refreshToken = request.cookies[REFRESH_TOKEN];

      if (!refreshToken) {
        return reply.status(400).send(fail(AuthError.INVALID_REFRESH_TOKEN));
      }

      const response = await authService.refreshAccessToken(refreshToken);
      // Set new cookies if service returns new pair
      if ((response as any)?.accessToken && (response as any)?.refreshToken) {
        (authService as any).setAuthCookies?.(
          reply,
          (response as any).accessToken,
          (response as any).refreshToken
        );
      }
      return reply.send(ok(response));
    } catch (error) {
      console.error('Refresh token error:', error);
      return reply.status(401).send(fail(AuthError.INVALID_REFRESH_TOKEN));
    }
  });
}
