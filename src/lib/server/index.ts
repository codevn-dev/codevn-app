import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    // Build Redis configuration from individual environment variables
    const host = process.env.REDIS_HOST || 'localhost';
    const port = parseInt(process.env.REDIS_PORT || '6379');
    const password = process.env.REDIS_PASSWORD || undefined;
    const db = parseInt(process.env.REDIS_DB || '0');

    redisClient = new Redis({
      host,
      port,
      password,
      db,
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
