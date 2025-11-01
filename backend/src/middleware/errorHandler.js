/**
 * Error Handler Middleware
 * Centralized error handling for Express routes
 */

export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);
  console.error('Error stack:', err.stack);

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Don't expose internal errors in production
  const errorMessage = process.env.NODE_ENV === 'production' && statusCode === 500
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

