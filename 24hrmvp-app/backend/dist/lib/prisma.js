"use strict";
/**
 * Prisma Client Singleton Pattern
 *
 * CRITICAL: This pattern prevents connection pool exhaustion under load.
 * Without this, each module import creates a new PrismaClient instance,
 * quickly exhausting the PostgreSQL connection limit.
 *
 * @see https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.isDatabaseHealthy = isDatabaseHealthy;
exports.disconnectPrisma = disconnectPrisma;
exports.getConnectionMetrics = getConnectionMetrics;
const client_1 = require("@prisma/client");
// Configuration based on environment
const prismaClientOptions = {
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
};
/**
 * Singleton Prisma Client Instance
 *
 * In development: Reuses the same instance across hot reloads
 * In production: Creates a single instance for the application lifecycle
 */
exports.prisma = globalThis.prisma || new client_1.PrismaClient(prismaClientOptions);
// In development, store in global to survive hot reloads
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = exports.prisma;
}
/**
 * Health check query - used by /health endpoint
 * Returns true if database is accessible
 */
async function isDatabaseHealthy() {
    try {
        await exports.prisma.$queryRaw `SELECT 1`;
        return true;
    }
    catch (error) {
        console.error('[Prisma] Health check failed:', error);
        return false;
    }
}
/**
 * Graceful disconnect - call during shutdown
 */
async function disconnectPrisma() {
    try {
        await exports.prisma.$disconnect();
        console.log('[Prisma] Disconnected successfully');
    }
    catch (error) {
        console.error('[Prisma] Error during disconnect:', error);
        throw error;
    }
}
/**
 * Connection pool statistics (for monitoring)
 * Note: Prisma doesn't expose direct pool stats, so we track query metrics
 */
async function getConnectionMetrics() {
    const start = Date.now();
    const isHealthy = await isDatabaseHealthy();
    const responseTimeMs = Date.now() - start;
    return {
        isHealthy,
        responseTimeMs,
    };
}
exports.default = exports.prisma;
//# sourceMappingURL=prisma.js.map