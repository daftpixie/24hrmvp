"use strict";
/**
 * Health Check Routes
 *
 * Provides health endpoints for:
 * - Railway deployment checks
 * - UptimeRobot monitoring
 * - Load balancer health probes
 *
 * Endpoints:
 * - GET /health - Basic health check
 * - GET /health/live - Liveness probe
 * - GET /health/ready - Readiness probe (checks database)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("../index");
const shutdown_1 = require("../lib/shutdown");
const router = (0, express_1.Router)();
// Track server start time for uptime calculation
const startTime = Date.now();
/**
 * GET /health
 * Basic health check - returns server status
 * Used by UptimeRobot and basic monitoring
 */
router.get('/', async (_req, res) => {
    // Return unhealthy during shutdown
    if ((0, shutdown_1.isShutdownInProgress)()) {
        res.status(503).json({
            status: 'shutting_down',
            timestamp: new Date().toISOString(),
        });
        return;
    }
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0-beta',
        features: {
            grid: 'enabled',
            livestream: 'enabled',
            votePurchase: 'enabled',
        },
    });
});
/**
 * GET /health/live
 * Liveness probe - is the server process running?
 * Used by Kubernetes/Railway to determine if container should be restarted
 */
router.get('/live', (_req, res) => {
    // Return unhealthy during shutdown
    if ((0, shutdown_1.isShutdownInProgress)()) {
        res.status(503).json({ status: 'shutting_down' });
        return;
    }
    res.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
    });
});
/**
 * GET /health/ready
 * Readiness probe - is the server ready to accept traffic?
 * Checks database connectivity
 * Used by load balancers to route traffic only to healthy instances
 */
router.get('/ready', async (_req, res) => {
    // Return not ready during shutdown
    if ((0, shutdown_1.isShutdownInProgress)()) {
        res.status(503).json({
            status: 'shutting_down',
            ready: false,
        });
        return;
    }
    const checks = {};
    // Check database connectivity
    const dbStart = Date.now();
    try {
        await index_1.prisma.$queryRaw `SELECT 1`;
        checks.database = {
            status: 'ok',
            latency: Date.now() - dbStart,
        };
    }
    catch (error) {
        checks.database = {
            status: 'error',
            latency: Date.now() - dbStart,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
    // Determine overall status
    const allHealthy = Object.values(checks).every((check) => check.status === 'ok');
    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'ready' : 'not_ready',
        ready: allHealthy,
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        checks,
    });
});
/**
 * GET /health/details
 * Detailed health information - includes memory, dependencies
 * Use for debugging, not for automated health checks
 */
router.get('/details', async (_req, res) => {
    const memoryUsage = process.memoryUsage();
    // Check database
    let dbStatus = 'unknown';
    let dbLatency = 0;
    const dbStart = Date.now();
    try {
        await index_1.prisma.$queryRaw `SELECT 1`;
        dbStatus = 'connected';
        dbLatency = Date.now() - dbStart;
    }
    catch {
        dbStatus = 'disconnected';
        dbLatency = Date.now() - dbStart;
    }
    res.json({
        status: (0, shutdown_1.isShutdownInProgress)() ? 'shutting_down' : 'ok',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0-beta',
        node: {
            version: process.version,
            platform: process.platform,
            arch: process.arch,
        },
        memory: {
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
            rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
            external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
        },
        dependencies: {
            database: {
                status: dbStatus,
                latency: dbLatency + 'ms',
            },
            sentry: {
                enabled: !!process.env.SENTRY_DSN,
            },
        },
        features: {
            core: 'operational',
            grid: 'Phase 3A',
            livestream: 'Phase 4',
            votePurchase: 'Phase 5',
        },
    });
});
exports.default = router;
//# sourceMappingURL=health.js.map