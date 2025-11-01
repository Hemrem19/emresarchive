-- Drop the global unique constraint on doi
DROP INDEX IF EXISTS "papers_doi_key";

-- Add composite unique constraint on (user_id, doi)
-- This allows different users to have papers with the same DOI
-- but prevents a single user from having duplicate DOIs
CREATE UNIQUE INDEX IF NOT EXISTS "papers_user_id_doi_key" ON "papers"("user_id", "doi") WHERE "doi" IS NOT NULL;

