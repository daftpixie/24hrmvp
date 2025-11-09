import Redis from 'ioredis';

// Redis client configuration
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// Redis pub/sub clients
export const publisher = redis.duplicate();
export const subscriber = redis.duplicate();

// Leaderboard operations
export const leaderboard = {
  async update(userId: string, score: number): Promise<void> {
    await redis.zadd('leaderboard:global', score, userId);
    await redis.zadd(`leaderboard:weekly:${getWeekKey()}`, score, userId);
    await redis.expire(`leaderboard:weekly:${getWeekKey()}`, 7 * 24 * 3600);
  },
  
  async getTop(limit: number = 50): Promise<Array<{userId: string, score: number}>> {
    const results = await redis.zrevrange('leaderboard:global', 0, limit - 1, 'WITHSCORES');
    const leaderboard = [];
    for (let i = 0; i < results.length; i += 2) {
      leaderboard.push({
        userId: results[i],
        score: parseInt(results[i + 1])
      });
    }
    return leaderboard;
  },
  
  async getUserRank(userId: string): Promise<number | null> {
    const rank = await redis.zrevrank('leaderboard:global', userId);
    return rank !== null ? rank + 1 : null;
  }
};

// Cache operations
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await redis.setex(key, ttl, JSON.stringify(value));
  },
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};

// Rate limiting
export const rateLimiter = {
  async checkLimit(key: string, limit: number, window: number): Promise<boolean> {
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }
    
    return current <= limit;
  }
};

function getWeekKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = Math.ceil((now.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 3600 * 1000));
  return `${year}-W${week}`;
}

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

redis.on('connect', () => {
  console.log('✓ Redis connected');
});

export default redis;
