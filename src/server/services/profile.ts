import { userRepository } from '../database/repository';
import { fileUpload } from '@/lib/server';
import { BaseService } from './base';
import { createRedisAuthService, createRedisLeaderboardService } from '../redis';
import { UpdateProfileRequest, UserResponse } from '@/types/shared/user';
import { CommonError } from '@/types/shared';
import { UploadAvatarResponse } from '@/types/shared';
import { cloudflareLoader } from '@/lib/utils/cdn';

export class ProfileService extends BaseService {
  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<UserResponse> {
    try {
      // Get fresh user data from database
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error(CommonError.NOT_FOUND);
      }

      // Get user statistics
      const statistics = await userRepository.getUserStatistics(userId);

      const response: UserResponse = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: (user.avatar || undefined) as any,
          role: user.role,
          createdAt: user.createdAt as any,
          statistics,
        },
      };
      return response;
    } catch (error) {
      this.handleError(error, 'Get profile');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, body: UpdateProfileRequest): Promise<UserResponse> {
    try {
      const { name, email } = body;

      // Build update object with only provided fields
      const updateData: { name?: string; email?: string } = {};

      if (name !== undefined) {
        if (!name.trim()) {
          throw new Error(CommonError.BAD_REQUEST);
        }
        updateData.name = name;
      }

      if (email !== undefined) {
        if (!email.trim()) {
          throw new Error(CommonError.BAD_REQUEST);
        }
        // Check if email is already taken by another user
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error(CommonError.BAD_REQUEST);
        }
        updateData.email = email;
      }

      // At least one field must be provided
      if (Object.keys(updateData).length === 0) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      const updatedUser = await userRepository.update(userId, updateData);
      // Invalidate user profile cache
      const redis = createRedisAuthService();
      await redis.deleteUserProfile(userId);
      // Invalidate leaderboard caches since name/avatar may change
      try {
        await createRedisLeaderboardService().invalidateAll();
      } catch {}

      // Update JWT payload in all active tokens
      const updatedUserData = {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        avatar: updatedUser[0].avatar || null,
        role: updatedUser[0].role,
      };
      await redis.updateUserInAllTokens(userId, updatedUserData);

      const response: UserResponse = { user: updatedUserData as any };
      return response;
    } catch (error) {
      this.handleError(error, 'Update profile');
    }
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(userId: string, fileData: any): Promise<UploadAvatarResponse> {
    try {
      if (!fileData) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Upload avatar using utils
      const uploadResult = await fileUpload.uploadImage(fileData, 'avatars');

      // Update user's avatar in database
      const updatedUser = await userRepository.update(userId, {
        avatar: uploadResult.publicPath,
      });

      // Invalidate user profile cache
      const redis = createRedisAuthService();
      await redis.deleteUserProfile(userId);
      // Invalidate leaderboard caches since avatar changed
      try {
        const { createRedisLeaderboardService } = await import('../redis');
        await createRedisLeaderboardService().invalidateAll();
      } catch {}

      // Update JWT payload in all active tokens
      const updatedUserData = {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        avatar: uploadResult.publicPath,
        role: updatedUser[0].role,
      };
      await redis.updateUserInAllTokens(userId, updatedUserData);

      const cdnUrl = cloudflareLoader(uploadResult.publicPath, {
        format: 'auto',
        quality: 85,
        width: 80,
        height: 80,
        fit: 'cover',
      });

      const response: UploadAvatarResponse = {
        avatar: cdnUrl,
        user: updatedUserData as any,
      };
      return response;
    } catch (error) {
      this.handleError(error, 'Upload avatar');
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService();
