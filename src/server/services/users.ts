import { userRepository } from '../database/repository';
import { maskUserEmail, isAdmin } from '@/lib/utils';
import { BaseService } from './base';
import { UserResponse } from '@/types/shared/user';
import { CommonError } from '@/types/shared';
import { calculateUserScore } from '@/lib/utils/score';
import { createRedisLeaderboardService } from '../redis';

export class UsersService extends BaseService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string, currentUserId: string): Promise<UserResponse> {
    try {
      if (!userId) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error(CommonError.NOT_FOUND);
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
    return calculateUserScore({ posts, likes, dislikes, comments, views });
  }

  /**
   * Get leaderboard data (optimized with batched queries and Redis caching)
   */
  async getLeaderboard(timeframe: '7d' | '30d' | '90d' | '1y' | 'all' = '7d', limit: number = 10) {
    try {
      const startDate = this.getDateFilter(timeframe);

      // Try to get from Redis cache first
      try {
        const leaderboardRedis = createRedisLeaderboardService();
        const cached = await leaderboardRedis.get(timeframe, limit);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch {
        // If Redis fails, continue without cache
      }

      // Get only users who have published articles (more efficient)
      const users = await userRepository.getActiveUsersForLeaderboard();

      if (users.length === 0) {
        return { leaderboard: [] };
      }

      // Extract user IDs for batch processing
      const userIds = users.map((user) => user.id);

      // Get all user stats in batched queries (much faster than N+1)
      const batchStats = await userRepository.getBatchUserStats(userIds, startDate);

      // Create a map for fast lookup
      const statsMap = new Map();
      batchStats.forEach((stat) => {
        const score = this.calculateScore({
          posts: stat.posts,
          likes: stat.likes,
          dislikes: stat.dislikes,
          comments: stat.comments,
          views: stat.views,
        });
        statsMap.set(stat.userId, {
          posts: stat.posts,
          likes: stat.likes,
          dislikes: stat.dislikes,
          comments: stat.comments,
          views: stat.views,
          score,
        });
      });

      // Build leaderboard data
      const leaderboardData = users
        .map((user) => {
          const stats = statsMap.get(user.id);
          if (!stats) return null;

          return {
            user: {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
            } as any,
            stats,
          };
        })
        .filter(Boolean); // Remove null entries

      // Apply business logic: filter, sort, and limit
      let filteredAndSorted = leaderboardData
        .filter((item): item is NonNullable<typeof item> => item !== null && item.stats.score > 0)
        .sort((a, b) => b.stats.score - a.stats.score)
        .slice(0, limit);

      // Fallback: if no positive-score users found (edge cases), include top users by score >= 0
      if (filteredAndSorted.length === 0) {
        filteredAndSorted = leaderboardData
          .filter((item): item is NonNullable<typeof item> => item !== null)
          .sort((a, b) => b.stats.score - a.stats.score)
          .slice(0, limit);
      }

      const result = { leaderboard: filteredAndSorted };

      // Cache the result in Redis
      try {
        const leaderboardRedis = createRedisLeaderboardService();
        await leaderboardRedis.set(timeframe, limit, JSON.stringify(result));
      } catch (error) {
        // If Redis fails, continue without caching
        console.warn('Failed to cache leaderboard:', error);
      }

      return result;
    } catch (error) {
      this.handleError(error, 'Get leaderboard');
    }
  }
}

// Export singleton instance
export const usersService = new UsersService();
