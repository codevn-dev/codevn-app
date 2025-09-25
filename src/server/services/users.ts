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

  /**
   * Calculate date filter based on timeframe
   */
  private getDateFilter(timeframe: '7d' | '30d' | '90d' | '1y' | 'all'): Date | null {
    if (timeframe === '7d') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return sevenDaysAgo;
    } else if (timeframe === '30d') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return thirtyDaysAgo;
    } else if (timeframe === '90d') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return ninetyDaysAgo;
    } else if (timeframe === '1y') {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return oneYearAgo;
    }
    return null;
  }

  /**
   * Calculate user score based on the provided formula
   */
  private calculateScore(stats: {
    posts: number;
    likes: number;
    dislikes: number;
    comments: number;
    views: number;
  }): number {
    const { posts, likes, dislikes, comments, views } = stats;
    return posts * 10 + likes * 5 + comments * 3 + Math.log(views + 1) * 5 - dislikes * 3;
  }

  /**
   * Get user statistics for leaderboard
   */
  private async getUserStatsForLeaderboard(userId: string, startDate?: Date | null) {
    const [posts, likes, dislikes, comments, views] = await Promise.all([
      userRepository.getUserArticleCount(userId, startDate),
      userRepository.getUserLikesCount(userId, startDate),
      userRepository.getUserDislikesCount(userId, startDate),
      userRepository.getUserCommentsCount(userId, startDate),
      userRepository.getUserViewsCount(userId, startDate),
    ]);

    const stats = { posts, likes, dislikes, comments, views };
    const score = this.calculateScore(stats);

    return { ...stats, score };
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(timeframe: '7d' | '30d' | '90d' | '1y' | 'all' = '7d', limit: number = 10) {
    try {
      const startDate = this.getDateFilter(timeframe);

      // Get all users
      const users = await userRepository.getAllUsersForLeaderboard();

      // Calculate statistics for each user
      const leaderboardData = await Promise.all(
        users.map(async (user) => {
          const stats = await this.getUserStatsForLeaderboard(user.id, startDate);

          return {
            user: {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
              email: user.email,
              role: user.role,
              createdAt: user.createdAt,
            },
            stats,
          };
        })
      );

      // Apply business logic: filter, sort, and limit
      const filteredAndSorted = leaderboardData
        .filter((item) => item.stats.score > 0) // Only include users with positive scores
        .sort((a, b) => b.stats.score - a.stats.score) // Sort by score descending
        .slice(0, limit); // Limit results

      // Mask emails for privacy
      const maskedData = filteredAndSorted.map((item) => ({
        ...item,
        user: maskUserEmail(item.user),
      }));

      return { leaderboard: maskedData };
    } catch (error) {
      this.handleError(error, 'Get leaderboard');
    }
  }
}

// Export singleton instance
export const usersService = new UsersService();
