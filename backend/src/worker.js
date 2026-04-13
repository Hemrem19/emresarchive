import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';

// Routing Hooks
import authRoutes from './routes/auth.js';
import collectionsRoutes from './routes/collections.js';
import userRoutes from './routes/user.js';
import papersRoutes from './routes/papers.js';
import annotationsRoutes from './routes/annotations.js';
import networkRoutes from './routes/network.js';
import importRoutes from './routes/import.js';
// extension is pending, REST sync was obliviated for Yjs WebSockets
// import extensionRoutes from './routes/extension.js';

const app = new Hono();

// Global Middlewares
app.use('*', logger());
app.use('*', secureHeaders());

// CORS configuration (replaces Express CORS setup)
app.use('*', cors({
  origin: (origin, c) => {
    const baseOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080'];
    if (!origin || baseOrigins.includes(origin) || origin.includes('localhost')) {
      return origin;
    }
    if (origin.includes('pages.dev') || origin.includes('cloudflarepages.com') || origin.includes('citavers')) {
      return origin;
    }
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Debug-Mode'],
}));

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env?.ENVIRONMENT || 'development'
  });
});

// API routes Hookups
app.route('/api/auth', authRoutes);
app.route('/api/user', userRoutes);
app.route('/api/collections', collectionsRoutes);
app.route('/api/papers', papersRoutes);
app.route('/api/annotations', annotationsRoutes);
app.route('/api/networks', networkRoutes);
app.route('/api/import', importRoutes);
// app.route('/api/extension', extensionRoutes);

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
  const statusCode = err.status || 500;
  return c.json({ 
    status: 'error',
    message: err.message || 'Internal Server Error' 
  }, statusCode);
});

export default {
  fetch: app.fetch,
};
