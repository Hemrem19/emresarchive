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
import { authenticate } from './middleware/auth.js';
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

// Durable Objects Sync Route
app.get('/api/sync/workspace/:id', authenticate, async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected Upgrade: websocket' }, 426);
  }

  const user = c.get('user');
  const workspaceId = c.req.param('id');
  const id = c.env.WORKSPACE_DO.idFromName(workspaceId);
  const stub = c.env.WORKSPACE_DO.get(id);

  // We must clone the incoming request to inject our custom X-User-Id header
  const headers = new Headers(c.req.raw.headers);
  headers.set('X-User-Id', user.id.toString());
  
  const exp = c.get('jwtExp');
  if (exp) {
    headers.set('X-JWT-Exp', String(exp));
  }
  
  const clonedRequest = new Request(c.req.raw, { headers });

  // Pass the WebSocket upgrade request to the Durable Object
  return stub.fetch(clonedRequest);
});

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
  fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
};

export { WorkspaceDurableObject } from './WorkspaceDurableObject.js';
