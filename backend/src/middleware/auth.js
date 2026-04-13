import { verifyAccessToken } from '../lib/jwt.js';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';

export const authenticate = async (c, next) => {
  let token = null;
  const authHeader = c.req.header('authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (c.req.query('token')) {
    token = c.req.query('token');
  }

  if (!token) {
    return c.json({
      success: false,
      error: { message: 'Authentication required' }
    }, 401);
  }

  try {
    const decoded = verifyAccessToken(token);
    
    const db = drizzle(c.env.DB, { schema });
    
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, decoded.userId),
      columns: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        storageUsedBytes: true,
        storageLimitBytes: true,
        settings: true
      }
    });

    if (!user) {
      return c.json({
        success: false,
        error: { message: 'User not found' }
      }, 401);
    }

    // Attach user to Hono Context
    c.set('user', user);
    
    // Pass expiration for active WebSocket severing
    if (decoded && decoded.exp) {
        c.set('jwtExp', decoded.exp);
    }
    
    await next();

  } catch (error) {
    if (error.message?.includes('expired')) {
      return c.json({
        success: false,
        error: { message: 'Token expired' }
      }, 401);
    }

    if (error.message?.includes('Invalid') || error.message?.includes('unexpected')) {
      return c.json({
        success: false,
        error: { message: 'Invalid token' }
      }, 401);
    }

    console.error('Auth Middleware Error:', error);
    return c.json({
      success: false,
      error: { message: 'Internal Server Error during authentication' }
    }, 500);
  }
};
