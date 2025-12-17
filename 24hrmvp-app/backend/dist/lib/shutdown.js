"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCleanup = registerCleanup;
exports.setupGracefulShutdown = setupGracefulShutdown;
exports.isShutdownInProgress = isShutdownInProgress;
const logger_1 = require("./logger");
// Track shutdown state to prevent duplicate handling
let isShuttingDown = false;
// Registry of cleanup functions to run on shutdown
const cleanupFunctions = [];
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
function registerCleanup(fn) {
    cleanupFunctions.push(fn);
}
/**
 * Execute all registered cleanup functions
 * Runs with timeout protection
 */
async function runCleanup() {
    const startTime = Date.now();
    for (const cleanup of cleanupFunctions) {
        try {
            // Check if we're running out of time
            const elapsed = Date.now() - startTime;
            const remaining = SHUTDOWN_TIMEOUT_MS - elapsed;
            if (remaining <= 100) {
                logger_1.logger.warn('Shutdown timeout approaching, skipping remaining cleanup');
                break;
            }
            // Run cleanup with individual timeout
            await Promise.race([
                cleanup(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Cleanup timeout')), remaining - 100)),
            ]);
        }
        catch (error) {
            logger_1.logger.warn({ error }, 'Cleanup function failed');
            // Continue with other cleanup functions
        }
    }
}
/**
 * Handle shutdown signal
 */
async function handleShutdown(signal, server) {
    // Prevent duplicate shutdown handling
    if (isShuttingDown) {
        logger_1.logger.warn({ signal }, 'Shutdown already in progress, ignoring signal');
        return;
    }
    isShuttingDown = true;
    logger_1.logger.info({ signal, timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Graceful shutdown initiated');
    // Set a hard timeout for the entire shutdown process
    const shutdownTimeout = setTimeout(() => {
        logger_1.logger.error('Shutdown timeout exceeded, forcing exit');
        process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    try {
        // 1. Stop accepting new connections
        logger_1.logger.info('Closing HTTP server...');
        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    // ECONNRESET errors are expected during shutdown
                    if (err.code === 'ECONNRESET') {
                        resolve();
                    }
                    else {
                        reject(err);
                    }
                }
                else {
                    resolve();
                }
            });
        });
        logger_1.logger.info('HTTP server closed');
        // 2. Run registered cleanup functions
        logger_1.logger.info('Running cleanup functions...');
        await runCleanup();
        logger_1.logger.info('Cleanup complete');
        // 3. Clear the timeout and exit cleanly
        clearTimeout(shutdownTimeout);
        logger_1.logger.info('Shutdown complete, exiting');
        process.exit(0);
    }
    catch (error) {
        logger_1.logger.error({ error }, 'Error during shutdown');
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
function setupGracefulShutdown(server) {
    // Handle SIGTERM (Railway, Docker, Kubernetes)
    process.on('SIGTERM', () => handleShutdown('SIGTERM', server));
    // Handle SIGINT (Ctrl+C in terminal)
    process.on('SIGINT', () => handleShutdown('SIGINT', server));
    // Handle uncaught exceptions - log and exit
    process.on('uncaughtException', (error) => {
        logger_1.logger.fatal({ error }, 'Uncaught exception');
        // Don't try graceful shutdown - just exit
        process.exit(1);
    });
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        logger_1.logger.error({ reason, promise }, 'Unhandled promise rejection');
        // Don't exit - Sentry will capture this
    });
    logger_1.logger.info({ timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Graceful shutdown handlers registered');
}
/**
 * Check if shutdown is in progress
 * Useful for health checks to return unhealthy during shutdown
 */
function isShutdownInProgress() {
    return isShuttingDown;
}
exports.default = {
    registerCleanup,
    setupGracefulShutdown,
    isShutdownInProgress,
};
//# sourceMappingURL=shutdown.js.map