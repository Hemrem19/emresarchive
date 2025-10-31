/**
 * Error Handler Middleware
 * Centralized error handling for Express routes
 */

export const errorHandler = (err, req, res, next) => {
  // Log error for debugging
  console.error('Error:', err);

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Don't expose internal errors in production
  const errorMessage = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : message;

  res.status(statusCode).json({
    success: false,
    error: {
      message: errorMessage,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
};

