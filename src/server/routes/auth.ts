import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { userRepository } from '@/lib/database/repository';
import { generateToken, revokeToken, refreshToken } from '../jwt';
import { authMiddleware, AuthenticatedRequest } from '../middleware';
import fastifyPassport from '@fastify/passport';
import { config } from '@/config';
import { createRedisAuthService } from '../redis';
import { logger } from '@/lib/utils/logger';
import {
  RegisterRequest as RegisterBody,
  CheckEmailRequest as CheckEmailBody,
} from '@/types/shared/auth';
import { LoginResponse, RegisterResponse, CheckEmailResponse } from '@/types/shared/auth';
import { UserResponse } from '@/types/shared/user';
import { SuccessResponse } from '@/types/shared/common';

export async function authRoutes(fastify: FastifyInstance) {
  // Sign-in endpoint
  fastify.post(
    '/sign-in',
    {
      preHandler: fastifyPassport.authenticate('local', { session: false }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = (request as any).user;
      const token = await generateToken(user);

      reply.cookie('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain:
          process.env.NODE_ENV === 'production'
            ? process.env.COOKIE_DOMAIN || undefined
            : 'localhost',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      const response: LoginResponse = {
        message: 'Sign-in successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || undefined,
          role: user.role,
          createdAt: new Date().toISOString(),
        },
      };
      return reply.send(response);
    }
  );

  // Sign-up endpoint
  fastify.post(
    '/sign-up',
    async (request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) => {
      try {
        const body = request.body as RegisterBody;
        const { email, name, password } = body;

        if (!email || !name || !password) {
          return reply.status(400).send({ error: 'Email, name, and password are required' });
        }

        // Check if user already exists
        const existingUser = await userRepository.findByEmail(email);

        if (existingUser) {
          return reply.status(400).send({ error: 'User with this email already exists' });
        }

        // Create user
        const newUser = await userRepository.create({
          email,
          name,
          password,
          role: 'user',
        });

        // Auto-login: generate token and set cookie like sign-in
        const createdUser = newUser[0];
        const token = await generateToken(createdUser);

        reply.cookie('auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          domain:
            process.env.NODE_ENV === 'production'
              ? process.env.COOKIE_DOMAIN || undefined
              : 'localhost',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        const response: RegisterResponse = {
          message: 'Sign-up successful',
          user: {
            id: createdUser.id,
            email: createdUser.email,
            name: createdUser.name,
            avatar: createdUser.avatar || undefined,
            role: (createdUser.role as any) || 'user',
            createdAt: new Date().toISOString(),
          },
        };
        return reply.status(201).send(response);
      } catch (error) {
        logger.error('Registration error', undefined, error as Error);
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
        const { email } = body;

        if (!email) {
          return reply.status(400).send({ available: false, message: 'Email is required' });
        }

        // Check if email format is valid
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return reply.status(400).send({
            available: false,
            message: 'Invalid email format',
          });
        }

        // Check if email already exists
        const existingUser = await userRepository.findByEmail(email);

        const response: CheckEmailResponse = {
          available: !existingUser,
          message: existingUser ? 'Email already exists' : 'Email is available',
        };
        return reply.send(response);
      } catch (error) {
        logger.error('Email check error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );

  // Google OAuth login
  fastify.get(
    '/google',
    {
      preHandler: fastifyPassport.authenticate('google', { scope: ['profile', 'email'] }),
    },
    async (_request: FastifyRequest, _reply: FastifyReply) => {
      // This will redirect to Google
    }
  );

  // Google OAuth callback
  fastify.get(
    '/google/callback',
    {
      preHandler: fastifyPassport.authenticate('google', { session: false }),
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = (request as any).user;
        const token = await generateToken(user);

        // Set token in cookie
        reply.cookie('auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          domain:
            process.env.NODE_ENV === 'production'
              ? process.env.COOKIE_DOMAIN || undefined
              : 'localhost',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        // Redirect to frontend
        const appUrl = config.api.clientUrl;
        return reply.redirect(appUrl);
      } catch (error) {
        console.error('[AUTH] Google OAuth callback error:', error);
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

      if (token) {
        // Revoke token from Redis
        await revokeToken(token);
      }

      reply.clearCookie('auth-token');
      const response: SuccessResponse & { message: string } = {
        success: true,
        message: 'Sign-out successful',
      };
      return reply.send(response);
    } catch (error) {
      logger.error('Sign-out error', undefined, error as Error);
      // Still clear cookie even if Redis operation fails
      reply.clearCookie('auth-token');
      const response: SuccessResponse & { message: string } = {
        success: true,
        message: 'Sign-out successful',
      };
      return reply.send(response);
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

        // Get fresh user data from database
        const user = await userRepository.findById(authRequest.user!.id);
        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        const response: UserResponse = {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar || undefined,
            role: user.role,
            createdAt: user.createdAt as any,
          },
        };
        return reply.send(response);
      } catch (error) {
        logger.error('Get user error', undefined, error as Error);
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
        const redisService = createRedisAuthService();

        // Logout from all devices
        await redisService.logoutAllDevices(authRequest.user!.id);

        // Clear current session cookie
        reply.clearCookie('auth-token');

        const response: SuccessResponse & { message: string } = {
          success: true,
          message: 'Logged out from all devices successfully',
        };
        return reply.send(response);
      } catch (error) {
        logger.error('Logout all devices error', undefined, error as Error);
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

        if (token) {
          await refreshToken(token);
        }

        const response: SuccessResponse & { message: string } = {
          success: true,
          message: 'Token refreshed successfully',
        };
        return reply.send(response);
      } catch (error) {
        logger.error('Refresh token error', undefined, error as Error);
        return reply.status(500).send({ error: 'Internal server error' });
      }
    }
  );
}
