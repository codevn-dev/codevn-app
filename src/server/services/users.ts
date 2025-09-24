import { userRepository } from '../database/repository';
import { maskUserEmail, isAdmin } from '@/lib/utils';
import { BaseService } from './base';
import { UserResponse } from '@/types/shared/user';

export class UsersService extends BaseService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string, currentUserId: string): Promise<UserResponse> {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user statistics
      const statistics = await userRepository.getUserStatistics(userId);

      // Return user data without sensitive information
      const userProfile = {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
        statistics,
      };

      // Mask email for privacy unless user is admin or viewing own profile
      const isOwnProfile = currentUserId === userId;
      const finalUserProfile =
        isAdmin(user.role) || isOwnProfile ? userProfile : maskUserEmail(userProfile);

      return { user: finalUserProfile as any };
    } catch (error) {
      this.handleError(error, 'Get user');
    }
  }
}

// Export singleton instance
export const usersService = new UsersService();
