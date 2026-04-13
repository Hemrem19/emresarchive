import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt.js';
// Note: We use WebCrypto API compatible equivalents instead of 'crypto' module where possible on Edge
import { setCookie, deleteCookie } from 'hono/cookie';

const auth = new Hono();

// Helper to get db instance per request
const getDb = (c) => drizzle(c.env.citavers_db, { schema });

/**
 * User Registration
 * POST /api/auth/register
 */
auth.post('/register', async (c) => {
  const db = getDb(c);
  // Replaces express req.body parsing:
  const body = await c.req.json().catch(() => null);

  if (!body || !body.email || !body.password) {
    return c.json({
      success: false,
      error: { message: 'Email and password are required' }
    }, 400);
  }

  const { email, password, name } = body;

  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase().trim())
  });

  if (existingUser) {
    return c.json({
      success: false,
      error: { message: 'An account with this email already exists.' }
    }, 409);
  }

  const passwordHash = await hashPassword(password);

  try {
    const [user] = await db.insert(schema.users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name || null,
      emailVerified: false,
    }).returning();

    // Session temp hash
    const tempTokenHash = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [session] = await db.insert(schema.sessions).values({
      userId: user.id,
      tokenHash: tempTokenHash,
      deviceName: c.req.header('user-agent')?.substring(0, 255) || null,
      userAgent: c.req.header('user-agent') || null,
      ipAddress: c.req.header('cf-connecting-ip') || '127.0.0.1',
      expiresAt: expiresAt,
    }).returning();

    const refreshToken = generateRefreshToken(user.id, session.id, c.env);
    
    // Hash refresh token to store
    // WebCrypto subtle crypto requires buffer logic, keeping simplified for prototype:
    const encoder = new TextEncoder();
    const data = encoder.encode(refreshToken);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    await db.update(schema.sessions)
      .set({ tokenHash })
      .where(eq(schema.sessions.id, session.id));

    // Set cookie
    setCookie(c, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: c.env?.ENVIRONMENT === 'production',
      sameSite: c.env?.ENVIRONMENT === 'production' ? 'None' : 'Lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    const accessToken = generateAccessToken(user.id, user.email, c.env);

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt
        },
        accessToken,
        refreshToken
      }
    }, 201);

  } catch (err) {
    console.error('Registration Error:', err);
    return c.json({ success: false, error: { message: 'Internal Server Error' } }, 500);
  }
});

/**
 * User Login
 * POST /api/auth/login
 */
auth.post('/login', async (c) => {
  const db = getDb(c);
  const body = await c.req.json().catch(() => null);

  if (!body || !body.email || !body.password) {
    return c.json({
      success: false,
      error: { message: 'Email and password are required' }
    }, 400);
  }

  const { email, password } = body;

  const user = await db.query.users.findFirst({
    where: eq(schema.users.email, email.toLowerCase().trim())
  });

  if (!user) {
    return c.json({
      success: false,
      error: { message: 'Invalid email or password.' }
    }, 401);
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return c.json({
      success: false,
      error: { message: 'Invalid email or password.' }
    }, 401);
  }

  // Generate tokens
  const expiresInMs = 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

  const [session] = await db.insert(schema.sessions).values({
    userId: user.id,
    tokenHash: crypto.randomUUID(), // Temp hash
    deviceName: c.req.header('user-agent')?.substring(0, 255) || null,
    userAgent: c.req.header('user-agent') || null,
    ipAddress: c.req.header('cf-connecting-ip') || '127.0.0.1',
    expiresAt: expiresAt,
  }).returning();

  const refreshToken = generateRefreshToken(user.id, session.id);
  
  const encoder = new TextEncoder();
  const data = encoder.encode(refreshToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const tokenHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  await db.update(schema.sessions)
    .set({ tokenHash })
    .where(eq(schema.sessions.id, session.id));

  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true,
    secure: c.env?.ENVIRONMENT === 'production',
    sameSite: c.env?.ENVIRONMENT === 'production' ? 'None' : 'Lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/'
  });

  const accessToken = generateAccessToken(user.id, user.email);

  return c.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      accessToken,
      refreshToken
    }
  });
});

/**
 * Logout
 * POST /api/auth/logout
 */
auth.post('/logout', async (c) => {
  deleteCookie(c, 'refreshToken');
  return c.json({ success: true, message: 'Logged out successfully' });
});

export default auth;
