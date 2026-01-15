-- Verify that indexes were created successfully
-- Run this in Supabase SQL Editor to check if indexes exist

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('hour_requests', 'students', 'auth_users', 'event_attendees', 'meeting_attendance')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check table sizes to see if we have a large dataset
SELECT 
  'hour_requests' AS table_name,
  COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_rows,
  COUNT(*) FILTER (WHERE submitted_at > NOW() - INTERVAL '1 year') AS recent_pending_rows
FROM hour_requests
UNION ALL
SELECT 
  'students' AS table_name,
  COUNT(*) AS total_rows,
  NULL AS pending_rows,
  NULL AS recent_pending_rows
FROM students;

-- Check if indexes are being used (this query should use the index)
EXPLAIN ANALYZE
SELECT id, student_s_number, student_name, event_name, event_date, hours_requested, description, type, status, submitted_at, reviewed_at, reviewed_by, admin_notes, image_name
FROM hour_requests
WHERE status = 'pending'
  AND submitted_at >= NOW() - INTERVAL '1 year'
ORDER BY submitted_at ASC
LIMIT 100;
