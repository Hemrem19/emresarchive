/**
 * 404 Not Found Middleware
 * Handles undefined routes
 */

export const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
};

