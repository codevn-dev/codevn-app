import { FastifyReply } from 'fastify';
import { userRepository } from '../database/repository';
import { generateToken, revokeToken, refreshToken } from '../middleware/jwt';
import { createRedisAuthService } from '../redis';
import { config } from '@/config';
import { BaseService } from './base';
import {
  RegisterRequest as RegisterBody,
  CheckEmailRequest as CheckEmailBody,
} from '@/types/shared/auth';
import { LoginResponse, RegisterResponse, CheckEmailResponse } from '@/types/shared/auth';
import { UserResponse } from '@/types/shared/user';
import { SuccessResponse } from '@/types/shared/common';

export class AuthService extends BaseService {
  /**
   * Set authentication cookie
   */
  private setAuthCookie(reply: FastifyReply, token: string): void {
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
  }

  /**
   * Clear authentication cookie
   */
  private clearAuthCookie(reply: FastifyReply): void {
    reply.clearCookie('auth-token');
  }

  /**
   * Sign in user with local authentication
   */
  async signIn(user: any, reply: FastifyReply): Promise<LoginResponse> {
    try {
      const token = await generateToken(user);
      this.setAuthCookie(reply, token);

      return {
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
    } catch (error) {
      this.handleError(error, 'Sign-in');
    }
  }

  /**
   * Sign up new user
   */
  async signUp(body: RegisterBody, reply: FastifyReply): Promise<RegisterResponse> {
    try {
      const { email, name, password } = body;

      this.validateRequiredFields(body, ['email', 'name', 'password']);

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        throw new Error('User with this email already exists');
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
      this.setAuthCookie(reply, token);

      return {
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
    } catch (error) {
      this.handleError(error, 'Sign-up');
    }
  }

  /**
   * Check email availability
   */
  async checkEmail(body: CheckEmailBody): Promise<CheckEmailResponse> {
    try {
      const { email } = body;

      if (!email) {
        return { available: false, message: 'Email is required' };
      }

      // Check if email format is valid
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          available: false,
          message: 'Invalid email format',
        };
      }

      // Check if email already exists
      const existingUser = await userRepository.findByEmail(email);

      return {
        available: !existingUser,
        message: existingUser ? 'Email already exists' : 'Email is available',
      };
    } catch (error) {
      this.handleError(error, 'Email check');
    }
  }

  /**
   * Handle Google OAuth login
   */
  async handleGoogleOAuth(user: any, reply: FastifyReply, returnUrl?: string): Promise<void> {
    try {
      const token = await generateToken(user);
      this.setAuthCookie(reply, token);

      // Redirect back to original page if provided and safe
      if (returnUrl) {
        try {
          const url = new URL(returnUrl);
          const appUrl = new URL(config.api.clientUrl);
          if (url.origin === appUrl.origin) {
            reply.redirect(returnUrl);
            return;
          }
        } catch {}
      }

      // Fallback to app root
      reply.redirect(config.api.clientUrl);
    } catch (error) {
      this.handleError(error, 'Google OAuth');
    }
  }

  /**
   * Sign out user
   */
  async signOut(
    token: string | null,
    reply: FastifyReply
  ): Promise<SuccessResponse & { message: string }> {
    try {
      if (token) {
        // Revoke token from Redis
        await revokeToken(token);
      }

      this.clearAuthCookie(reply);
      return {
        success: true,
        message: 'Sign-out successful',
      };
    } catch {
      // Still clear cookie even if Redis operation fails
      this.clearAuthCookie(reply);
      return {
        success: true,
        message: 'Sign-out successful',
      };
    }
  }

  /**
   * Get current user profile (optimized - uses cached data from middleware)
   */
  async getCurrentUser(userId: string, cachedUser?: any): Promise<UserResponse> {
    try {
      // If we have cached user data from middleware, use it (much faster)
      if (cachedUser) {
        return {
          user: {
            id: cachedUser.id,
            email: cachedUser.email,
            name: cachedUser.name,
            avatar: cachedUser.avatar || undefined,
            role: cachedUser.role,
            createdAt: new Date().toISOString(), // Use current time as fallback
          },
        };
      }

      // Fallback to database query (slower but ensures fresh data)
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || undefined,
          role: user.role,
          createdAt: user.createdAt as any,
        },
      };
    } catch (error) {
      this.handleError(error, 'Get user');
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAllDevices(
    userId: string,
    reply: FastifyReply
  ): Promise<SuccessResponse & { message: string }> {
    try {
      const redisService = createRedisAuthService();

      // Logout from all devices
      await redisService.logoutAllDevices(userId);

      // Clear current session cookie
      this.clearAuthCookie(reply);

      return {
        success: true,
        message: 'Logged out from all devices successfully',
      };
    } catch (error) {
      this.handleError(error, 'Logout all devices');
    }
  }

  /**
   * Refresh token
   */
  async refreshUserToken(token: string): Promise<SuccessResponse & { message: string }> {
    try {
      if (token) {
        await refreshToken(token);
      }

      return {
        success: true,
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      this.handleError(error, 'Refresh token');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
