import { verifyAccessToken } from '../lib/jwt.js';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';

const unauthorized = (c, message) => c.json({ success: false, error: { message } }, 401);

const bearerToken = (c) => {
  const header = c.req.header('authorization');
  return header?.startsWith('Bearer ') ? header.substring(7) : null;
};

function createAuthenticate({ allowQueryToken }) {
  return async (c, next) => {
    // Tokens in URLs end up in logs, history and Referer headers, so only the
    // WebSocket upgrade (where browsers cannot set headers) may use ?token=.
    const token = bearerToken(c) || (allowQueryToken ? c.req.query('token') : null);
    if (!token) return unauthorized(c, 'Authentication required');

    let decoded;
    try {
      decoded = verifyAccessToken(token, c.env);
    } catch (error) {
      if (error.message?.includes('expired')) return unauthorized(c, 'Token expired');
      if (error.message?.includes('Invalid') || error.message?.includes('unexpected')) return unauthorized(c, 'Invalid token');
      console.error('Auth Middleware Error:', error);
      return c.json({ success: false, error: { message: 'Internal Server Error during authentication' } }, 500);
    }
    // Other tokens (e.g. PDF download links) share the signing secret
    if (decoded?.type !== 'access') return unauthorized(c, 'Invalid token');

    const db = drizzle(c.env.citavers_db, { schema });
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, decoded.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        storageUsedBytes: true,
        settings: true
      }
    });
    if (!user) return unauthorized(c, 'User not found');

    c.set('user', user);
    // Pass expiration for active WebSocket severing
    if (decoded.exp) c.set('jwtExp', decoded.exp);

    await next();
  };
}

/** REST routes: Authorization: Bearer <access token> only. */
export const authenticate = createAuthenticate({ allowQueryToken: false });

/** WebSocket upgrade: also accepts ?token=, since browsers cannot send headers there. */
export const authenticateSocket = createAuthenticate({ allowQueryToken: true });
