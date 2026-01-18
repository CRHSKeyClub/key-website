-- Migrate existing approved/rejected hour requests to archive table
-- Run this AFTER creating the archive table (create_hour_requests_archive.sql)
-- Run this in Supabase SQL Editor

-- Step 1: Check how many records will be moved
SELECT 
  status,
  COUNT(*) as count
FROM hour_requests
WHERE status IN ('approved', 'rejected')
GROUP BY status;

-- Step 2: Move approved requests to archive
INSERT INTO hour_requests_archive
SELECT *, NOW() as archived_at
FROM hour_requests
WHERE status = 'approved';

-- Step 3: Move rejected requests to archive
INSERT INTO hour_requests_archive
SELECT *, NOW() as archived_at
FROM hour_requests
WHERE status = 'rejected';

-- Step 4: Delete approved/rejected from main table
-- (Only delete if insert was successful - you can verify counts first)
DELETE FROM hour_requests
WHERE status IN ('approved', 'rejected');

-- Step 5: Verify the migration
SELECT 
  'hour_requests (main)' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM hour_requests
UNION ALL
SELECT 
  'hour_requests_archive' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM hour_requests_archive;

-- ✅ Migration complete!
-- The hour_requests table now only contains pending requests, making it much faster to query.
-- All approved/rejected requests are in hour_requests_archive for historical reference.
