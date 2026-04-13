import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';

// We will mount these dynamically once migrated
import authRoutes from './routes/auth.js';
// import papersRoutes from './routes/papers.js';
// import collectionsRoutes from './routes/collections.js';
// import annotationsRoutes from './routes/annotations.js';
// import syncRoutes from './routes/sync.js';
// import userRoutes from './routes/user.js';
// import importRoutes from './routes/import.js';
// import extensionRoutes from './routes/extension.js';
// import networkRoutes from './routes/network.js';

const app = new Hono();

// Global Middlewares
app.use('*', logger());
app.use('*', secureHeaders()); // Replaces helmet()

// CORS configuration (replaces Express CORS setup)
app.use('*', cors({
  origin: (origin, c) => {
    // Replicate previous flexiblity:
    const baseOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080'];
    if (!origin || baseOrigins.includes(origin) || origin.includes('localhost')) {
      return origin;
    }
    // For pages.dev or production citavers
    if (origin.includes('pages.dev') || origin.includes('cloudflarepages.com') || origin.includes('citavers')) {
      return origin;
    }
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Debug-Mode'],
}));

// Body Parsing - Hono handles this natively via c.req.json() and c.req.parseBody()
// No need for express.json() or express.urlencoded()

// Rate Limiting
// Cloudflare handles IP based rate limits gracefully via WAF, 
// but we will implement specific Durable Object limiters when we build Phase 4.

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env?.ENVIRONMENT || 'development'
  });
});

// API routes (Placeholder hookups)
app.route('/api/auth', authRoutes);
// app.route('/api/papers', papersRoutes);
// app.route('/api/collections', collectionsRoutes);
// app.route('/api/annotations', annotationsRoutes);
// app.route('/api/sync', syncRoutes);
// app.route('/api/user', userRoutes);
// app.route('/api/import', importRoutes);
// app.route('/api/extension', extensionRoutes);
// app.route('/api/networks', networkRoutes);

// 404 handler (replaces /middleware/notFound.js)
app.notFound((c) => {
  return c.json({
    status: 'error',
    message: 'The requested resource was not found. Please check the URL and HTTP method.'
  }, 404);
});

// Error handler (replaces /middleware/errorHandler.js)
app.onError((err, c) => {
  console.error('⚠️ Uncaught Exception:', err);
  // Log specific formatting missing from raw err
  const statusCode = err.status || 500;
  return c.json({ 
    status: 'error',
    message: err.message || 'Internal Server Error' 
  }, statusCode);
});

export default {
  fetch: app.fetch,
};
