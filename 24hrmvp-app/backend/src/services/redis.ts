// ============================================
// 24HRMVP - REDIS SERVICE (Optional)
// File: backend/src/services/redis.ts
// Falls back to memory when Redis unavailable
// Phase 3B: Added isRedisConnected() export
// ============================================

import Redis from 'ioredis';

// ============================================
// CONFIGURATION
// ============================================

const REDIS_ENABLED = !!process.env.REDIS_URL;

// ============================================
// REDIS CLIENTS (only if configured)
// ============================================

let redis: Redis | null = null;
let publisher: Redis | null = null;
let subscriber: Redis | null = null;
let redisConnected = false;

if (REDIS_ENABLED) {
  try {
    redis = new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          console.log('  ℹ Redis unavailable, using memory fallback');
          return null;
        }
        return Math.min(times * 100, 1000);
      },
    });

    publisher = redis.duplicate();
    subscriber = redis.duplicate();

    redis.on('connect', () => {
      redisConnected = true;
      console.log('✓ Redis connected');
    });

    redis.on('error', () => {
      redisConnected = false;
    });

    redis.on('close', () => {
      redisConnected = false;
    });

    // Attempt connection
    redis.connect().catch(() => {
      console.log('  ℹ Redis not available, using memory fallback');
    });
  } catch (err) {
    console.log('  ℹ Redis initialization failed, using memory fallback');
  }
} else {
  console.log('  ℹ Redis not configured, using memory fallback');
}

// ============================================
// PHASE 3B: Connection Status Export
// ============================================

export function isRedisConnected(): boolean {
  return redisConnected;
}

// ============================================
// IN-MEMORY FALLBACK
// ============================================

interface MemoryCacheEntry {
  value: any;
  expiry: number | null;
}

const memoryCache = new Map<string, MemoryCacheEntry>();
const memorySortedSets = new Map<string, Map<string, number>>();

// Clean expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiry && entry.expiry < now) {
      memoryCache.delete(key);
    }
  }
}, 60000);

// ============================================
// CACHE OPERATIONS
// ============================================

export const cache = {
  async get<T = any>(key: string): Promise<T | null> {
    if (redisConnected && redis) {
      try {
        const value = await redis.get(key);
        if (value) {
          try {
            return JSON.parse(value) as T;
          } catch {
            return value as unknown as T;
          }
        }
        return null;
      } catch {
        // Fall through to memory
      }
    }
    const entry = memoryCache.get(key);
    if (!entry) return null;
    if (entry.expiry && entry.expiry < Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return entry.value as T;
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (redisConnected && redis) {
      try {
        if (ttlSeconds) {
          await redis.setex(key, ttlSeconds, stringValue);
        } else {
          await redis.set(key, stringValue);
        }
        return;
      } catch {
        // Fall through to memory
      }
    }
    memoryCache.set(key, {
      value,
      expiry: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
    });
  },

  async del(key: string): Promise<void> {
    if (redisConnected && redis) {
      try {
        await redis.del(key);
      } catch {
        // Continue to memory
      }
    }
    memoryCache.delete(key);
  },

  async exists(key: string): Promise<boolean> {
    if (redisConnected && redis) {
      try {
        return (await redis.exists(key)) === 1;
      } catch {
        // Fall through
      }
    }
    const entry = memoryCache.get(key);
    if (!entry) return false;
    if (entry.expiry && entry.expiry < Date.now()) {
      memoryCache.delete(key);
      return false;
    }
    return true;
  },
};

// ============================================
// LEADERBOARD OPERATIONS (Sorted Sets)
// ============================================

export const leaderboard = {
  async addScore(key: string, oderId: string, score: number): Promise<void> {
    if (redisConnected && redis) {
      try {
        await redis.zadd(key, score, oderId);
        return;
      } catch {
        // Fall through
      }
    }
    let set = memorySortedSets.get(key);
    if (!set) {
      set = new Map();
      memorySortedSets.set(key, set);
    }
    set.set(oderId, (set.get(oderId) || 0) + score);
  },

  async getTopN(key: string, n: number): Promise<Array<{ oderId: string; score: number }>> {
    if (redisConnected && redis) {
      try {
        const results = await redis.zrevrange(key, 0, n - 1, 'WITHSCORES');
        const entries: Array<{ oderId: string; score: number }> = [];
        for (let i = 0; i < results.length; i += 2) {
          entries.push({ oderId: results[i], score: parseFloat(results[i + 1]) });
        }
        return entries;
      } catch {
        // Fall through
      }
    }
    const set = memorySortedSets.get(key);
    if (!set) return [];
    return Array.from(set.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([oderId, score]) => ({ oderId, score }));
  },

  async getRank(key: string, oderId: string): Promise<number | null> {
    if (redisConnected && redis) {
      try {
        const rank = await redis.zrevrank(key, oderId);
        return rank !== null ? rank + 1 : null;
      } catch {
        // Fall through
      }
    }
    const set = memorySortedSets.get(key);
    if (!set) return null;
    const sorted = Array.from(set.entries()).sort((a, b) => b[1] - a[1]);
    const index = sorted.findIndex(([id]) => id === oderId);
    return index >= 0 ? index + 1 : null;
  },

  async getScore(key: string, oderId: string): Promise<number | null> {
    if (redisConnected && redis) {
      try {
        const score = await redis.zscore(key, oderId);
        return score !== null ? parseFloat(score) : null;
      } catch {
        // Fall through
      }
    }
    const set = memorySortedSets.get(key);
    return set?.get(oderId) ?? null;
  },
};

// ============================================
// RATE LIMITER
// ============================================

const rateLimitMemory = new Map<string, { count: number; resetAt: number }>();

export const rateLimiter = {
  async checkLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    if (redisConnected && redis) {
      try {
        const current = await redis.incr(key);
        if (current === 1) {
          await redis.expire(key, windowSeconds);
        }
        return {
          allowed: current <= limit,
          remaining: Math.max(0, limit - current),
        };
      } catch {
        // Fall through
      }
    }
    const now = Date.now();
    let entry = rateLimitMemory.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowSeconds * 1000 };
      rateLimitMemory.set(key, entry);
    }
    entry.count++;
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
    };
  },
};

// ============================================
// PUB/SUB
// ============================================

export const pubsub = {
  async publish(channel: string, message: string): Promise<void> {
    if (redisConnected && publisher) {
      try {
        await publisher.publish(channel, message);
      } catch {
        // Silent fail - no pub/sub without Redis
      }
    }
  },

  subscribe(channel: string, callback: (message: string) => void): void {
    if (redisConnected && subscriber) {
      try {
        subscriber.subscribe(channel);
        subscriber.on('message', (ch: string, msg: string) => {
          if (ch === channel) callback(msg);
        });
      } catch {
        // Silent fail
      }
    }
  },
};

// ============================================
// GRID CACHE (Forum/Social specific)
// ============================================

export const gridCache = {
  // TTL constants
  ttl: {
    feed: 60,
    post: 300,
    trending: 120,
  },

  // Key generators
  keys: {
    forumFeed: (params: string) => `grid:forum:feed:${params}`,
    forumPost: (slug: string) => `grid:forum:post:${slug}`,
    socialFeed: (platform?: string, channelId?: string) => 
      `grid:social:feed:${platform || "all"}:${channelId || "none"}`,
    trending: (channelId: string) => `grid:trending:${channelId}`,
  },

  async getForumFeed(params: string): Promise<any | null> {
    return cache.get(`grid:forum:feed:${params}`);
  },

  async setForumFeed(params: string, data: any, ttl = 60): Promise<void> {
    await cache.set(`grid:forum:feed:${params}`, data, ttl);
  },

  async invalidateForumCache(): Promise<void> {
    for (const key of memoryCache.keys()) {
      if (key.startsWith('grid:forum:')) {
        memoryCache.delete(key);
      }
    }
  },

  async invalidatePost(slug: string): Promise<void> {
    await cache.del(`grid:forum:post:${slug}`);
    await this.invalidateForumCache();
  },

  async invalidateSocialFeed(platform?: string): Promise<void> {
    const prefix = platform ? `grid:social:feed:${platform}` : 'grid:social:';
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }
  },
};

// ============================================
// HEALTH CHECK
// ============================================

export async function checkRedisHealth(): Promise<{
  status: 'connected' | 'disconnected' | 'disabled';
  connected: boolean;
  latency?: number;
}> {
  if (!REDIS_ENABLED) {
    return { status: 'disabled', connected: false };
  }
  if (!redisConnected || !redis) {
    return { status: 'disconnected', connected: false };
  }
  try {
    const start = Date.now();
    await redis.ping();
    return { status: 'connected', connected: true, latency: Date.now() - start };
  } catch {
    return { status: 'disconnected', connected: false };
  }
}

// ============================================
// EXPORTS
// ============================================

export { redis, publisher, subscriber };

export default {
  cache,
  leaderboard,
  rateLimiter,
  pubsub,
  gridCache,
  checkRedisHealth,
};
