import { RedisAuthService } from './redis-auth-service';
import { TokenService } from './token-service';
import { UserService } from './user-service';
import { SessionService } from './session-service';
import { RedisService } from './types';

let redisAuthService: RedisAuthService | null = null;

export function createRedisAuthService(): RedisAuthService {
  if (!redisAuthService) {
    redisAuthService = new RedisAuthService();
  }
  return redisAuthService;
}

// Export individual services for specific use cases
export { TokenService, UserService, SessionService };
export type { RedisService };
