// ============================================================================
// 24HRMVP Phase 4: Livestreaming Types
// backend/src/types/livestream.types.ts
// ============================================================================

export enum StreamStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  STARTING = 'STARTING',
  LIVE = 'LIVE',
  ENDING = 'ENDING',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
  ERROR = 'ERROR',
}

export enum StreamPlatform {
  YOUTUBE = 'youtube',
  TWITTER = 'twitter',
  TWITCH = 'twitch',
  PUMPFUN = 'pumpfun',
  CUSTOM = 'custom',
}

export interface StreamDestination {
  platform: StreamPlatform;
  name: string;
  enabled: boolean;
  rtmpUrl?: string;
  streamKey?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'live' | 'error';
  errorMessage?: string;
}

export interface CreateLivestreamInput {
  title: string;
  description?: string;
  scheduledAt?: Date;
  thumbnailUrl?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  allowChat?: boolean;
}

export interface UpdateLivestreamInput {
  title?: string;
  description?: string;
  scheduledAt?: Date;
  thumbnailUrl?: string;
  category?: string;
  tags?: string[];
  isPublic?: boolean;
  allowChat?: boolean;
}

export interface AddDestinationInput {
  platform: StreamPlatform;
  name: string;
  rtmpUrl?: string;
  streamKey?: string;
}

export interface LivestreamWithHost {
  id: string;
  title: string;
  description: string | null;
  status: StreamStatus;
  castrStreamId: string | null;
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  placeholderUrl: string | null;
  destinations: StreamDestination[];
  hostId: string;
  host: {
    id: string;
    username: string;
    displayName: string | null;
    pfpUrl: string | null;
  };
  viewerCount: number;
  peakViewers: number;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number | null;
  chatRoomId: string | null;
  category: string | null;
  tags: string[];
  isPublic: boolean;
  allowChat: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Castr API Types
export interface CastrStreamResponse {
  _id: string;
  name: string;
  enabled: boolean;
  ingest: {
    rtmp: {
      url: string;
      key: string;
    };
    srt?: {
      url: string;
    };
  };
  playback: {
    hls: string;
    dash?: string;
  };
  status: 'offline' | 'online' | 'live';
  settings: {
    abr: boolean;
    cloud_recording: boolean;
  };
  created_at: string;
  updated_at: string;
}

export interface CastrDestinationResponse {
  _id: string;
  name: string;
  platform: string;
  enabled: boolean;
  status: 'connected' | 'disconnected' | 'error';
  rtmp_url?: string;
  stream_key?: string;
}

export interface CastrWebhookPayload {
  event: 'stream.started' | 'stream.stopped' | 'stream.error' | 'destination.connected' | 'destination.disconnected';
  stream_id: string;
  timestamp: string;
  data?: {
    error_message?: string;
    destination_id?: string;
    destination_name?: string;
  };
}

// WebSocket Events
export interface LivestreamSocketEvents {
  'stream:started': { streamId: string; playbackUrl: string };
  'stream:stopped': { streamId: string };
  'stream:viewerJoined': { streamId: string; viewerCount: number };
  'stream:viewerLeft': { streamId: string; viewerCount: number };
  'stream:viewerCount': { streamId: string; count: number };
  'stream:error': { streamId: string; message: string };
  'stream:destinationStatus': { streamId: string; platform: string; status: string };
}
