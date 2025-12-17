/**
 * Graceful Shutdown Handler
 * 
 * Handles SIGTERM/SIGINT signals for clean server shutdown.
 * Critical for Railway which sends SIGKILL after 3 seconds.
 * 
 * Features:
 * - Cleanup function registry
 * - Timeout protection (2.5s default, before Railway's 3s SIGKILL)
 * - Connection draining
 * - Prevents duplicate shutdown
 * 
 * @see https://docs.railway.app/reference/scaling#graceful-shutdown
 */

import type { Server } from 'http';
import { logger } from './logger';

// Track shutdown state to prevent duplicate handling
let isShuttingDown = false;

// Registry of cleanup functions to run on shutdown
const cleanupFunctions: Array<() => Promise<void>> = [];

// Shutdown timeout (Railway sends SIGKILL after 3s, we use 2.5s to be safe)
const SHUTDOWN_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '2500', 10);

/**
 * Register a cleanup function to run during shutdown
 * Functions are run in order of registration
 * 
 * @example
 * registerCleanup(async () => {
 *   await prisma.$disconnect();
 * });
 * 
 * registerCleanup(async () => {
 *   await flushSentry(2000);
 * });
 */
export function registerCleanup(fn: () => Promise<void>): void {
  cleanupFunctions.push(fn);
}

/**
 * Execute all registered cleanup functions
 * Runs with timeout protection
 */
async function runCleanup(): Promise<void> {
  const startTime = Date.now();
  
  for (const cleanup of cleanupFunctions) {
    try {
      // Check if we're running out of time
      const elapsed = Date.now() - startTime;
      const remaining = SHUTDOWN_TIMEOUT_MS - elapsed;
      
      if (remaining <= 100) {
        logger.warn('Shutdown timeout approaching, skipping remaining cleanup');
        break;
      }
      
      // Run cleanup with individual timeout
      await Promise.race([
        cleanup(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Cleanup timeout')), remaining - 100)
        ),
      ]);
    } catch (error) {
      logger.warn({ error }, 'Cleanup function failed');
      // Continue with other cleanup functions
    }
  }
}

/**
 * Handle shutdown signal
 */
async function handleShutdown(signal: string, server: Server): Promise<void> {
  // Prevent duplicate shutdown handling
  if (isShuttingDown) {
    logger.warn({ signal }, 'Shutdown already in progress, ignoring signal');
    return;
  }
  
  isShuttingDown = true;
  logger.info({ signal, timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Graceful shutdown initiated');
  
  // Set a hard timeout for the entire shutdown process
  const shutdownTimeout = setTimeout(() => {
    logger.error('Shutdown timeout exceeded, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  
  try {
    // 1. Stop accepting new connections
    logger.info('Closing HTTP server...');
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) {
          // ECONNRESET errors are expected during shutdown
          if ((err as any).code === 'ECONNRESET') {
            resolve();
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      });
    });
    logger.info('HTTP server closed');
    
    // 2. Run registered cleanup functions
    logger.info('Running cleanup functions...');
    await runCleanup();
    logger.info('Cleanup complete');
    
    // 3. Clear the timeout and exit cleanly
    clearTimeout(shutdownTimeout);
    logger.info('Shutdown complete, exiting');
    process.exit(0);
    
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

/**
 * Setup graceful shutdown handlers
 * Call this after creating your HTTP server
 * 
 * @example
 * const server = createServer(app);
 * setupGracefulShutdown(server);
 * server.listen(PORT);
 */
export function setupGracefulShutdown(server: Server): void {
  // Handle SIGTERM (Railway, Docker, Kubernetes)
  process.on('SIGTERM', () => handleShutdown('SIGTERM', server));
  
  // Handle SIGINT (Ctrl+C in terminal)
  process.on('SIGINT', () => handleShutdown('SIGINT', server));
  
  // Handle uncaught exceptions - log and exit
  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, 'Uncaught exception');
    // Don't try graceful shutdown - just exit
    process.exit(1);
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
    // Don't exit - Sentry will capture this
  });
  
  logger.info({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Graceful shutdown handlers registered');
}

/**
 * Check if shutdown is in progress
 * Useful for health checks to return unhealthy during shutdown
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}

export default {
  registerCleanup,
  setupGracefulShutdown,
  isShutdownInProgress,
};
