import { getAllPapers } from '../db/papers.js';
import { generateDeterministicPaperId } from './crdtUtils.js';

/**
 * Sweeps the legacy IndexedDB for offline papers and upgrades them into Yjs Maps.
 * Essential for the final zero-loss CRDT migration.
 * 
 * @param {import('yjs').Doc} yDoc The global active Y.Doc
 */
export async function upgradeLegacySchemaToYjs(yDoc) {
    if (!yDoc) return;
    
    // Safety check - Did we already successfully migrate this client?
    if (localStorage.getItem('citavers_crdt_migrated')) {
        return;
    }

    try {
        const legacyPapers = await getAllPapers();
        if (!legacyPapers || legacyPapers.length === 0) {
            // Nothing to rescue, mark empty migration complete
            localStorage.setItem('citavers_crdt_migrated', 'true');
            return;
        }

        console.log(`[Schema Upgrade] Preparing to rescue ${legacyPapers.length} legacy offline papers...`);

        // Resolve all deterministic IDs asynchronously before locking Yjs transaction
        const migrationBatch = await Promise.all(
            legacyPapers.map(async (paper) => {
                const crdtId = await generateDeterministicPaperId(paper);
                return {
                    id: crdtId,
                    payload: paper
                };
            })
        );

        const yPapersMap = yDoc.getMap('papers');

        // Batch all inserts in a single Yjs transaction to avoid UI spam and network fragmentation
        yDoc.transact(() => {
            for (const item of migrationBatch) {
                if (!yPapersMap.has(item.id)) {
                    // Inject into CRDT Map natively.
                    // Keep the payload structure the same, but Y.Map dictates the deterministic key
                    yPapersMap.set(item.id, item.payload);
                }
            }
        });

        // Mark as natively completed for next load
        localStorage.setItem('citavers_crdt_migrated', 'true');
        console.log(`[Schema Upgrade] Successfully rescued ${migrationBatch.length} papers into CRDT engine.`);
    } catch (error) {
        console.error('[Schema Upgrade] Fatal error during data rescue:', error);
    }
}
