import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

// Routing Hooks
import authRoutes from './routes/auth.js';
import foldersRoutes from './routes/folders.js';
import userRoutes from './routes/user.js';
import papersRoutes from './routes/papers.js';
import annotationsRoutes from './routes/annotations.js';
import networkRoutes from './routes/network.js';
import importRoutes from './routes/import.js';
import filesRoutes from './routes/files.js';
import groupsRoutes from './routes/groups.js';
import { authenticateSocket } from './middleware/auth.js';
import { isAllowedOrigin } from './lib/origins.js';
import { purgeStorage } from './services/purge.js';
import { deleteExpiredSessions, userRoom } from './services/sessions.js';
import { groupRoom } from './services/groups.js';
import { roleIn } from './lib/access.js';

const app = new Hono();

// Global Middlewares
// Request log without the query string: the WebSocket upgrade and PDF
// download links carry tokens there (hono/logger prints the full URL).
app.use('*', async (c, next) => {
  const started = Date.now();
  await next();
  console.log(`${c.req.method} ${new URL(c.req.url).pathname} ${c.res.status} ${Date.now() - started}ms`);
});
app.use('*', secureHeaders());

// CORS configuration (replaces Express CORS setup)
app.use('*', cors({
  // Exact matches only: credentials are allowed, so substring checks like
  // includes('citavers') would let e.g. citavers.evil.com make logged-in calls.
  origin: (origin) => isAllowedOrigin(origin) ? origin : null,
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Debug-Mode', 'X-Library'],
  maxAge: 86400,
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
app.route('/api/folders', foldersRoutes);
app.route('/api/papers', papersRoutes);
app.route('/api/annotations', annotationsRoutes);
app.route('/api/networks', networkRoutes);
app.route('/api/import', importRoutes);
app.route('/api/files', filesRoutes);
app.route('/api/groups', groupsRoutes);

// Durable Objects Sync Route
app.get('/api/sync/workspace/:id', authenticateSocket, async (c) => {
  const upgradeHeader = c.req.header('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return c.json({ error: 'Expected Upgrade: websocket' }, 426);
  }

  const user = c.get('user');
  // "group:12" joins that group's room, for members only; anything else is
  // the caller's personal room. Rooms are never chosen by name alone: that
  // once let every user join the same "default" room.
  const group = /^group:(\d+)$/.exec(c.req.param('id') || '');
  if (group && !roleIn(user, Number(group[1]))) return c.json({ error: 'Group not found' }, 404);
  const stub = group ? groupRoom(c.env, Number(group[1])) : userRoom(c.env, user.id);

  // We must clone the incoming request to inject our custom X-User-Id header
  const headers = new Headers(c.req.raw.headers);
  headers.set('X-User-Id', user.id.toString());
  // Lets the room close this socket when its login is ended
  const sessionId = c.get('sessionId');
  if (sessionId) headers.set('X-Session-Id', String(sessionId));
  else headers.delete('X-Session-Id');
  
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
  },

  // Cron Trigger (wrangler.toml [triggers])
  scheduled(event, env, ctx) {
    ctx.waitUntil(
      purgeStorage(env)
        .then((summary) => console.log('[purge]', JSON.stringify(summary)))
        .catch((err) => console.error('[purge] failed:', err))
    );
    ctx.waitUntil(
      deleteExpiredSessions(env)
        .then((removed) => console.log('[sessions] removed expired logins:', removed))
        .catch((err) => console.error('[sessions] cleanup failed:', err))
    );
  }
};

export { WorkspaceDurableObject } from './WorkspaceDurableObject.js';
