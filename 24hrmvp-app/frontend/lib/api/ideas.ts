// ============================================
// 24HRMVP - IDEAS API
// File: frontend/lib/api/ideas.ts
// API client for ideas endpoints
// ============================================

import { get, post, put, del, ApiError } from './client';

// ============================================
// TYPES
// ============================================

export interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  complexity: string;
  status: 'pending' | 'approved' | 'rejected' | 'winner' | 'building' | 'completed';
  voteCount: number;
  userId: string;
  votingCycleId: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    displayName?: string;
    pfpUrl?: string;
  };
  _count?: {
    votes: number;
    comments: number;
  };
}

export interface IdeasResponse {
  success: boolean;
  ideas: Idea[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IdeaResponse {
  success: boolean;
  idea: Idea;
}

export interface CreateIdeaInput {
  title: string;
  description: string;
  category: string;
  complexity?: string;
}

export interface UpdateIdeaInput {
  title?: string;
  description?: string;
  category?: string;
  complexity?: string;
  status?: string;
}

export interface IdeasQueryParams {
  status?: string;
  category?: string;
  sortBy?: 'voteCount' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  page?: number;
  votingCycleId?: string;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Get all ideas with optional filters
 */
export async function getIdeas(params?: IdeasQueryParams): Promise<IdeasResponse> {
  const queryParams = new URLSearchParams();
  
  if (params) {
    if (params.status) queryParams.set('status', params.status);
    if (params.category) queryParams.set('category', params.category);
    if (params.sortBy) queryParams.set('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
    if (params.limit) queryParams.set('limit', params.limit.toString());
    if (params.page) queryParams.set('page', params.page.toString());
    if (params.votingCycleId) queryParams.set('votingCycleId', params.votingCycleId);
  }
  
  const query = queryParams.toString();
  const endpoint = query ? `/api/ideas?${query}` : '/api/ideas';
  
  try {
    return await get<IdeasResponse>(endpoint);
  } catch (error) {
    console.error('Failed to fetch ideas:', error);
    throw error;
  }
}

/**
 * Get a single idea by ID
 */
export async function getIdea(id: string): Promise<IdeaResponse> {
  try {
    return await get<IdeaResponse>(`/api/ideas/${id}`);
  } catch (error) {
    console.error('Failed to fetch idea:', error);
    throw error;
  }
}

/**
 * Create a new idea
 */
export async function createIdea(data: CreateIdeaInput): Promise<IdeaResponse> {
  try {
    return await post<IdeaResponse>('/api/ideas', data, true);
  } catch (error) {
    console.error('Failed to create idea:', error);
    throw error;
  }
}

/**
 * Update an existing idea
 */
export async function updateIdea(id: string, data: UpdateIdeaInput): Promise<IdeaResponse> {
  try {
    return await put<IdeaResponse>(`/api/ideas/${id}`, data, true);
  } catch (error) {
    console.error('Failed to update idea:', error);
    throw error;
  }
}

/**
 * Delete an idea
 */
export async function deleteIdea(id: string): Promise<{ success: boolean }> {
  try {
    return await del<{ success: boolean }>(`/api/ideas/${id}`, true);
  } catch (error) {
    console.error('Failed to delete idea:', error);
    throw error;
  }
}

/**
 * Get top voted ideas (for rankings)
 */
export async function getTopIdeas(limit: number = 5): Promise<IdeasResponse> {
  return getIdeas({
    status: 'approved',
    sortBy: 'voteCount',
    sortOrder: 'desc',
    limit,
  });
}

/**
 * Get ideas for the current voting cycle
 */
export async function getCurrentCycleIdeas(): Promise<IdeasResponse> {
  return getIdeas({
    status: 'approved',
    sortBy: 'voteCount',
    sortOrder: 'desc',
  });
}

// ============================================
// EXPORTS
// ============================================

export default {
  getIdeas,
  getIdea,
  createIdea,
  updateIdea,
  deleteIdea,
  getTopIdeas,
  getCurrentCycleIdeas,
};
