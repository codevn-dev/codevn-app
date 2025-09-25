import { create } from 'zustand';
import { apiGet } from '@/lib/utils';
import { LeaderboardResponse, LeaderboardEntry } from '@/types/shared/user';

interface LeaderboardState {
  // Cache for different timeframes and limits
  cache: Record<
    string,
    {
      data: LeaderboardEntry[];
      timestamp: number;
      isLoading: boolean;
      error: string | null;
    }
  >;

  // Actions
  fetchLeaderboard: (
    timeframe: '7d' | '30d' | '90d' | '1y' | 'all',
    limit: number
  ) => Promise<LeaderboardEntry[]>;

  // Clear cache (useful for manual refresh)
  clearCache: () => void;

  // Get cached data without fetching
  getCachedData: (
    timeframe: '7d' | '30d' | '90d' | '1y' | 'all',
    limit: number
  ) => LeaderboardEntry[] | null;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (timeframe: string, limit: number) => `${timeframe}:${limit}`;

export const useLeaderboardStore = create<LeaderboardState>((set, get) => ({
  cache: {},

  fetchLeaderboard: async (timeframe, limit) => {
    const cacheKey = getCacheKey(timeframe, limit);
    const now = Date.now();
    const cached = get().cache[cacheKey];

    // Return cached data if it's fresh and not loading
    if (cached && !cached.isLoading && now - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    // If already loading, return cached data or empty array
    if (cached?.isLoading) {
      return cached.data || [];
    }

    // Set loading state
    set((state) => ({
      cache: {
        ...state.cache,
        [cacheKey]: {
          data: cached?.data || [],
          timestamp: now,
          isLoading: true,
          error: null,
        },
      },
    }));

    try {
      const response = await apiGet<LeaderboardResponse>(
        `/api/users/leaderboard?timeframe=${timeframe}&limit=${limit}`
      );

      // Update cache with successful data
      set((state) => ({
        cache: {
          ...state.cache,
          [cacheKey]: {
            data: response.leaderboard,
            timestamp: now,
            isLoading: false,
            error: null,
          },
        },
      }));

      return response.leaderboard;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load leaderboard';

      // Update cache with error
      set((state) => ({
        cache: {
          ...state.cache,
          [cacheKey]: {
            data: cached?.data || [],
            timestamp: now,
            isLoading: false,
            error: errorMessage,
          },
        },
      }));

      throw error;
    }
  },

  clearCache: () => {
    set({ cache: {} });
  },

  getCachedData: (timeframe, limit) => {
    const cacheKey = getCacheKey(timeframe, limit);
    const cached = get().cache[cacheKey];
    const now = Date.now();

    if (cached && !cached.isLoading && now - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    return null;
  },
}));
