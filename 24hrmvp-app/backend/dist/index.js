"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const client_1 = require("@prisma/client");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables FIRST
dotenv_1.default.config();
// ============================================
// INITIALIZE SENTRY - Before other imports that might throw
// ============================================
const sentry_1 = require("./lib/sentry");
(0, sentry_1.initializeSentry)();
// ============================================
// CORE IMPORTS
// ============================================
const logger_1 = require("./lib/logger");
const shutdown_1 = require("./lib/shutdown");
const websocket_1 = require("./services/websocket");
// ============================================
// INITIALIZE PRISMA - Exported for routes (no change to existing pattern)
// ============================================
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
// ============================================
// MIDDLEWARE IMPORTS
// ============================================
const security_1 = require("./middleware/security");
const rateLimiter_1 = require("./middleware/rateLimiter");
const errorHandler_1 = require("./middleware/errorHandler");
// ============================================
// ROUTE IMPORTS - Core 24HRMVP
// ============================================
const health_1 = __importDefault(require("./routes/health"));
const auth_1 = __importDefault(require("./routes/auth"));
const ideas_1 = __importDefault(require("./routes/ideas"));
const votes_1 = __importDefault(require("./routes/votes"));
const votes_enhanced_1 = __importDefault(require("./routes/votes-enhanced"));
const vote_purchase_1 = __importDefault(require("./routes/vote-purchase"));
const votingCycles_1 = __importDefault(require("./routes/votingCycles"));
const users_1 = __importDefault(require("./routes/users"));
const webhook_1 = __importDefault(require("./routes/webhook"));
// ============================================
// ROUTE IMPORTS - THE GRID Phase 1-4
// ============================================
const grid_1 = __importDefault(require("./routes/grid"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const livestream_routes_1 = __importDefault(require("./routes/livestream.routes"));
// ============================================
// CONFIGURATION
// ============================================
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
// Validate critical environment variables
if (NODE_ENV === 'production') {
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        logger_1.logger.error({ missing }, 'Missing required environment variables');
        // Continue anyway - services may provide defaults
    }
    // Warn about optional but recommended vars
    if (!process.env.REFRESH_SECRET) {
        logger_1.logger.warn('REFRESH_SECRET not set - using fallback secret');
    }
    if (!process.env.REDIS_URL) {
        logger_1.logger.info('REDIS_URL not set - using Prisma for nonce storage');
    }
}
// ============================================
// EXPRESS APP INITIALIZATION
// ============================================
const app = (0, express_1.default)();
// Trust proxy - REQUIRED for Railway, rate limiting by real IP
app.set('trust proxy', 1);
// ============================================
// MIDDLEWARE STACK (ORDER MATTERS!)
// ============================================
// 1. Sentry request handler - must be first to capture all requests
app.use((0, sentry_1.sentryRequestHandler)());
// 2. HTTP request logging with Pino
app.use((0, logger_1.createHttpLogger)());
// 3. Security middleware - Helmet + CORS for Mini Apps
app.use(security_1.helmetMiddleware);
app.use(security_1.corsMiddleware);
app.use(security_1.additionalSecurityHeaders);
// 4. Raw body for Stripe webhooks (MUST be before express.json())
app.use('/api/vote-purchase/webhook/stripe', express_1.default.raw({ type: 'application/json' }));
// 5. Body parsing with size limits
app.use(express_1.default.json({ limit: security_1.requestSizeLimits.json }));
app.use(express_1.default.urlencoded({ extended: true, limit: security_1.requestSizeLimits.urlencoded }));
// 6. Static file serving for uploads
app.use('/uploads', express_1.default.static(process.env.UPLOAD_DIR || '/tmp/uploads'));
// 7. General rate limiting (applied to all routes except health)
app.use(rateLimiter_1.generalLimiter);
// ============================================
// ROUTES - Health (No auth, bypasses rate limit)
// ============================================
app.use('/health', health_1.default);
// ============================================
// ROUTES - Core 24HRMVP
// ============================================
// Auth routes with stricter rate limiting
app.use('/api/auth', rateLimiter_1.authLimiter, auth_1.default);
// Ideas routes with submission rate limiting
app.use('/api/ideas', ideas_1.default); // Auth handled in route, ideaLimiter on POST
// Voting routes with vote-specific rate limiting
app.use('/api/votes', votes_1.default);
app.use('/api/votes', votes_enhanced_1.default);
// Vote purchase routes with payment rate limiting
app.use('/api/vote-purchase', rateLimiter_1.paymentLimiter, vote_purchase_1.default);
// Voting cycles
app.use('/api/cycles', votingCycles_1.default);
// Users
app.use('/api/users', users_1.default);
// Webhooks (no rate limiting - external services)
app.use('/api/webhook', webhook_1.default);
// ============================================
// ROUTES - THE GRID (Phase 3A)
// ============================================
// Grid main routes (forum, social, moderation)
app.use('/api/grid', grid_1.default);
// Leaderboard
app.use('/api/leaderboard', leaderboard_1.default);
// Chat with chat-specific rate limiting
app.use('/api/chat', chat_routes_1.default); // chatLimiter applied per-endpoint in route
// ============================================
// ROUTES - Livestreaming (Phase 4)
// ============================================
app.use('/api/livestream', livestream_routes_1.default);
app.use('/api/webhook/castr', livestream_routes_1.default);
// ============================================
// API INFO ENDPOINT
// ============================================
app.get('/api', (req, res) => {
    res.json({
        success: true,
        name: '24HRMVP API',
        version: '2.1.0-beta',
        description: '24-Hour MVP Development Platform with The Grid Community Hub',
        environment: NODE_ENV,
        features: {
            core: { status: 'operational', version: 'Phase 5' },
            grid: { status: 'operational', version: 'Phase 3A' },
            livestream: { status: 'operational', version: 'Phase 4' },
            votePurchase: { status: 'operational', version: 'Phase 5' },
            multichainAuth: { status: 'operational', version: 'Phase 6' }, // NEW
        },
        authentication: {
            providers: ['farcaster', 'siwe', 'siws'],
            supportedChains: {
                evm: [1, 8453, 137, 42161, 10],
                solana: true,
            },
        },
        health: '/health',
        documentation: 'https://24hrmvp.xyz/docs',
    });
});
// ============================================
// ERROR HANDLING (Must be LAST)
// ============================================
// 404 handler for undefined routes
app.use(errorHandler_1.notFoundHandler);
// Sentry error handler - captures errors before our handler
app.use((0, sentry_1.sentryErrorHandler)());
// Main error handler
app.use(errorHandler_1.errorHandler);
// ============================================
// SERVER INITIALIZATION
// ============================================
// Create HTTP server for WebSocket support
const httpServer = (0, http_1.createServer)(app);
// Initialize WebSocket for real-time features
(0, websocket_1.initWebSocket)(httpServer);
// Register cleanup functions for graceful shutdown
(0, shutdown_1.registerCleanup)(async () => {
    logger_1.logger.info('Flushing Sentry events...');
    await (0, sentry_1.flushSentry)(2000);
});
(0, shutdown_1.registerCleanup)(async () => {
    logger_1.logger.info('Disconnecting Prisma...');
    await exports.prisma.$disconnect();
});
// Setup graceful shutdown handlers
(0, shutdown_1.setupGracefulShutdown)(httpServer);
// Start server
httpServer.listen(PORT, () => {
    logger_1.logger.info({
        port: PORT,
        environment: NODE_ENV,
        nodeVersion: process.version,
    }, '🚀 24HRMVP API server started');
    // Log feature status
    logger_1.logger.info({
        features: {
            core: 'enabled',
            grid: 'Phase 3A',
            livestream: 'Phase 4',
            votePurchase: 'Phase 5',
            multichainAuth: 'Phase 6 (EVM + Solana)', // NEW
        },
        monitoring: {
            sentry: !!process.env.SENTRY_DSN,
            healthCheck: '/health',
        },
        auth: {
            farcaster: true,
            siwe: true,
            siws: true,
            redis: !!process.env.REDIS_URL,
        },
    }, 'Features enabled');
    // Development logging
    if (NODE_ENV !== 'production') {
        console.log(`
🚀 24HRMVP API Server Started
   Port: ${PORT}
   Environment: ${NODE_ENV}
   Health: http://localhost:${PORT}/health
   API Info: http://localhost:${PORT}/api

   Core Endpoints:
     Ideas:       /api/ideas
     Votes:       /api/votes + /api/votes/enhanced
     Vote Shop:   /api/vote-purchase
     Cycles:      /api/cycles

   Authentication:
     Farcaster:   /api/auth/verify, /api/auth/me
     Wallet Auth: /api/auth/wallet/nonce
                  /api/auth/wallet/verify/siwe
                  /api/auth/wallet/verify/siws
                  /api/auth/wallet/link
                  /api/auth/wallet/refresh

   Grid Endpoints:
     Forum:       /api/grid/forum
     Social:      /api/grid/social
     Chat:        /api/chat
     Leaderboard: /api/leaderboard

   Livestream:
     Streams:     /api/livestream
     Webhook:     /api/webhook/castr

   Monitoring:
     Sentry:      ${process.env.SENTRY_DSN ? 'Enabled' : 'Disabled'}
     Logging:     Pino (structured JSON)
     Redis:       ${process.env.REDIS_URL ? 'Connected' : 'Not configured (using Prisma for nonces)'}
`);
    }
});
// Handle server startup errors
httpServer.on('error', (error) => {
    if (error.syscall !== 'listen') {
        throw error;
    }
    switch (error.code) {
        case 'EACCES':
            logger_1.logger.fatal({ port: PORT }, 'Port requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            logger_1.logger.fatal({ port: PORT }, 'Port is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
});
// Export for testing
exports.default = app;
//# sourceMappingURL=index.js.map