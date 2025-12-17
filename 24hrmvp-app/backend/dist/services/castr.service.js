"use strict";
// ============================================================================
// 24HRMVP Phase 4: Castr API Service
// backend/src/services/castr.service.ts
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.castrService = void 0;
const livestream_types_1 = require("../types/livestream.types");
// Castr API Configuration
const CASTR_API_BASE = 'https://api.castr.com/v2';
const CASTR_API_TOKEN = process.env.CASTR_API_TOKEN || '';
// Platform-specific RTMP templates
const PLATFORM_RTMP_TEMPLATES = {
    youtube: {
        url: 'rtmp://a.rtmp.youtube.com/live2',
        instructions: 'Get stream key from YouTube Studio > Go Live > Stream',
    },
    twitch: {
        url: 'rtmp://live.twitch.tv/app',
        instructions: 'Get stream key from Twitch Dashboard > Settings > Stream',
    },
    twitter: {
        url: '', // Custom per user from X Media Studio
        instructions: 'Create broadcast in X Media Studio > Sources > RTMP',
    },
    pumpfun: {
        url: '', // Custom per token from Pump.fun
        instructions: 'Start livestream on your token page > Get RTMP credentials',
    },
};
class CastrService {
    headers;
    constructor() {
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CASTR_API_TOKEN}`,
        };
    }
    /**
     * Create a new livestream on Castr
     */
    async createStream(name, options) {
        const response = await fetch(`${CASTR_API_BASE}/live_streams`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                name,
                enabled: true,
                settings: {
                    abr: options?.enableABR ?? false,
                    cloud_recording: options?.enableRecording ?? true,
                },
            }),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Castr API error: ${response.status} - ${error.message || 'Unknown error'}`);
        }
        return response.json();
    }
    /**
     * Get stream details
     */
    async getStream(streamId) {
        const response = await fetch(`${CASTR_API_BASE}/live_streams/${streamId}`, {
            method: 'GET',
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to get stream: ${response.status}`);
        }
        return response.json();
    }
    /**
     * Delete a stream
     */
    async deleteStream(streamId) {
        const response = await fetch(`${CASTR_API_BASE}/live_streams/${streamId}`, {
            method: 'DELETE',
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to delete stream: ${response.status}`);
        }
    }
    /**
     * Add a destination to a stream (for multistreaming)
     */
    async addDestination(streamId, platform, name, rtmpUrl, streamKey) {
        // For known platforms, use Castr's built-in integration
        // For custom RTMP (Pump.fun, etc.), use custom destination
        const isCustom = platform === livestream_types_1.StreamPlatform.PUMPFUN || platform === livestream_types_1.StreamPlatform.CUSTOM;
        const body = isCustom
            ? {
                name,
                platform: 'custom',
                rtmp_url: rtmpUrl,
                stream_key: streamKey,
                enabled: true,
            }
            : {
                name,
                platform: platform,
                stream_key: streamKey,
                enabled: true,
            };
        const response = await fetch(`${CASTR_API_BASE}/live_streams/${streamId}/destinations`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(`Failed to add destination: ${error.message || String(response.status)}`);
        }
        return response.json();
    }
    /**
     * Remove a destination from a stream
     */
    async removeDestination(streamId, destinationId) {
        const response = await fetch(`${CASTR_API_BASE}/live_streams/${streamId}/destinations/${destinationId}`, {
            method: 'DELETE',
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to remove destination: ${response.status}`);
        }
    }
    /**
     * Enable/disable a destination
     */
    async toggleDestination(streamId, destinationId, enabled) {
        const response = await fetch(`${CASTR_API_BASE}/live_streams/${streamId}/destinations/${destinationId}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify({ enabled }),
        });
        if (!response.ok) {
            throw new Error(`Failed to toggle destination: ${response.status}`);
        }
        return response.json();
    }
    /**
     * Get all destinations for a stream
     */
    async getDestinations(streamId) {
        const response = await fetch(`${CASTR_API_BASE}/live_streams/${streamId}/destinations`, {
            method: 'GET',
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to get destinations: ${response.status}`);
        }
        const data = await response.json();
        return data.destinations || [];
    }
    /**
     * Get stream status/health
     */
    async getStreamStatus(streamId) {
        const response = await fetch(`${CASTR_API_BASE}/live_streams/${streamId}/status`, {
            method: 'GET',
            headers: this.headers,
        });
        if (!response.ok) {
            throw new Error(`Failed to get stream status: ${response.status}`);
        }
        const data = await response.json();
        return {
            isLive: data.status === 'live',
            status: data.status,
            viewerCount: data.viewer_count,
            bitrate: data.bitrate,
            fps: data.fps,
        };
    }
    /**
     * Get recordings for a stream
     */
    async getRecordings(streamId) {
        const response = await fetch(`${CASTR_API_BASE}/live_streams/${streamId}/recordings`, {
            method: 'GET',
            headers: this.headers,
        });
        if (!response.ok) {
            return [];
        }
        const data = await response.json();
        return (data.recordings || []).map((rec) => ({
            id: rec._id,
            duration: rec.duration,
            size: rec.size,
            createdAt: rec.created_at,
            url: rec.url,
        }));
    }
    /**
     * Verify webhook signature
     */
    verifyWebhookSignature(payload, signature) {
        const crypto = require('crypto');
        const secret = process.env.CASTR_WEBHOOK_SECRET || '';
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
    /**
     * Get platform RTMP template info
     */
    getPlatformInfo(platform) {
        return PLATFORM_RTMP_TEMPLATES[platform] || null;
    }
    /**
     * Check if Castr API is configured
     */
    isConfigured() {
        return !!CASTR_API_TOKEN;
    }
}
// Export singleton instance
exports.castrService = new CastrService();
exports.default = exports.castrService;
//# sourceMappingURL=castr.service.js.map