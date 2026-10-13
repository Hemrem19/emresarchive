import { isGroupLibrary, parseLibrary } from '../lib/access.js';
import { announceChange } from '../services/groups.js';

/**
 * The library a list, search or create request works in, from the
 * X-Library header ("personal" when absent, or "group:12"). Requests by id
 * use the row's own library instead. Runs after authenticate.
 *
 * After a successful write in a group, the group's open apps are told to
 * pull (see WorkspaceDurableObject `signals`).
 */
export async function libraryContext(c, next) {
  const library = parseLibrary(c.get('user'), c.req.header('x-library'));
  if (!library) return c.json({ success: false, error: { message: 'Library not found' } }, 404);
  c.set('library', library);
  await next();

  if (c.req.method !== 'GET' && c.res.status < 400 && isGroupLibrary(library)) {
    const job = announceChange(c.env, library.groupId);
    try {
      c.executionCtx.waitUntil(job);
    } catch {
      await job; // no execution context (tests)
    }
  }
}
