import { User, Idea, Vote, VotingCycle, MVPProject } from '@prisma/client';

export type { User, Idea, Vote, VotingCycle, MVPProject };

export interface AuthenticatedRequest extends Request {
  user?: {
    fid: number;
    userId: string;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface IdeaFilters {
  status?: string;
  category?: string;
  votingCycleId?: string;
}

export interface CreateIdeaDto {
  title: string;
  description: string;
  category: string;
  complexity: string;
  attachments?: string[];
}

export interface CastVoteDto {
  ideaId: string;
}

export interface QuickAuthPayload {
  sub: string; // FID as string
  username: string;
  displayName?: string;
  pfpUrl?: string;
  custody?: string;
  verifications?: string[];
}
