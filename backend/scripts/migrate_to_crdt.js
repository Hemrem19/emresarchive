import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as Y from 'yjs';
import pg from 'pg'; // Requires "npm install pg" specifically for the runtime port

const { Client } = pg;

// Strict read pattern for Neon database credentials
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('Fatal: DATABASE_URL environment variable missing. Cannot connect to legacy Neon PostgreSQL.');
    console.error('Please run: DATABASE_URL="postgres://..." node scripts/migrate_to_crdt.js');
    process.exit(1);
}

/**
 * Executes a one-way database port from PostgreSQL to Cloudflare D1
 * Converts legacy LWW rows directly into Yjs vector clocks for native Edge seeding
 */
async function runProductionDataPort() {
    console.log('\n[Staging DB Port] Booting isolated migration environment...');
    const pgClient = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

    try {
        await pgClient.connect();
        console.log('[Staging DB Port] Secure connection established with Neon...');

        // 1. Fetch Users
        const { rows: users } = await pgClient.query('SELECT * FROM users');
        console.log(`[Staging DB Port] Discovered ${users.length} isolated workspaces.`);

        // 2. Fetch all un-deleted legacy papers
        const { rows: papers } = await pgClient.query('SELECT * FROM papers WHERE deleted_at IS NULL');
        console.log(`[Staging DB Port] Discovered ${papers.length} intact papers.`);

        const groupedUsers = {};
        for (const u of users) groupedUsers[u.id] = { user: u, papers: [] };
        for (const p of papers) {
            if (groupedUsers[p.user_id]) groupedUsers[p.user_id].papers.push(p);
        }

        const outDir = path.resolve(process.cwd(), '.d1-output');
        if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
        }
        
        const insertBatchFile = path.resolve(outDir, '0000_crdt_migration_batch.sql');
        
        // D1 automatically wraps batch file executions in implicit transactions wrapper safely.
        let sqlFileContents = '/* D1 CRDT Workspace Inserts */\n\n';

        console.log('[Staging DB Port] Engineering Yjs vector snapshots for all workspaces...');

        // Convert the legacy Postgres data to pure CRDT structures
        for (const [userId, record] of Object.entries(groupedUsers)) {
            // Yjs workspace identifier convention (e.g., specific to the user)
            const workspaceId = `crdt_workspace_${userId}`;
            
            const doc = new Y.Doc();
            const yPapersMap = doc.getMap('papers');

            // Embed Legacy relational rows statically into the binary doc state
            for (const paper of record.papers) {
                // Exact deterministic hashing from core/crdtUtils.js
                const hashSource = paper.doi || paper.title || '--';
                const hash = crypto.createHash('sha256').update(hashSource).digest('hex');
                const crdtId = `paper_${hash}`.substring(0, 32);

                const migratedPaperPayload = {
                    title: paper.title,
                    authors: paper.authors,
                    year: paper.year,
                    doi: paper.doi,
                    url: paper.url,
                    abstract: paper.abstract,
                    journal: paper.journal,
                    readingStatus: paper.status,
                    tags: paper.tags,
                    createdAt: paper.created_at,
                    updatedAt: paper.updated_at
                };

                yPapersMap.set(crdtId, migratedPaperPayload);
            }

            // Encode the completed state representing the pre-migration snapshot
            const binarySnapshot = Y.encodeStateAsUpdate(doc);
            
            // Convert Array Buffer to Hex sequence for purely relational SQLite blob insertion
            const hexBlob = Buffer.from(binarySnapshot).toString('hex');
            
            const sqlInsert = `INSERT INTO crdt_documents (id, workspace_id, snapshot) VALUES ('${workspaceId}', '${userId}', x'${hexBlob}') ON CONFLICT(id) DO NOTHING;\n`;
            sqlFileContents += sqlInsert;

            doc.destroy();
        }

        // Omit COMMIT wrapper for D1 natively
        fs.writeFileSync(insertBatchFile, sqlFileContents, 'utf8');

        console.log(`[Staging DB Port] Successfully compiled D1 transaction blob.`);
        console.log(`[Staging DB Port] Total Data Bytes (HEX): ${sqlFileContents.length}\n`);
        console.log(`✅ To execute against staging database:`);
        console.log(`    npx wrangler d1 execute citavers_db --local --file=./.d1-output/0000_crdt_migration_batch.sql`);
        console.log(`\n✅ To execute against production database:`);
        console.log(`    npx wrangler d1 execute citavers_db --remote --file=./.d1-output/0000_crdt_migration_batch.sql\n`);
        
    } catch (e) {
        console.error('[Staging DB Port] Failure during migration generation:', e);
    } finally {
        await pgClient.end();
    }
}

runProductionDataPort();
