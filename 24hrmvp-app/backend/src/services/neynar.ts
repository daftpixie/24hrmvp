// ============================================
// 24HRMVP - THE GRID NEYNAR SERVICE
// File: backend/src/services/neynar.ts
// Farcaster data access via Neynar API
// ============================================

import {
  INeynarService,
  NeynarFeedResponse,
  NeynarCast,
} from '../types/grid';
import { cache, gridCache } from './redis';

/**
 * Neynar API client for Farcaster data access
 * 
 * Provides:
 * - Channel feed fetching
 * - User cast history
 * - Cast lookup by hash
 * - Cast search
 * - Trending channels
 */
export class NeynarService implements INeynarService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.neynar.com/v2';

  constructor() {
    this.apiKey = process.env.NEYNAR_API_KEY || '';
    
    if (!this.apiKey) {
      console.warn('NEYNAR_API_KEY not configured. Farcaster features will be limited.');
    }
  }

  /**
   * Check if Neynar is configured
   */
  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  /**
   * Make authenticated request to Neynar API
   */
  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('Neynar API key not configured');
    }

    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'accept': 'application/json',
        'api_key': this.apiKey,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Neynar API error: ${response.status} - ${error}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Get casts from a channel feed
   * 
   * @param channelId Channel ID (e.g., 'farcaster', 'base')
   * @param cursor Pagination cursor
   * @param limit Number of casts to return
   */
  async getChannelFeed(
    channelId: string,
    cursor?: string,
    limit: number = 25
  ): Promise<NeynarFeedResponse> {
    // Check cache first
    const cacheKey = `neynar:channel:${channelId}:${cursor || 'first'}`;
    const cached = await cache.get<NeynarFeedResponse>(cacheKey);
    if (cached) return cached;

    const response = await this.request<{ casts: any[]; next?: { cursor: string } }>(
      '/farcaster/feed/channel',
      {
        channel_id: channelId,
        limit: limit.toString(),
        ...(cursor && { cursor }),
      }
    );

    const result = this.normalizeResponse(response);
    
    // Cache for 2 minutes
    await cache.set(cacheKey, result, 120);
    
    return result;
  }

  /**
   * Get casts by a specific user
   * 
   * @param fid Farcaster ID
   * @param cursor Pagination cursor
   * @param limit Number of casts to return
   */
  async getUserCasts(
    fid: number,
    cursor?: string,
    limit: number = 25
  ): Promise<NeynarFeedResponse> {
    const cacheKey = `neynar:user:${fid}:${cursor || 'first'}`;
    const cached = await cache.get<NeynarFeedResponse>(cacheKey);
    if (cached) return cached;

    const response = await this.request<{ casts: any[]; next?: { cursor: string } }>(
      '/farcaster/feed/user/casts',
      {
        fid: fid.toString(),
        limit: limit.toString(),
        ...(cursor && { cursor }),
      }
    );

    const result = this.normalizeResponse(response);
    await cache.set(cacheKey, result, 120);
    
    return result;
  }

  /**
   * Get a single cast by hash
   * 
   * @param hash Cast hash
   */
  async getCast(hash: string): Promise<NeynarCast | null> {
    const cacheKey = `neynar:cast:${hash}`;
    const cached = await cache.get<NeynarCast>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.request<{ cast: any }>(
        '/farcaster/cast',
        { identifier: hash, type: 'hash' }
      );

      const cast = this.normalizeCast(response.cast);
      await cache.set(cacheKey, cast, 300); // Cache for 5 minutes
      
      return cast;
    } catch (error) {
      console.error('Error fetching cast:', error);
      return null;
    }
  }

  /**
   * Search casts by query
   * 
   * @param query Search query
   * @param limit Number of results
   */
  async searchCasts(query: string, limit: number = 10): Promise<NeynarCast[]> {
    // Note: Neynar search endpoint may have different availability by tier
    try {
      const response = await this.request<{ result: { casts: any[] } }>(
        '/farcaster/cast/search',
        {
          q: query,
          limit: limit.toString(),
        }
      );

      return response.result.casts.map(this.normalizeCast);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Get trending channels
   * 
   * @param limit Number of channels to return
   */
  async getTrendingChannels(
    limit: number = 10
  ): Promise<Array<{ id: string; name: string; follower_count: number }>> {
    const cacheKey = 'neynar:trending-channels';
    const cached = await cache.get<Array<{ id: string; name: string; follower_count: number }>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.request<{ channels: any[] }>(
        '/farcaster/channel/trending',
        { limit: limit.toString() }
      );

      const channels = response.channels.map((ch: any) => ({
        id: ch.id,
        name: ch.name,
        follower_count: ch.follower_count || 0,
      }));

      await cache.set(cacheKey, channels, 600); // Cache for 10 minutes
      
      return channels;
    } catch (error) {
      console.error('Error fetching trending channels:', error);
      return [];
    }
  }

  /**
   * Get channel details
   * 
   * @param channelId Channel ID
   */
  async getChannel(channelId: string): Promise<{
    id: string;
    name: string;
    description: string;
    follower_count: number;
    image_url: string;
  } | null> {
    const cacheKey = `neynar:channel-info:${channelId}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.request<{ channel: any }>(
        '/farcaster/channel',
        { id: channelId }
      );

      const channel = {
        id: response.channel.id,
        name: response.channel.name,
        description: response.channel.description || '',
        follower_count: response.channel.follower_count || 0,
        image_url: response.channel.image_url || '',
      };

      await cache.set(cacheKey, channel, 3600); // Cache for 1 hour
      
      return channel;
    } catch (error) {
      console.error('Error fetching channel:', error);
      return null;
    }
  }

  /**
   * Get user by FID
   * 
   * @param fid Farcaster ID
   */
  async getUser(fid: number): Promise<{
    fid: number;
    username: string;
    display_name: string | null;
    pfp_url: string | null;
    follower_count: number;
    following_count: number;
  } | null> {
    const cacheKey = `neynar:user-info:${fid}`;
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const response = await this.request<{ users: any[] }>(
        '/farcaster/user/bulk',
        { fids: fid.toString() }
      );

      if (!response.users?.length) return null;

      const user = response.users[0];
      const result = {
        fid: user.fid,
        username: user.username,
        display_name: user.display_name,
        pfp_url: user.pfp_url,
        follower_count: user.follower_count || 0,
        following_count: user.following_count || 0,
      };

      await cache.set(cacheKey, result, 3600); // Cache for 1 hour
      
      return result;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  /**
   * Normalize Neynar API response to our types
   */
  private normalizeResponse(response: { casts: any[]; next?: { cursor: string } }): NeynarFeedResponse {
    return {
      casts: response.casts.map(this.normalizeCast),
      next: response.next,
    };
  }

  /**
   * Normalize a single cast object
   */
  private normalizeCast(cast: any): NeynarCast {
    return {
      hash: cast.hash,
      parent_hash: cast.parent_hash,
      parent_url: cast.parent_url,
      root_parent_url: cast.root_parent_url,
      parent_author: cast.parent_author,
      author: {
        fid: cast.author.fid,
        username: cast.author.username,
        display_name: cast.author.display_name,
        pfp_url: cast.author.pfp_url,
        follower_count: cast.author.follower_count,
        following_count: cast.author.following_count,
      },
      text: cast.text,
      timestamp: cast.timestamp,
      embeds: cast.embeds || [],
      reactions: {
        likes_count: cast.reactions?.likes_count || 0,
        recasts_count: cast.reactions?.recasts_count || 0,
      },
      replies: {
        count: cast.replies?.count || 0,
      },
      channel: cast.channel ? {
        id: cast.channel.id,
        name: cast.channel.name,
      } : undefined,
      mentioned_profiles: cast.mentioned_profiles?.map((p: any) => ({
        fid: p.fid,
        username: p.username,
        display_name: p.display_name,
        pfp_url: p.pfp_url,
      })),
    };
  }
}

// Export singleton instance
export const neynarService = new NeynarService();
export default neynarService;

