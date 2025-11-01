/**
 * Request Validation Utilities
 * Zod schemas for request validation
 */

import { z } from 'zod';

// User Registration Schema
export const registerSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password is too long (maximum 128 characters)')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long (maximum 100 characters)')
    .trim()
    .optional()
});

// User Login Schema
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
});

// Refresh Token Schema
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// Email Verification Schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
});

// Paper Schema
export const paperSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  authors: z.array(z.string()).optional().default([]),
  year: z.number().int().min(1900).max(2100).optional().nullable(),
  journal: z.string().optional().nullable(),
  doi: z.string().optional().nullable(),
  abstract: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  status: z.string().optional().default('To Read'),
  relatedPaperIds: z.array(z.number().int()).optional().default([]),
  notes: z.string().optional().nullable(),
  readingProgress: z.object({
    currentPage: z.number().int().min(0).optional(),
    totalPages: z.number().int().min(1).optional()
  }).optional().nullable(),
  pdfUrl: z.string().optional().nullable(),
  s3Key: z.string().optional().nullable(), // S3 key for uploaded PDFs
  pdfSizeBytes: z.number().int().min(0).optional().nullable()
});

// Paper Update Schema (all fields optional)
export const paperUpdateSchema = paperSchema.partial().extend({
  title: z.string().min(1).optional()
});

// Collection Schema
export const collectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(255, 'Name too long'),
  icon: z.string().optional().default('folder'),
  color: z.string().optional().default('text-primary'),
  filters: z.object({
    status: z.string().optional().nullable(),
    tags: z.array(z.string()).optional().default([]),
    searchTerm: z.string().optional().nullable()
  }).optional().default({})
});

// Collection Update Schema (all fields optional)
export const collectionUpdateSchema = collectionSchema.partial().extend({
  name: z.string().min(1).max(255).optional()
});

// Annotation Schema
export const annotationSchema = z.object({
  type: z.enum(['highlight', 'note', 'bookmark'], {
    errorMap: () => ({ message: 'Type must be highlight, note, or bookmark' })
  }),
  pageNumber: z.number().int().min(1).optional().nullable(),
  position: z.object({
    x: z.number().optional(),
    y: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional()
  }).optional().nullable(),
  content: z.string().optional().nullable(),
  color: z.string().optional().nullable()
});

// Annotation Update Schema (all fields optional)
export const annotationUpdateSchema = annotationSchema.partial();

// Sync Schemas
export const incrementalSyncSchema = z.object({
  lastSyncedAt: z.string().datetime().optional().nullable(),
  changes: z.object({
    papers: z.object({
      created: z.array(paperSchema).default([]),
      updated: z.array(paperUpdateSchema.extend({ id: z.number().int() })).default([]),
      deleted: z.array(z.number().int()).default([])
    }).default({ created: [], updated: [], deleted: [] }),
    collections: z.object({
      created: z.array(collectionSchema).default([]),
      updated: z.array(collectionUpdateSchema.extend({ id: z.number().int() })).default([]),
      deleted: z.array(z.number().int()).default([])
    }).default({ created: [], updated: [], deleted: [] }),
    annotations: z.object({
      created: z.array(annotationSchema).default([]),
      updated: z.array(annotationUpdateSchema.extend({ id: z.number().int() })).default([]),
      deleted: z.array(z.number().int()).default([])
    }).default({ created: [], updated: [], deleted: [] })
  }),
  clientId: z.string().min(1).max(100)
});

// Request Validation Middleware Factory
export const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({
          success: false,
          error: {
            message: 'Please check your input and try again.',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          }
        });
      }
      next(error);
    }
  };
};
