import { getRedis } from '@/lib/server';

export class RedisLeaderboardService {
  private readonly keyPrefix = 'leaderboard:';
  private readonly ttl = 3600; // 1 hour

  async get(timeframe: string, limit: number): Promise<string | null> {
    const redis = getRedis();
    const key = `${this.keyPrefix}${timeframe}:${limit}`;
    return await redis.get(key);
  }

  async set(timeframe: string, limit: number, value: string): Promise<void> {
    const redis = getRedis();
    const key = `${this.keyPrefix}${timeframe}:${limit}`;
    await redis.setex(key, this.ttl, value);
  }

  async invalidateAll(): Promise<void> {
    const redis = getRedis();
    const keys = await redis.keys(`${this.keyPrefix}*`);
    if (Array.isArray(keys) && keys.length > 0) {
      await redis.del(keys);
    }
  }
}

export function createRedisLeaderboardService(): RedisLeaderboardService {
  return new RedisLeaderboardService();
}
