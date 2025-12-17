/**
 * Validation Middleware with Zod
 * 
 * Provides type-safe request validation using Zod schemas.
 * All validated data is sanitized and type-checked before reaching handlers.
 * 
 * @see https://zod.dev/
 */

import { z, ZodSchema, ZodError } from 'zod';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// Optional logger import - falls back to console if not installed
let logger: any;
try {
  const loggerModule = require('../lib/logger');
  logger = loggerModule.logger;
} catch {
  logger = { warn: console.warn };
}

/**
 * Validation targets - what part of the request to validate
 */
type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validation options
 */
interface ValidationOptions {
  /** Custom error message prefix */
  errorMessage?: string;
}

/**
 * Create validation middleware for a specific request target
 * 
 * @example
 * const validateBody = validate('body', userSchema);
 * app.post('/users', validateBody, createUser);
 */
export function validate<T extends ZodSchema>(
  target: ValidationTarget,
  schema: T,
  options: ValidationOptions = {}
): RequestHandler {
  const { errorMessage = 'Validation failed' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get the data to validate
      const data = req[target];
      
      // Parse and validate (strip unknown by default)
      const parsed = schema.parse(data);
      
      // Replace request data with validated/sanitized version
      req[target] = parsed;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        logger.warn({ 
          target, 
          errors: formattedErrors,
          path: req.path,
        }, 'Validation failed');
        
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: errorMessage,
            details: formattedErrors,
          },
        });
        return;
      }
      
      // Unexpected error - pass to error handler
      next(error);
    }
  };
}

/**
 * Convenience wrappers for common validation targets
 */
export const validateBody = <T extends ZodSchema>(schema: T, options?: ValidationOptions) =>
  validate('body', schema, options);

export const validateQuery = <T extends ZodSchema>(schema: T, options?: ValidationOptions) =>
  validate('query', schema, options);

export const validateParams = <T extends ZodSchema>(schema: T, options?: ValidationOptions) =>
  validate('params', schema, options);

// ============================================================================
// Common Validation Schemas
// ============================================================================

/**
 * Common field validators
 */
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid(),
  
  // CUID validation (Prisma default)
  cuid: z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format'),
  
  // Generic ID (cuid or uuid)
  id: z.string().min(1, 'ID is required'),
  
  // Farcaster ID (positive integer)
  fid: z.number().int().positive(),
  
  // FID from string (for route params)
  fidString: z.string().regex(/^\d+$/, 'Invalid FID').transform((v) => parseInt(v, 10)),
  
  // Username (alphanumeric, underscores, 3-20 chars)
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  
  // Email
  email: z.string().email(),
  
  // URL
  url: z.string().url(),
  
  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  
  // Sort order
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Date (ISO string)
  dateString: z.string().datetime(),
  
  // Slug (URL-friendly string)
  slug: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
};

/**
 * Pagination query schema
 */
export const paginationSchema = z.object({
  page: commonSchemas.page,
  limit: commonSchemas.limit,
  sortOrder: commonSchemas.sortOrder.optional(),
});

/**
 * ID parameter schema
 */
export const idParamSchema = z.object({
  id: commonSchemas.id,
});

/**
 * FID parameter schema
 */
export const fidParamSchema = z.object({
  fid: commonSchemas.fidString,
});

// ============================================================================
// Feature-Specific Schemas
// ============================================================================

/**
 * Chat message schema
 */
export const chatMessageSchema = z.object({
  roomId: commonSchemas.id,
  content: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long (max 2000 characters)')
    .transform((val) => val.trim()),
});

/**
 * Chat room slug param schema
 */
export const chatRoomSlugSchema = z.object({
  slug: commonSchemas.slug,
});

/**
 * Vote schema
 */
export const voteSchema = z.object({
  ideaId: commonSchemas.id,
});

/**
 * Idea submission schema
 */
export const ideaSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title too long (max 100 characters)')
    .transform((val) => val.trim()),
  description: z.string()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description too long (max 5000 characters)')
    .transform((val) => val.trim()),
  category: z.enum([
    'UTILITY',
    'SOCIAL',
    'GAMING',
    'FINANCE',
    'PRODUCTIVITY',
    'EDUCATION',
    'OTHER',
  ]),
  complexity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

/**
 * Forum post schema
 */
export const forumPostSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title too long (max 200 characters)')
    .transform((val) => val.trim()),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(10000, 'Content too long (max 10000 characters)')
    .transform((val) => val.trim()),
  categoryId: commonSchemas.id.optional(),
  parentId: commonSchemas.id.optional(), // For replies
});

/**
 * Forum post vote schema
 */
export const forumVoteSchema = z.object({
  postId: commonSchemas.id,
  value: z.enum(['1', '-1']).transform((v) => parseInt(v, 10)),
});

/**
 * User profile update schema
 */
export const profileUpdateSchema = z.object({
  displayName: z.string()
    .min(1, 'Display name required')
    .max(50, 'Display name too long')
    .optional(),
  bio: z.string()
    .max(500, 'Bio too long (max 500 characters)')
    .optional(),
}).strict();

/**
 * Search query schema
 */
export const searchSchema = z.object({
  q: z.string()
    .min(2, 'Search query too short')
    .max(100, 'Search query too long')
    .transform((val) => val.trim()),
  type: z.enum(['ideas', 'users', 'posts']).optional(),
  page: commonSchemas.page,
  limit: commonSchemas.limit,
});

/**
 * Payment verification schema
 */
export const paymentSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID required'),
  tier: z.enum(['standard', 'priority', 'premium']).optional(),
});

// ============================================================================
// Type exports for use in handlers
// ============================================================================

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type VoteInput = z.infer<typeof voteSchema>;
export type IdeaInput = z.infer<typeof ideaSchema>;
export type ForumPostInput = z.infer<typeof forumPostSchema>;
export type ForumVoteInput = z.infer<typeof forumVoteSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type SearchInput = z.infer<typeof searchSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas,
  paginationSchema,
  idParamSchema,
  fidParamSchema,
  chatMessageSchema,
  chatRoomSlugSchema,
  voteSchema,
  ideaSchema,
  forumPostSchema,
  forumVoteSchema,
  profileUpdateSchema,
  searchSchema,
  paymentSchema,
};
