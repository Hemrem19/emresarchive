/**
 * Logins ("sessions"): one row per signed-in device.
 *
 * A login holds the hash of its refresh token (7 days, httpOnly cookie).
 * Access tokens carry its id as `sid`, and the auth middleware rejects them
 * once the row is gone, so ending a login takes effect on the next request
 * rather than when the 15-minute access token runs out. Ending a login also
 * closes its live sync connections.
 */
import { setCookie } from 'hono/cookie';
import { drizzle } from 'drizzle-orm/d1';
import { and, desc, eq, gt, inArray, lt, ne } from 'drizzle-orm';
import * as schema from '../../drizzle/schema.js';
import { generateAccessToken, generateRefreshToken } from '../lib/jwt.js';

export const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

/** Path the Worker posts to on a user's sync room to close sockets. */
export const CLOSE_SOCKETS_PATH = '/internal/close-sessions';
/** WebSocket close code a client sees when its login was ended. */
export const SESSION_ENDED_CODE = 4001;

const S = schema.sessions;

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The Durable Object holding a user's sync room. */
export function userRoom(env, userId) {
  return env.WORKSPACE_DO.get(env.WORKSPACE_DO.idFromName(`user:${userId}`));
}

/**
 * Records a new login, sets its refresh cookie and returns an access token.
 */
export async function startSession(c, db, user) {
  const userAgent = c.req.header('user-agent') || null;
  const [session] = await db.insert(S).values({
    userId: user.id,
    tokenHash: crypto.randomUUID(), // replaced below, once the token (which names the row) exists
    deviceName: userAgent?.substring(0, 255) || null,
    userAgent,
    ipAddress: c.req.header('cf-connecting-ip') || null,
    expiresAt: new Date(Date.now() + SESSION_MS).toISOString(),
    lastActivityAt: new Date().toISOString(),
  }).returning();

  const refreshToken = generateRefreshToken(user.id, session.id, c.env);
  await db.update(S).set({ tokenHash: await sha256Hex(refreshToken) }).where(eq(S.id, session.id));

  setCookie(c, 'refreshToken', refreshToken, {
    httpOnly: true,
    secure: c.env?.ENVIRONMENT === 'production',
    sameSite: c.env?.ENVIRONMENT === 'production' ? 'None' : 'Lax',
    maxAge: SESSION_MS / 1000,
    path: '/'
  });
  return generateAccessToken(user.id, user.email, c.env, session.id);
}

/** The live login an access token belongs to, or null when it was ended or expired. */
export async function findLiveSession(db, userId, sessionId) {
  const session = await db.query.sessions.findFirst({
    where: and(eq(S.id, sessionId), eq(S.userId, userId)),
    columns: { id: true, expiresAt: true },
  });
  return session && new Date(session.expiresAt) > new Date() ? session : null;
}

/** A user's unexpired logins, most recently used first; `current` marks the caller's. */
export async function listSessions(db, userId, currentId) {
  const rows = await db.query.sessions.findMany({
    where: and(eq(S.userId, userId), gt(S.expiresAt, new Date().toISOString())),
    orderBy: desc(S.lastActivityAt),
  });
  return rows.map((s) => ({
    id: s.id,
    device: describeDevice(s.userAgent),
    ipAddress: s.ipAddress,
    createdAt: isoTime(s.createdAt),
    lastActivityAt: isoTime(s.lastActivityAt),
    expiresAt: s.expiresAt,
    current: s.id === currentId,
  }));
}

/**
 * Ends logins of one user: the given ids, or with `{ allBut }` every other
 * one. Returns the ids that were ended.
 */
export async function endSessions(env, db, userId, { ids, allBut } = {}) {
  const scope = ids ? inArray(S.id, ids) : allBut ? ne(S.id, allBut) : undefined;
  const ended = (await db.delete(S).where(and(eq(S.userId, userId), scope)).returning({ id: S.id }))
    .map((s) => s.id);
  if (ended.length) await closeSockets(env, userId, ended);
  return ended;
}

/** Closes the sync connections opened by these logins. Best effort: a socket also dies when its token expires. */
async function closeSockets(env, userId, sessionIds) {
  if (!env.WORKSPACE_DO) return;
  try {
    await userRoom(env, userId).fetch(`https://sync${CLOSE_SOCKETS_PATH}`, {
      method: 'POST',
      body: JSON.stringify({ sessionIds }),
    });
  } catch (err) {
    console.error('[sessions] closing sync sockets failed:', err.message);
  }
}

/** Removes logins past their expiry (nightly cron). */
export async function deleteExpiredSessions(env, now = new Date()) {
  const db = drizzle(env.citavers_db, { schema });
  const removed = await db.delete(S).where(lt(S.expiresAt, now.toISOString())).returning({ id: S.id });
  return removed.length;
}

/** "Chrome on Windows" from a User-Agent header. */
export function describeDevice(userAgent) {
  if (!userAgent) return 'Unknown device';
  const browser = [
    [/Edg\//, 'Edge'], [/OPR\/|Opera/, 'Opera'], [/Firefox\//, 'Firefox'],
    [/Chrome\/|CriOS\//, 'Chrome'], [/Safari\//, 'Safari'],
  ].find(([re]) => re.test(userAgent))?.[1];
  const os = [
    [/iPhone|iPad|iPod/, 'iOS'], [/Android/, 'Android'], [/Windows/, 'Windows'],
    [/Mac OS X|Macintosh/, 'macOS'], [/CrOS/, 'ChromeOS'], [/Linux/, 'Linux'],
  ].find(([re]) => re.test(userAgent))?.[1];
  if (browser && os) return `${browser} on ${os}`;
  return browser || os || 'Unknown device';
}

/** SQLite CURRENT_TIMESTAMP ("2026-10-14 01:22:00", UTC) or ISO, as ISO. */
export function isoTime(value) {
  if (!value) return null;
  return /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(value) ? `${value.replace(' ', 'T')}Z` : value;
}
