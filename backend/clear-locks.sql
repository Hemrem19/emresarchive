-- Clear Prisma advisory locks
-- Run this in Neon SQL Editor if migrations are stuck

-- Check for active locks
SELECT * FROM pg_locks WHERE locktype = 'advisory';

-- Release all advisory locks
SELECT pg_advisory_unlock_all();

-- If above doesn't work, terminate blocking sessions
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle in transaction'
AND query LIKE '%pg_advisory_lock%';

