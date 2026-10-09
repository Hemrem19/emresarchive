import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from '../../drizzle/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
// Note: We use WebCrypto API compatible equivalents instead of 'crypto' module where possible on Edge
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { authenticate } from '../middleware/auth.js';
import { generateVerificationToken, sendVerificationEmail, VERIFICATION_TOKEN_TTL_MS } from '../lib/mailer.js';

const auth = new Hono();

// Helper to get db instance per request
const getDb = (c) => drizzle(c.env.citavers_db, { schema });

const RESEND_COOLDOWN_MS = 60 * 1000;

// Send without delaying the response; failures are logged, never surfaced
const sendVerificationInBackground = (c, user, token) => {
  const job = sendVerificationEmail(c.env, { email: user.email, token, name: user.name })
    .catch((err) => console.error('[auth] verification email failed:', err.message));
  try {
    c.executionCtx.waitUntil(job);
  } catch {
    return job; // no execution context (tests)
  }
};

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
    const verificationToken = generateVerificationToken();
    const [user] = await db.insert(schema.users).values({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name || null,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString(),
    }).returning();

    await sendVerificationInBackground(c, user, verificationToken);

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

  const refreshToken = generateRefreshToken(user.id, session.id, c.env);

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
  });
});

/**
 * Refresh Access Token
 * POST /api/auth/refresh
 */
auth.post('/refresh', async (c) => {
  const db = getDb(c);
  const token = getCookie(c, 'refreshToken');

  if (!token) {
    return c.json({ success: false, error: { message: 'Refresh token required' } }, 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(token, c.env);
  } catch (err) {
    deleteCookie(c, 'refreshToken');
    return c.json({ success: false, error: { message: err.message } }, 401);
  }

  // Hash the incoming token for DB comparison (same method as login/register)
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  const tokenHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  const session = await db.query.sessions.findFirst({
    where: eq(schema.sessions.id, decoded.sessionId)
  });

  if (!session || session.tokenHash !== tokenHash) {
    deleteCookie(c, 'refreshToken');
    return c.json({ success: false, error: { message: 'Invalid refresh token' } }, 401);
  }

  if (new Date(session.expiresAt) < new Date()) {
    deleteCookie(c, 'refreshToken');
    return c.json({ success: false, error: { message: 'Session expired. Please log in again.' } }, 401);
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, session.userId)
  });

  if (!user) {
    return c.json({ success: false, error: { message: 'User not found' } }, 401);
  }

  const accessToken = generateAccessToken(user.id, user.email, c.env);

  return c.json({ success: true, data: { accessToken } });
});

/**
 * Logout
 * POST /api/auth/logout
 */
auth.post('/logout', async (c) => {
  deleteCookie(c, 'refreshToken');
  return c.json({ success: true, message: 'Logged out successfully' });
});

/**
 * Current User
 * GET /api/auth/me
 */
auth.get('/me', authenticate, (c) => {
  return c.json({ success: true, data: { user: c.get('user') } });
});

/**
 * Verify Email
 * POST /api/auth/verify-email
 * Body: { token }
 */
auth.post('/verify-email', async (c) => {
  const db = getDb(c);
  const body = await c.req.json().catch(() => ({}));
  const token = typeof body.token === 'string' ? body.token.trim() : '';

  if (!token) {
    return c.json({ success: false, error: { message: 'Verification token is required' } }, 400);
  }

  const user = await db.query.users.findFirst({
    where: eq(schema.users.verificationToken, token),
    columns: { id: true, emailVerified: true, verificationTokenExpiry: true }
  });

  if (!user) {
    return c.json({
      success: false,
      error: { message: 'Invalid verification token. Please check your email for the correct link or request a new verification email.' }
    }, 400);
  }

  if (user.emailVerified) {
    return c.json({ success: true, message: 'Email is already verified' });
  }

  if (!user.verificationTokenExpiry || new Date(user.verificationTokenExpiry) < new Date()) {
    return c.json({
      success: false,
      error: { message: 'Verification token has expired. Please request a new verification email.' }
    }, 400);
  }

  await db.update(schema.users)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(schema.users.id, user.id));

  return c.json({ success: true, message: 'Email verified successfully' });
});

/**
 * Resend Verification Email
 * POST /api/auth/resend-verification
 */
auth.post('/resend-verification', authenticate, async (c) => {
  const db = getDb(c);
  const authUser = c.get('user');

  if (authUser.emailVerified) {
    return c.json({ success: false, error: { message: 'Email is already verified' } }, 400);
  }

  const current = await db.query.users.findFirst({
    where: eq(schema.users.id, authUser.id),
    columns: { verificationTokenExpiry: true }
  });
  const issuedAt = current?.verificationTokenExpiry
    ? new Date(current.verificationTokenExpiry).getTime() - VERIFICATION_TOKEN_TTL_MS
    : 0;
  const waitMs = issuedAt + RESEND_COOLDOWN_MS - Date.now();
  if (waitMs > 0) {
    c.header('Retry-After', String(Math.ceil(waitMs / 1000)));
    return c.json({
      success: false,
      error: { message: 'Please wait a minute before requesting another verification email.' }
    }, 429);
  }

  const token = generateVerificationToken();
  await db.update(schema.users)
    .set({
      verificationToken: token,
      verificationTokenExpiry: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS).toISOString()
    })
    .where(eq(schema.users.id, authUser.id));

  try {
    const { sent } = await sendVerificationEmail(c.env, { email: authUser.email, token, name: authUser.name });
    if (!sent) {
      return c.json({ success: false, error: { message: 'Email sending is not configured on the server.' } }, 503);
    }
  } catch (err) {
    console.error('[auth] resend verification failed:', err.message);
    return c.json({ success: false, error: { message: 'Failed to send verification email. Please try again later.' } }, 502);
  }

  return c.json({ success: true, message: 'Verification email sent successfully' });
});

export default auth;
