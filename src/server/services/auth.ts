import { FastifyReply } from 'fastify';
import { userRepository } from '../database/repository';
import { generateTokenPair, revokeTokenPair, verifyRefreshToken } from '../middleware/jwt';
import { createRedisAuthService, createRedisFirstUserService } from '../redis';
import { AuthError, CommonError, RoleLevel } from '@/types/shared';
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
  private redisFirstUserService = createRedisFirstUserService();
  private static hasFirstUser: boolean | null = null;

  /**
   * Set authentication cookies
   */
  private setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken: string): void {
    // Access token cookie (15 minutes)
    reply.cookie('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN || undefined : undefined,
      maxAge: config.auth.accessTokenExpiresIn * 1000, // 15 minutes
    });

    // Refresh token cookie (7 days)
    reply.cookie('refresh-token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN || undefined : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  /**
   * Set authentication cookie (backward compatibility)
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
   * Clear authentication cookies
   */
  private clearAuthCookies(reply: FastifyReply): void {
    reply.clearCookie('auth-token', {
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN || undefined : undefined,
    });
    reply.clearCookie('refresh-token', {
      path: '/',
      domain:
        process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN || undefined : undefined,
    });
  }

  /**
   * Clear authentication cookie (backward compatibility)
   */
  private clearAuthCookie(reply: FastifyReply): void {
    reply.clearCookie('auth-token');
  }

  /**
   * Extract session metadata from request
   */
  private extractSessionMetadata(request?: any): any {
    if (!request) return undefined;

    const userAgent = request.headers['user-agent'] || 'unknown';
    const loginTime = new Date().toISOString();

    // Try to get country code from headers (if using CloudFlare, etc.)
    const countryCode =
      request.headers['cf-ipcountry'] || request.headers['x-country-code'] || undefined;

    // Parse device info from User Agent
    const deviceInfo = this.parseUserAgent(userAgent);

    return {
      countryCode,
      deviceInfo,
      loginTime,
    };
  }

  /**
   * Parse User Agent to extract device info
   */
  private parseUserAgent(userAgent: string): any {
    const deviceInfo: any = {};

    // Browser detection
    if (userAgent.includes('Chrome')) {
      deviceInfo.browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      deviceInfo.browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      deviceInfo.browser = 'Safari';
    } else if (userAgent.includes('Edge')) {
      deviceInfo.browser = 'Edge';
    } else if (userAgent.includes('Opera')) {
      deviceInfo.browser = 'Opera';
    }

    // OS detection
    if (userAgent.includes('Windows')) {
      deviceInfo.os = 'Windows';
    } else if (userAgent.includes('Mac OS')) {
      deviceInfo.os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      deviceInfo.os = 'Linux';
    } else if (userAgent.includes('Android')) {
      deviceInfo.os = 'Android';
    } else if (
      userAgent.includes('iOS') ||
      userAgent.includes('iPhone') ||
      userAgent.includes('iPad')
    ) {
      deviceInfo.os = 'iOS';
    }

    // Device type detection
    if (
      userAgent.includes('Mobile') ||
      userAgent.includes('Android') ||
      userAgent.includes('iPhone')
    ) {
      deviceInfo.device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      deviceInfo.device = 'Tablet';
    } else {
      deviceInfo.device = 'Desktop';
    }

    return deviceInfo;
  }

  /**
   * Sign in user with local authentication
   */
  async signIn(user: any, reply: FastifyReply, request?: any): Promise<LoginResponse> {
    try {
      // Extract session metadata from request
      const sessionMetadata = this.extractSessionMetadata(request);
      const { accessToken, refreshToken } = await generateTokenPair(user, sessionMetadata);
      this.setAuthCookies(reply, accessToken, refreshToken);

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
   * Check if this is the first user in the system
   * Uses Redis cache with fallback to database and in-memory cache
   */
  private async isFirstUser(): Promise<boolean> {
    // 1. Check in-memory cache first (fastest)
    if (AuthService.hasFirstUser !== null) {
      return !AuthService.hasFirstUser;
    }

    // 2. Check Redis cache
    const redisResult = await this.redisFirstUserService.get();
    if (redisResult !== null) {
      // Update in-memory cache
      AuthService.hasFirstUser = redisResult;
      return !redisResult;
    }

    // 3. Fallback to database query
    const hasAnyUsers = await userRepository.hasAnyUsers();
    const isFirst = !hasAnyUsers;

    // Update both caches
    AuthService.hasFirstUser = hasAnyUsers;
    await this.redisFirstUserService.set(hasAnyUsers);

    return isFirst;
  }

  /**
   * Mark that the first user has been created
   * Call this after successfully creating the first user
   */
  private async markFirstUserCreated(): Promise<void> {
    // Update in-memory cache
    AuthService.hasFirstUser = true;

    // Update Redis cache
    await this.redisFirstUserService.set(true);
  }

  /**
   * Get the appropriate role for a new user
   * Returns admin for first user, member for subsequent users
   */
  private async getRoleForNewUser(): Promise<'admin' | 'member'> {
    const isFirst = config.firstUser.enabled ? await this.isFirstUser() : false;
    return isFirst ? 'admin' : 'member';
  }

  /**
   * Public method for getting role for new user (used by OAuth)
   */
  async getRoleForNewUserPublic(): Promise<'admin' | 'member'> {
    return this.getRoleForNewUser();
  }

  /**
   * Public method for marking first user created (used by OAuth)
   */
  async markFirstUserCreatedPublic(): Promise<void> {
    return this.markFirstUserCreated();
  }

  /**
   * Sign up new user
   */
  async signUp(body: RegisterBody, reply: FastifyReply, request?: any): Promise<RegisterResponse> {
    try {
      const { email, name, password } = body;

      this.validateRequiredFields(body, ['email', 'name', 'password']);

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        const err: any = new Error('Email already exists');
        err.code = AuthError.EMAIL_EXISTS;
        throw err;
      }

      // Get appropriate role for new user (admin for first user, member for others)
      const userRole = await this.getRoleForNewUser();

      // Create user
      const newUser = await userRepository.create({
        email,
        name,
        password,
        role: userRole as any,
      });

      // Mark first user as created to update cache
      if (userRole === 'admin') {
        await this.markFirstUserCreated();
      }

      // Auto-login: generate token pair and set cookies like sign-in
      const createdUser = newUser[0];
      const sessionMetadata = this.extractSessionMetadata(request);
      const { accessToken, refreshToken } = await generateTokenPair(createdUser, sessionMetadata);
      this.setAuthCookies(reply, accessToken, refreshToken);

      return {
        message: 'Sign-up successful',
        user: {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.name,
          avatar: createdUser.avatar || undefined,
          role: (createdUser.role as any) || RoleLevel.member,
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
  async handleGoogleOAuth(
    user: any,
    reply: FastifyReply,
    returnUrl?: string,
    request?: any
  ): Promise<void> {
    try {
      // Extract session metadata from request
      const sessionMetadata = this.extractSessionMetadata(request);
      const { accessToken, refreshToken } = await generateTokenPair(user, sessionMetadata);
      this.setAuthCookies(reply, accessToken, refreshToken);

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
    reply: FastifyReply,
    accessToken: string | null,
    refreshToken?: string
  ): Promise<SuccessResponse & { message: string }> {
    try {
      // Revoke both access token and refresh token
      await revokeTokenPair(accessToken, refreshToken);

      this.clearAuthCookies(reply);
      return {
        success: true,
        message: 'Sign-out successful',
      };
    } catch {
      // Still clear cookies even if Redis operation fails
      this.clearAuthCookies(reply);
      return {
        success: true,
        message: 'Sign-out successful',
      };
    }
  }

  /**
   * Get current user profile (optimized - uses cached data from middleware)
   */
  async getCurrentUser(userId: string): Promise<UserResponse> {
    try {
      // First try user profile cache in Redis for freshest view
      const redis = createRedisAuthService();
      const cachedProfile = await redis.getUserProfile(userId);
      if (cachedProfile) {
        return { user: cachedProfile };
      }

      // Fallback to database query (slower but ensures fresh data)
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error(CommonError.NOT_FOUND);
      }

      const fullUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: (user.avatar || undefined) as any,
        role: user.role,
        createdAt: user.createdAt as any,
      };
      // Cache the fresh DB result
      await redis.setUserProfile(userId, fullUser, 3600);
      return { user: fullUser };
    } catch (error) {
      this.handleError(error, 'Get user');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const payload = await verifyRefreshToken(refreshToken);
      if (!payload) {
        throw new Error(CommonError.ACCESS_DENIED);
      }

      // Prefer user profile from Redis cache, fallback to database
      const redis = createRedisAuthService();
      const cachedProfile = await redis.getUserProfile(payload.id);
      const user = cachedProfile || (await userRepository.findById(payload.id));
      if (!user) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Generate new token pair
      const tokenPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: (user as any).avatar,
        role: user.role,
      };

      // Revoke old refresh token first
      await revokeTokenPair(null, refreshToken);

      // Generate new token pair with sessionMetadata from the old refresh token
      const { accessToken, refreshToken: newRefreshToken } = await generateTokenPair(
        tokenPayload,
        payload.sessionMetadata
      );

      return { accessToken, refreshToken: newRefreshToken };
    } catch (error) {
      this.handleError(error, 'Refresh access token');
    }
  }

  /**
   * Terminate sessions (single or multiple)
   */
  async terminateSessions(
    userId: string,
    tokens: string[]
  ): Promise<SuccessResponse & { message: string }> {
    try {
      const redis = createRedisAuthService();

      // Terminate all sessions in the array
      for (const token of tokens) {
        await redis.terminateSession(userId, token);
      }

      const count = tokens.length;
      const message =
        count === 1
          ? 'Session terminated successfully'
          : `${count} sessions terminated successfully`;

      return {
        success: true,
        message,
      };
    } catch (error) {
      this.handleError(error, 'Terminate sessions');
    }
  }

  async getUserActiveSessions(userId: string, currentToken?: string) {
    try {
      const redis = createRedisAuthService();
      const sessions = await redis.getUserActiveSessions(userId, currentToken);
      return sessions;
    } catch (error) {
      this.handleError(error, 'Get user active sessions');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
