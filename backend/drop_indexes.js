import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Dropping conflicting indexes...');

        // Drop papers_user_id_doi_key
        try {
            await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "papers_user_id_doi_key";`);
            console.log('Dropped papers_user_id_doi_key');
        } catch (e) {
            console.log('Error dropping papers_user_id_doi_key:', e.message);
        }

        // Drop users_verification_token_key
        try {
            await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "users_verification_token_key";`);
            console.log('Dropped users_verification_token_key');
        } catch (e) {
            console.log('Error dropping users_verification_token_key:', e.message);
        }

        console.log('Done.');
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
