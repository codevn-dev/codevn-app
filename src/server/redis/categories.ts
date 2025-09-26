import { getRedis } from '@/lib/server';

export class RedisCategoriesService {
  private readonly keyAll = 'categories:all';

  async getAll(): Promise<string | null> {
    const redis = getRedis();
    return await redis.get(this.keyAll);
  }

  async setAll(value: string, ttlSeconds: number = 3600): Promise<void> {
    const redis = getRedis();
    await redis.setex(this.keyAll, ttlSeconds, value);
  }

  async invalidateAll(): Promise<void> {
    const redis = getRedis();
    await redis.del(this.keyAll);
  }
}

export function createRedisCategoriesService(): RedisCategoriesService {
  return new RedisCategoriesService();
}
