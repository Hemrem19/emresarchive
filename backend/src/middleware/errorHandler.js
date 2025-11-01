/**
 * Error Handler Middleware
 * Centralized error handling for Express routes
 */

export const errorHandler = (err, req, res, next) => {
  // Prevent sending response twice
  if (res.headersSent) {
    return next(err);
  }

  // Handle Prisma errors
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

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

  // Don't expose internal errors in production (except for specific handled errors)
  const errorMessage = (process.env.NODE_ENV === 'production' && statusCode === 500 && err.code !== 'P2002' && err.code !== 'P2025')
    ? 'Internal Server Error'
    : message;

  // Ensure CORS headers are set even on errors
  // Get origin from request
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

  res.status(statusCode).json({
    success: false,
    error: {
      message: errorMessage,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
};

