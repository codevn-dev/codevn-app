import { RedisAuthService } from './redis-auth-service';
import { TokenService } from './token-service';
import { UserService } from './user-service';
import { SessionService } from './session-service';
import { RedisService } from './redis-auth-service';
import { createRedisLeaderboardService } from './redis-leaderboard-service';

let redisAuthService: RedisAuthService | null = null;

export function createRedisAuthService(): RedisAuthService {
  if (!redisAuthService) {
    redisAuthService = new RedisAuthService();
  }
  return redisAuthService;
}

// Export individual services for specific use cases
export { TokenService, UserService, SessionService, createRedisLeaderboardService };
export type { RedisService };
