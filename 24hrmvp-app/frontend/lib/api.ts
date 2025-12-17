// ============================================
// 24HRMVP - API CLIENT (AXIOS)
// File: frontend/lib/api.ts
// Axios-based API client with proper URL handling
// ============================================

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getApiUrl } from './config';

// Get API URL from centralized config
const API_BASE_URL = getApiUrl();

class APIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Important for cookies/session
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.clearToken();
        }
        return Promise.reject(error);
      }
    );

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Client] Initialized with baseURL:', API_BASE_URL);
    }
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  getToken() {
    return this.token;
  }

  // AUTH ENDPOINTS
  async verifyAuth(token: string) {
    this.setToken(token);
    const response = await this.client.post('/api/auth/verify');
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }

  // IDEAS ENDPOINTS
  async getIdeas(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    cycleId?: string;
    sortBy?: string;
  }) {
    const response = await this.client.get('/api/ideas', { params });
    return response.data;
  }

  async getIdea(id: string) {
    const response = await this.client.get(`/api/ideas/${id}`);
    return response.data;
  }

  async createIdea(data: {
    title: string;
    description: string;
    category: string;
    complexity?: string;
    tags?: string[];
  }) {
    const response = await this.client.post('/api/ideas', data);
    return response.data;
  }

  // VOTES ENDPOINTS
  async castVote(ideaId: string) {
    const response = await this.client.post('/api/votes', { ideaId });
    return response.data;
  }

  async getMyVotes() {
    const response = await this.client.get('/api/votes/my-votes');
    return response.data;
  }

  // VOTING CYCLES ENDPOINTS
  async getActiveCycle() {
    const response = await this.client.get('/api/cycles/active');
    return response.data;
  }

  async getCycles(params?: { page?: number; limit?: number }) {
    const response = await this.client.get('/api/cycles', { params });
    return response.data;
  }

  // LEADERBOARD ENDPOINTS
  async getLeaderboard(params?: { type?: string; limit?: number }) {
    const response = await this.client.get('/api/leaderboard', { params });
    return response.data;
  }

  // USERS ENDPOINTS
  async getUser(fid: number) {
    const response = await this.client.get(`/api/users/${fid}`);
    return response.data;
  }

  async getUserIdeas(fid: number, params?: { page?: number; limit?: number }) {
    const response = await this.client.get(`/api/users/${fid}/ideas`, { params });
    return response.data;
  }

  async updateProfile(data: { bio?: string }) {
    const response = await this.client.patch('/api/users/me', data);
    return response.data;
  }
}

export const apiClient = new APIClient();
export default apiClient;
