-- Improved indexes for better performance
-- Run this AFTER running add_performance_indexes.sql
-- These additional indexes may help with complex queries

-- Composite index that matches the exact query pattern in getAllHourRequests
-- This covers: status = 'pending' + submitted_at >= date + ORDER BY submitted_at
-- This single index should handle the entire query efficiently
CREATE INDEX IF NOT EXISTS idx_hour_requests_status_submitted_at_composite
ON hour_requests(status, submitted_at DESC)
WHERE status = 'pending';

-- Partial index specifically for pending requests (smaller and faster)
-- This creates an index ONLY for pending requests, which is much smaller
CREATE INDEX IF NOT EXISTS idx_hour_requests_pending_submitted_at
ON hour_requests(submitted_at DESC)
WHERE status = 'pending';

-- Index for search queries (status + text search columns)
CREATE INDEX IF NOT EXISTS idx_hour_requests_status_text_search
ON hour_requests(status, student_s_number, student_name, event_name)
WHERE status IN ('pending', 'approved', 'rejected');

-- Verify the new indexes
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'hour_requests'
  AND indexname LIKE 'idx_hour_requests%'
ORDER BY indexname;
