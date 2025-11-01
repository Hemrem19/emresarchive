-- AlterTable
-- Note: Columns may already exist, using IF NOT EXISTS pattern
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'verification_token'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "verification_token" VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'verification_token_expiry'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "verification_token_expiry" TIMESTAMP(3);
    END IF;
END $$;

-- CreateIndex
-- Note: Index may already exist, using IF NOT EXISTS pattern
CREATE UNIQUE INDEX IF NOT EXISTS "users_verification_token_key" ON "users"("verification_token") WHERE "verification_token" IS NOT NULL;
