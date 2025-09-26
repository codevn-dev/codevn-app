import { RedisAuthService } from './auth/auth';
import { RedisService } from './auth/auth';
import { createRedisLeaderboardService } from './leaderboard';
import { createRedisCategoriesService } from './categories';
import { createRedisArticlesService } from './articles';
import { createCountryRedisService } from './country';

let redisAuthService: RedisAuthService | null = null;

export function createRedisAuthService(): RedisAuthService {
  if (!redisAuthService) {
    redisAuthService = new RedisAuthService();
  }
  return redisAuthService;
}

// Export individual services for specific use cases
export {
  createRedisLeaderboardService,
  createRedisCategoriesService,
  createRedisArticlesService,
  createCountryRedisService,
};
export type { RedisService };
