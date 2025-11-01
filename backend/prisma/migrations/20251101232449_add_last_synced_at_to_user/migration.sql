-- AlterTable
-- Note: Column may already exist from manual migration, using IF NOT EXISTS pattern
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_synced_at'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "last_synced_at" TIMESTAMP(3);
    END IF;
END $$;

