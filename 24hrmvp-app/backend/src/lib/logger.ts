/**
 * Structured Logging with Pino
 * 
 * Production-ready logging with:
 * - JSON output in production (for Railway log explorer)
 * - Pretty output in development
 * - Request ID correlation
 * - Child loggers for different modules
 * 
 * @see https://getpino.io/
 */

import pino from 'pino';
import pinoHttp from 'pino-http';

// Environment configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

/**
 * Base Pino configuration
 */
const baseConfig: pino.LoggerOptions = {
  level: LOG_LEVEL,
  
  // Add timestamp to all logs
  timestamp: pino.stdTimeFunctions.isoTime,
  
  // Base context added to all logs
  base: {
    env: NODE_ENV,
    service: '24hrmvp-api',
  },
  
  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
    ],
    remove: true,
  },
};

/**
 * Development-specific configuration with pretty printing
 */
const devConfig: pino.LoggerOptions = {
  ...baseConfig,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname,env,service',
      singleLine: false,
    },
  },
};

/**
 * Production configuration - JSON output
 */
const prodConfig: pino.LoggerOptions = {
  ...baseConfig,
  // Faster serialization in production
  formatters: {
    level: (label) => ({ level: label }),
  },
};

/**
 * Main logger instance
 */
export const logger = pino(isProduction ? prodConfig : devConfig);

/**
 * Create child logger for specific module
 * 
 * @example
 * const authLogger = createLogger('auth');
 * authLogger.info({ fid: 12345 }, 'User authenticated');
 */
export function createLogger(module: string): pino.Logger {
  return logger.child({ module });
}

/**
 * Pre-configured child loggers for common modules
 */
export const authLogger = createLogger('auth');
export const dbLogger = createLogger('database');
export const wsLogger = createLogger('websocket');
export const apiLogger = createLogger('api');

/**
 * HTTP request logger middleware
 * 
 * Logs all HTTP requests with:
 * - Method, URL, status code
 * - Response time
 * - Request ID correlation
 * 
 * @example
 * app.use(createHttpLogger());
 */
export function createHttpLogger() {
  return pinoHttp({
    logger,
    
    // Generate unique request ID
    genReqId: (req) => {
      return (req.headers['x-request-id'] as string) || 
             `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    // Custom log level based on status code
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    
    // Custom success message
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    
    // Custom error message
    customErrorMessage: (req, res) => {
      return `${req.method} ${req.url} ${res.statusCode}`;
    },
    
    // What to include in request logs
    customProps: (req) => ({
      userFid: (req as any).user?.fid,
    }),
    
    // Skip logging for certain paths
    autoLogging: {
      ignore: (req) => {
        // Don't log health checks (too noisy)
        return req.url === '/health' || (req.url?.startsWith('/health/') ?? false);
      },
    },
    
    // Serialize request (what to log)
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        query: req.query,
        // Don't log body by default (may contain sensitive data)
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
  });
}

export default logger;
