/**
 * Server tests - SKIPPED
 *
 * The Express server (src/server.js) was replaced by a Cloudflare Hono Worker
 * (src/worker.js) during the CRDT Edge migration. These tests are retained for
 * historical reference but are skipped because the source file no longer exists.
 *
 * TODO: Write Hono/Worker-compatible route integration tests using
 *       Cloudflare's `unstable_dev` helper or Miniflare.
 */
import { describe, it } from 'vitest';

describe.skip('Express Server (deprecated — replaced by Hono Worker)', () => {
    it('server.js no longer exists — migrated to src/worker.js', () => {});
});
