import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { prisma } from './db/client';

// Import routes
import ideaRoutes from './routes/ideas';
import voteRoutes from './routes/votes';
import votingCycleRoutes from './routes/votingCycles';
import leaderboardRoutes from './routes/leaderboard';
import mvpRoutes from './routes/mvp';
import webhookRoutes from './routes/webhook';
import authRoutes from './routes/auth';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// ============================================
// Middleware Stack
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Health Check
// ============================================

app.get('/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: 'disconnected',
    });
  }
});

// ============================================
// API Routes
// ============================================

app.use('/api/auth', authRoutes);
app.use('/api/ideas', ideaRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/voting-cycles', votingCycleRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/mvp', mvpRoutes);
app.use('/api/webhook', webhookRoutes);

// ============================================
// Error Handling
// ============================================

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ============================================
// Server Startup
// ============================================

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.info('✓ Database connected');

    app.listen(PORT, () => {
      console.info(`✓ Server running on http://localhost:${PORT}`);
      console.info(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.info(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.info('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

// Import payment routes
import paymentRoutes from './routes/payment';

// Add payment routes
app.use('/api/payment', paymentRoutes);
