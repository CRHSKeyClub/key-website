-- Create optimal partial index for pending hour requests
-- This index ONLY includes pending requests, making it much smaller and faster
-- Run this in Supabase SQL Editor

-- Drop existing index if it exists (in case we want to recreate it)
DROP INDEX IF EXISTS idx_hour_requests_pending_submitted_at;

-- Create partial index for pending requests only
-- This is MUCH faster than a full index because it only indexes pending rows
CREATE INDEX idx_hour_requests_pending_submitted_at
ON hour_requests(submitted_at DESC)
WHERE status = 'pending';

-- Composite partial index for the exact query pattern (status + submitted_at for pending only)
DROP INDEX IF EXISTS idx_hour_requests_pending_status_submitted_at;

CREATE INDEX idx_hour_requests_pending_status_submitted_at
ON hour_requests(status, submitted_at DESC)
WHERE status = 'pending';

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'hour_requests'
  AND (indexname LIKE '%pending%' OR indexname LIKE '%status%submitted%')
ORDER BY indexname;

-- Check index sizes
SELECT 
  pg_size_pretty(pg_relation_size('idx_hour_requests_pending_submitted_at')) as pending_submitted_at_index_size,
  pg_size_pretty(pg_relation_size('idx_hour_requests_pending_status_submitted_at')) as pending_status_submitted_at_index_size,
  pg_size_pretty(pg_relation_size('hour_requests')) as table_size;
