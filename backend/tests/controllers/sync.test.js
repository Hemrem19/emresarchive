/**
 * Sync Controller tests - SKIPPED
 *
 * The legacy REST-based sync controller (src/controllers/sync.js) was removed
 * during the CRDT Edge migration. Real-time sync is now handled by the
 * WorkspaceDurableObject via WebSocket (src/WorkspaceDurableObject.js).
 *
 * TODO: Write tests for WorkspaceDurableObject using Miniflare.
 */
import { describe, it } from 'vitest';

describe.skip('Sync Controller (deprecated — replaced by WorkspaceDurableObject)', () => {
    it('controllers/sync.js no longer exists — logic moved to WorkspaceDurableObject.js', () => {});
});
