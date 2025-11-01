/**
 * Error Handler Middleware
 * Centralized error handling for Express routes
 */

export const errorHandler = (err, req, res, next) => {
  // Ensure CORS headers are set even on errors
  const origin = req.headers.origin;
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';
  
  // Allow origin if it's in allowed list or is Cloudflare Pages
  const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:8080',
    'http://localhost:5500',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5500',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
  
  if (origin && (allowedOrigins.includes(origin) || origin.includes('pages.dev') || origin.includes('cloudflarepages.com'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // Handle Multer errors (file upload errors)
  if (err.name === 'MulterError') {
    let statusCode = 400;
    let message = 'File upload error';
    
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size exceeds the maximum limit (50MB)';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files. Please upload only one file.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field. Please use the "file" field.';
        break;
      default:
        message = err.message || 'File upload error';
    }
    
    if (!res.headersSent) {
      return res.status(statusCode).json({
        success: false,
        error: { message }
      });
    }
    return;
  }
  
  // Handle multer file filter errors
  if (err.message && err.message.includes('Only PDF files are allowed')) {
    if (!res.headersSent) {
      return res.status(400).json({
        success: false,
        error: { message: 'Only PDF files are allowed' }
      });
    }
    return;
  }
  
  // Prevent sending response twice
  if (res.headersSent) {
    return next(err);
  }

  // Handle Zod validation errors (from validation middleware)
  if (err.name === 'ZodError' && err.issues) {
    statusCode = 422; // Unprocessable Entity
    const details = err.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    }));
    
    // Create user-friendly summary message
    const fieldMessages = details.map(d => `${d.field}: ${d.message}`).join('; ');
    message = `Validation error: ${fieldMessages}`;
    
    if (!res.headersSent) {
      return res.status(statusCode).json({
        success: false,
        error: {
          message: 'Please check your input and try again.',
          details
        }
      });
    }
    return;
  }

  // Handle Prisma errors
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Prisma column does not exist (P2022) - schema mismatch
  if (err.code === 'P2022') {
    statusCode = 503; // Service Unavailable
    const columnName = err.meta?.column || 'column';
    message = `Database schema error: ${columnName} does not exist. Please run migrations.`;
    console.error('⚠️ Prisma schema mismatch detected:', err.message);
    console.error('   Column:', columnName);
    console.error('   Model:', err.meta?.modelName);
    // Don't expose internal details in production
    if (process.env.NODE_ENV === 'production') {
      message = 'Database configuration error. Please contact support.';
    }
  }

  // Prisma unique constraint violation (P2002) - handled gracefully
  if (err.code === 'P2002') {
    statusCode = 400;
    const target = err.meta?.target || [];
    // Check if it's the userId+doi composite constraint
    // Note: Prisma returns field names as 'user_id' and 'doi' (snake_case), not camelCase
    const targetStr = JSON.stringify(target).toLowerCase();
    if ((target.includes('user_id') || target.includes('userid')) && 
        (target.includes('doi') || targetStr.includes('doi'))) {
      message = 'You already have a paper with this DOI in your library';
    } else if (target.includes('email') || targetStr.includes('email')) {
      statusCode = 409; // Conflict
      message = 'An account with this email already exists. Please log in instead.';
    } else {
      const field = target[0] || 'field';
      message = `A record with this ${field} already exists`;
    }
    // Don't log these as errors - they're expected business logic errors
    console.log(`ℹ️  Duplicate constraint detected (handled gracefully):`, target);
  } else {
    // Log unexpected errors
    console.error('Error:', err);
    console.error('Error stack:', err.stack);
  }

  // Prisma record not found (P2025)
  if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
  }

  // Prisma connection errors
  if (err.code === 'P1001' || err.code === 'P1008' || (err.message && err.message.includes('connection'))) {
    statusCode = 503; // Service Unavailable
    message = 'Database connection error. Please try again later.';
    console.error('⚠️ Database connection error - server will continue running');
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    if (err.name === 'TokenExpiredError') {
      message = 'Session expired. Please log in again.';
    } else {
      message = 'Invalid authentication token. Please log in again.';
    }
  }
  
  // Handle rate limiting errors
  if (err.statusCode === 429 || err.message?.includes('rate limit')) {
    statusCode = 429;
    message = 'Too many requests. Please wait a moment and try again.';
  }

  // Don't expose internal errors in production (except for specific handled errors)
  const errorMessage = (process.env.NODE_ENV === 'production' && statusCode === 500 && err.code !== 'P2002' && err.code !== 'P2025')
    ? 'Internal Server Error'
    : message;

  // CORS headers are already set at the beginning of this function
  // No need to set them again here

  // Ensure error message is always a string (prevent [object Object] errors)
  let safeMessage = errorMessage;
  if (typeof safeMessage !== 'string') {
    try {
      safeMessage = JSON.stringify(safeMessage);
    } catch {
      safeMessage = 'An error occurred';
    }
  }

  // Ensure error details are properly formatted
  let errorDetails = null;
  if (err.details && Array.isArray(err.details)) {
    errorDetails = err.details;
  } else if (err.error?.details && Array.isArray(err.error.details)) {
    errorDetails = err.error.details;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      message: safeMessage,
      ...(errorDetails && { details: errorDetails }),
      ...(process.env.NODE_ENV !== 'production' && { 
        stack: typeof err.stack === 'string' ? err.stack : undefined,
        code: err.code,
        name: err.name
      })
    }
  });
};

