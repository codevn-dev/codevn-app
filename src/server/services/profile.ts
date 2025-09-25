import { userRepository } from '../database/repository';
import { fileUpload } from '@/lib/server';
import { BaseService } from './base';
import { createRedisAuthService } from '../redis';
import { UpdateProfileRequest, UserResponse } from '@/types/shared/user';
import { UploadAvatarResponse } from '@/types/shared';

export class ProfileService extends BaseService {
  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<UserResponse> {
    try {
      // Get fresh user data from database
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
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
          throw new Error('Name cannot be empty');
        }
        updateData.name = name;
      }

      if (email !== undefined) {
        if (!email.trim()) {
          throw new Error('Email cannot be empty');
        }
        // Check if email is already taken by another user
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email is already taken');
        }
        updateData.email = email;
      }

      // At least one field must be provided
      if (Object.keys(updateData).length === 0) {
        throw new Error('At least one field (name or email) must be provided');
      }

      const updatedUser = await userRepository.update(userId, updateData);
      // Invalidate user profile cache
      const redis = createRedisAuthService();
      await redis.deleteUserProfile(userId);

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
        throw new Error('File is required');
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

      // Update JWT payload in all active tokens
      const updatedUserData = {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        avatar: uploadResult.publicPath,
        role: updatedUser[0].role,
      };
      await redis.updateUserInAllTokens(userId, updatedUserData);

      const response: UploadAvatarResponse = {
        success: true,
        avatar: uploadResult.publicPath,
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
