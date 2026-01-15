-- Troubleshooting query timeout issues
-- Run these queries to diagnose the problem

-- 1. Check if indexes exist and are being used
SELECT 
  indexname,
  indexdef,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename = 'hour_requests'
ORDER BY idx_scan DESC;

-- 2. Check table statistics
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename = 'hour_requests';

-- 3. Check for table bloat (if table is bloated, it slows down queries)
SELECT 
  pg_size_pretty(pg_total_relation_size('hour_requests')) AS total_size,
  pg_size_pretty(pg_relation_size('hour_requests')) AS table_size,
  pg_size_pretty(pg_total_relation_size('hour_requests') - pg_relation_size('hour_requests')) AS indexes_size;

-- 4. Test the exact query being run
-- This will show the execution plan and time
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT id, student_s_number, student_name, event_name, event_date, hours_requested, description, type, status, submitted_at, reviewed_at, reviewed_by, admin_notes, image_name
FROM hour_requests
WHERE status = 'pending'
  AND submitted_at >= NOW() - INTERVAL '6 months'
ORDER BY submitted_at ASC
LIMIT 100;

-- 5. Count how many pending requests there are
SELECT 
  COUNT(*) AS total_pending,
  COUNT(*) FILTER (WHERE submitted_at >= NOW() - INTERVAL '6 months') AS recent_pending,
  COUNT(*) FILTER (WHERE submitted_at < NOW() - INTERVAL '6 months') AS old_pending
FROM hour_requests
WHERE status = 'pending';

-- 6. If the table hasn't been vacuumed recently, run this:
-- VACUUM ANALYZE hour_requests;
