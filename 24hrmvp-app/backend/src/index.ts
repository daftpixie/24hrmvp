// ============================================
// 24HRMVP - MAIN SERVER ENTRY POINT (PRODUCTION READY)
// File: backend/src/index.ts
// 
// UPDATED: Removed /api/chat (moved to /api/grid/chat)
// ============================================

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables FIRST
dotenv.config();

// ============================================
// INITIALIZE SENTRY - Before other imports that might throw
// ============================================
import { initializeSentry, sentryRequestHandler, sentryErrorHandler, flushSentry } from './lib/sentry';
initializeSentry();

// ============================================
// CORE IMPORTS
// ============================================
import { logger, createHttpLogger } from './lib/logger';
import { setupGracefulShutdown, registerCleanup } from './lib/shutdown';
import { initWebSocket } from './services/websocket';

// ============================================
// INITIALIZE PRISMA - Exported for routes
// ============================================
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// ============================================
// MIDDLEWARE IMPORTS
// ============================================
import {
  helmetMiddleware,
  additionalSecurityHeaders,
  requestSizeLimits
} from './middleware/security';

import {
  generalLimiter,
  authLimiter,
  voteLimiter,
  chatLimiter,
  forumPostLimiter,
  ideaLimiter,
  paymentLimiter
} from './middleware/rateLimiter';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ============================================
// ROUTE IMPORTS - Core 24HRMVP
// ============================================
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import walletAuthRoutes from './routes/wallet-auth';
import ideasRoutes from './routes/ideas';
import votesRoutes from './routes/votes';
import votesEnhancedRoutes from './routes/votes-enhanced';
import votePurchaseRoutes from './routes/vote-purchase';
import votingCyclesRoutes from './routes/votingCycles';
import usersRoutes from './routes/users';
import webhookRoutes from './routes/webhook';

// ============================================
// ROUTE IMPORTS - THE GRID Phase 1-4
// ============================================
import gridRoutes from './routes/grid';
import leaderboardRoutes from './routes/leaderboard';
import livestreamRoutes from './routes/livestream.routes';

// NOTE: Chat routes are now mounted under /api/grid/chat via gridRoutes

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
    logger.error({ missing }, 'Missing required environment variables');
  }
}

if (!process.env.REFRESH_SECRET) {
  logger.warn('REFRESH_SECRET not set - using fallback secret');
}

if (!process.env.REDIS_URL) {
  logger.info('REDIS_URL not set - using Prisma for nonce storage');
}

// ============================================
// EXPRESS APP INITIALIZATION
// ============================================
const app = express();

// Trust proxy - REQUIRED for Railway, rate limiting by real IP
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARE STACK (ORDER MATTERS!)
// ============================================

// 1. Sentry request handler - must be first
app.use(sentryRequestHandler());

// 2. HTTP request logging with Pino
app.use(createHttpLogger());

// 3. Security middleware
app.use(helmetMiddleware);

// EXPLICIT CORS CONFIGURATION
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'https://24hrmvp.xyz',
  'https://www.24hrmvp.xyz'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Internal-Request'],
}));

app.use(additionalSecurityHeaders);

// 4. Raw body for Stripe webhooks (MUST be before express.json())
app.use('/api/vote-purchase/webhook/stripe', express.raw({ type: 'application/json' }));

// 5. Body parsing with size limits
app.use(express.json({ limit: requestSizeLimits.json }));
app.use(express.urlencoded({ extended: true, limit: requestSizeLimits.urlencoded }));

// 6. Static file serving for uploads
app.use('/uploads', express.static(process.env.UPLOAD_DIR || '/tmp/uploads'));

// 7. General rate limiting
app.use(generalLimiter);

// ============================================
// ROUTES - Health (No auth, bypasses rate limit)
// ============================================
app.use('/health', healthRoutes);

// ============================================
// ROUTES - Core 24HRMVP
// ============================================

// Auth routes with stricter rate limiting
app.use('/api/auth', authLimiter, authRoutes);

// SIWE Wallet Authentication Routes
app.use('/api/auth/wallet', authLimiter, walletAuthRoutes);

// Ideas routes
app.use('/api/ideas', ideasRoutes);

// Voting routes
app.use('/api/votes', votesRoutes);
app.use('/api/votes', votesEnhancedRoutes);

// Vote purchase routes
app.use('/api/vote-purchase', paymentLimiter, votePurchaseRoutes);

// Voting cycles
app.use('/api/cycles', votingCyclesRoutes);

// User profiles
app.use('/api/users', usersRoutes);

// Webhooks
app.use('/api/webhook', webhookRoutes);

// ============================================
// ROUTES - THE GRID Phase 1-4
// ============================================

// Grid routes (includes /forum, /social, /moderation, /chat)
app.use('/api/grid', gridRoutes);

// Leaderboard
app.use('/api/leaderboard', leaderboardRoutes);

// Livestreaming
app.use('/api/live', livestreamRoutes);

// ============================================
// ERROR HANDLING (Must be last)
// ============================================

// 404 Handler
app.use(notFoundHandler);

// Sentry Error Handler
app.use(sentryErrorHandler());

// Global Error Handler
app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const server = createServer(app);

// Initialize WebSocket Server
const io = initWebSocket(server);
logger.info('WebSocket server initialized');

// Only start server if file is run directly
if (require.main === module) {
  server.listen(PORT, () => {
    logger.info(`
    🚀 Server ready at http://localhost:${PORT}
    ⭐ Environment: ${NODE_ENV}
    📌 WebSocket: Enabled
    🔐 SIWE Auth: Enabled
    💬 Chat: /api/grid/chat
    📋 Forum: /api/grid/forum
    `);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    switch (error.code) {
      case 'EACCES':
        logger.fatal({ port: PORT }, 'Port requires elevated privileges');
        process.exit(1);
        break;
      case 'EADDRINUSE':
        logger.fatal({ port: PORT }, 'Port is already in use');
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // Setup graceful shutdown
  setupGracefulShutdown(server);
}

// Export for testing
export default app;
