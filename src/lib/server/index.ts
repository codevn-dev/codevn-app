import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }
  return redisClient;
}

export function createSubscriber(): Redis {
  // ioredis recommends duplicating the connection for pub/sub
  return getRedis().duplicate();
}

export async function ensureRedisConnected(): Promise<void> {
  const client = getRedis();
  if (client.status === 'end') {
    await client.connect();
  }
}

export * from './file-upload';
