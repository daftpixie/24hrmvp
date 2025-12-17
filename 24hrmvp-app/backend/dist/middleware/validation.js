"use strict";
/**
 * Validation Middleware with Zod
 *
 * Provides type-safe request validation using Zod schemas.
 * All validated data is sanitized and type-checked before reaching handlers.
 *
 * @see https://zod.dev/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentSchema = exports.searchSchema = exports.profileUpdateSchema = exports.forumVoteSchema = exports.forumPostSchema = exports.ideaSchema = exports.voteSchema = exports.chatRoomSlugSchema = exports.chatMessageSchema = exports.fidParamSchema = exports.idParamSchema = exports.paginationSchema = exports.commonSchemas = exports.validateParams = exports.validateQuery = exports.validateBody = void 0;
exports.validate = validate;
const zod_1 = require("zod");
// Optional logger import - falls back to console if not installed
let logger;
try {
    const loggerModule = require('../lib/logger');
    logger = loggerModule.logger;
}
catch {
    logger = { warn: console.warn };
}
/**
 * Create validation middleware for a specific request target
 *
 * @example
 * const validateBody = validate('body', userSchema);
 * app.post('/users', validateBody, createUser);
 */
function validate(target, schema, options = {}) {
    const { errorMessage = 'Validation failed' } = options;
    return (req, res, next) => {
        try {
            // Get the data to validate
            const data = req[target];
            // Parse and validate (strip unknown by default)
            const parsed = schema.parse(data);
            // Replace request data with validated/sanitized version
            req[target] = parsed;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
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
const validateBody = (schema, options) => validate('body', schema, options);
exports.validateBody = validateBody;
const validateQuery = (schema, options) => validate('query', schema, options);
exports.validateQuery = validateQuery;
const validateParams = (schema, options) => validate('params', schema, options);
exports.validateParams = validateParams;
// ============================================================================
// Common Validation Schemas
// ============================================================================
/**
 * Common field validators
 */
exports.commonSchemas = {
    // UUID validation
    uuid: zod_1.z.string().uuid(),
    // CUID validation (Prisma default)
    cuid: zod_1.z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid ID format'),
    // Generic ID (cuid or uuid)
    id: zod_1.z.string().min(1, 'ID is required'),
    // Farcaster ID (positive integer)
    fid: zod_1.z.number().int().positive(),
    // FID from string (for route params)
    fidString: zod_1.z.string().regex(/^\d+$/, 'Invalid FID').transform((v) => parseInt(v, 10)),
    // Username (alphanumeric, underscores, 3-20 chars)
    username: zod_1.z.string()
        .min(3, 'Username must be at least 3 characters')
        .max(20, 'Username must be at most 20 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    // Email
    email: zod_1.z.string().email(),
    // URL
    url: zod_1.z.string().url(),
    // Pagination
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    // Sort order
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    // Date (ISO string)
    dateString: zod_1.z.string().datetime(),
    // Slug (URL-friendly string)
    slug: zod_1.z.string()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens'),
};
/**
 * Pagination query schema
 */
exports.paginationSchema = zod_1.z.object({
    page: exports.commonSchemas.page,
    limit: exports.commonSchemas.limit,
    sortOrder: exports.commonSchemas.sortOrder.optional(),
});
/**
 * ID parameter schema
 */
exports.idParamSchema = zod_1.z.object({
    id: exports.commonSchemas.id,
});
/**
 * FID parameter schema
 */
exports.fidParamSchema = zod_1.z.object({
    fid: exports.commonSchemas.fidString,
});
// ============================================================================
// Feature-Specific Schemas
// ============================================================================
/**
 * Chat message schema
 */
exports.chatMessageSchema = zod_1.z.object({
    roomId: exports.commonSchemas.id,
    content: zod_1.z.string()
        .min(1, 'Message cannot be empty')
        .max(2000, 'Message too long (max 2000 characters)')
        .transform((val) => val.trim()),
});
/**
 * Chat room slug param schema
 */
exports.chatRoomSlugSchema = zod_1.z.object({
    slug: exports.commonSchemas.slug,
});
/**
 * Vote schema
 */
exports.voteSchema = zod_1.z.object({
    ideaId: exports.commonSchemas.id,
});
/**
 * Idea submission schema
 */
exports.ideaSchema = zod_1.z.object({
    title: zod_1.z.string()
        .min(5, 'Title must be at least 5 characters')
        .max(100, 'Title too long (max 100 characters)')
        .transform((val) => val.trim()),
    description: zod_1.z.string()
        .min(20, 'Description must be at least 20 characters')
        .max(5000, 'Description too long (max 5000 characters)')
        .transform((val) => val.trim()),
    category: zod_1.z.enum([
        'UTILITY',
        'SOCIAL',
        'GAMING',
        'FINANCE',
        'PRODUCTIVITY',
        'EDUCATION',
        'OTHER',
    ]),
    complexity: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});
/**
 * Forum post schema
 */
exports.forumPostSchema = zod_1.z.object({
    title: zod_1.z.string()
        .min(5, 'Title must be at least 5 characters')
        .max(200, 'Title too long (max 200 characters)')
        .transform((val) => val.trim()),
    content: zod_1.z.string()
        .min(10, 'Content must be at least 10 characters')
        .max(10000, 'Content too long (max 10000 characters)')
        .transform((val) => val.trim()),
    categoryId: exports.commonSchemas.id.optional(),
    parentId: exports.commonSchemas.id.optional(), // For replies
});
/**
 * Forum post vote schema
 */
exports.forumVoteSchema = zod_1.z.object({
    postId: exports.commonSchemas.id,
    value: zod_1.z.enum(['1', '-1']).transform((v) => parseInt(v, 10)),
});
/**
 * User profile update schema
 */
exports.profileUpdateSchema = zod_1.z.object({
    displayName: zod_1.z.string()
        .min(1, 'Display name required')
        .max(50, 'Display name too long')
        .optional(),
    bio: zod_1.z.string()
        .max(500, 'Bio too long (max 500 characters)')
        .optional(),
}).strict();
/**
 * Search query schema
 */
exports.searchSchema = zod_1.z.object({
    q: zod_1.z.string()
        .min(2, 'Search query too short')
        .max(100, 'Search query too long')
        .transform((val) => val.trim()),
    type: zod_1.z.enum(['ideas', 'users', 'posts']).optional(),
    page: exports.commonSchemas.page,
    limit: exports.commonSchemas.limit,
});
/**
 * Payment verification schema
 */
exports.paymentSchema = zod_1.z.object({
    paymentId: zod_1.z.string().min(1, 'Payment ID required'),
    tier: zod_1.z.enum(['standard', 'priority', 'premium']).optional(),
});
exports.default = {
    validate,
    validateBody: exports.validateBody,
    validateQuery: exports.validateQuery,
    validateParams: exports.validateParams,
    commonSchemas: exports.commonSchemas,
    paginationSchema: exports.paginationSchema,
    idParamSchema: exports.idParamSchema,
    fidParamSchema: exports.fidParamSchema,
    chatMessageSchema: exports.chatMessageSchema,
    chatRoomSlugSchema: exports.chatRoomSlugSchema,
    voteSchema: exports.voteSchema,
    ideaSchema: exports.ideaSchema,
    forumPostSchema: exports.forumPostSchema,
    forumVoteSchema: exports.forumVoteSchema,
    profileUpdateSchema: exports.profileUpdateSchema,
    searchSchema: exports.searchSchema,
    paymentSchema: exports.paymentSchema,
};
//# sourceMappingURL=validation.js.map