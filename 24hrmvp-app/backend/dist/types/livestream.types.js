"use strict";
// ============================================================================
// 24HRMVP Phase 4: Livestreaming Types
// backend/src/types/livestream.types.ts
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamPlatform = exports.StreamStatus = void 0;
var StreamStatus;
(function (StreamStatus) {
    StreamStatus["DRAFT"] = "DRAFT";
    StreamStatus["SCHEDULED"] = "SCHEDULED";
    StreamStatus["STARTING"] = "STARTING";
    StreamStatus["LIVE"] = "LIVE";
    StreamStatus["ENDING"] = "ENDING";
    StreamStatus["ENDED"] = "ENDED";
    StreamStatus["CANCELLED"] = "CANCELLED";
    StreamStatus["ERROR"] = "ERROR";
})(StreamStatus || (exports.StreamStatus = StreamStatus = {}));
var StreamPlatform;
(function (StreamPlatform) {
    StreamPlatform["YOUTUBE"] = "youtube";
    StreamPlatform["TWITTER"] = "twitter";
    StreamPlatform["TWITCH"] = "twitch";
    StreamPlatform["PUMPFUN"] = "pumpfun";
    StreamPlatform["CUSTOM"] = "custom";
})(StreamPlatform || (exports.StreamPlatform = StreamPlatform = {}));
//# sourceMappingURL=livestream.types.js.map