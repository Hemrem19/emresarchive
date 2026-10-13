import { parseLibrary } from '../lib/access.js';

/**
 * The library a list, search or create request works in, from the
 * X-Library header ("personal" when absent, or "group:12"). Requests by id
 * use the row's own library instead. Runs after authenticate.
 */
export async function libraryContext(c, next) {
  const library = parseLibrary(c.get('user'), c.req.header('x-library'));
  if (!library) return c.json({ success: false, error: { message: 'Library not found' } }, 404);
  c.set('library', library);
  await next();
}
