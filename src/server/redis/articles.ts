import { getRedis } from '@/lib/server';

export class RedisArticlesService {
  private readonly featuredPrefix = 'articles:featured';
  private readonly relatedPrefix = 'articles:related';

  private featuredKey(limit: number, windowHours: number) {
    return `${this.featuredPrefix}:${limit}:${windowHours}`;
  }

  private relatedKey(articleId: string, limit: number) {
    return `${this.relatedPrefix}:${articleId}:${limit}`;
  }

  async getFeatured(limit: number, windowHours: number): Promise<string | null> {
    const redis = getRedis();
    return await redis.get(this.featuredKey(limit, windowHours));
  }

  async setFeatured(limit: number, windowHours: number, value: string, ttlSeconds: number = 3600) {
    const redis = getRedis();
    await redis.setex(this.featuredKey(limit, windowHours), ttlSeconds, value);
  }

  async getRelated(articleId: string, limit: number): Promise<string | null> {
    const redis = getRedis();
    return await redis.get(this.relatedKey(articleId, limit));
  }

  async setRelated(articleId: string, limit: number, value: string, ttlSeconds: number = 3600) {
    const redis = getRedis();
    await redis.setex(this.relatedKey(articleId, limit), ttlSeconds, value);
  }

  async invalidateRelatedFor(articleId: string): Promise<void> {
    const redis = getRedis();
    const keys = await redis.keys(`${this.relatedPrefix}:${articleId}:*`);
    if (Array.isArray(keys) && keys.length > 0) {
      await redis.del(keys);
    }
  }
}

export function createRedisArticlesService(): RedisArticlesService {
  return new RedisArticlesService();
}
