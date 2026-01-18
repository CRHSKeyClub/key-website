-- Reduce Database Size to get under 0.5 GB limit
-- Database is currently 0.553 GB (111% of 0.5 GB limit)
-- Run this in Supabase SQL Editor

-- Step 1: Check current table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Step 2: Archive old approved/rejected hour_requests (if archive table exists)
-- This moves data out of main hour_requests table, reducing its size
-- Already handled by create_hour_requests_archive.sql if you ran it

-- Step 3: Delete very old hour_requests (older than 2 years) that are approved/rejected
-- Only do this AFTER confirming you have backups!
-- WARNING: This permanently deletes data - run migration first!
DELETE FROM hour_requests
WHERE status IN ('approved', 'rejected')
  AND submitted_at < NOW() - INTERVAL '2 years';

-- If archive table exists, also clean up very old archived requests
DELETE FROM hour_requests_archive
WHERE status IN ('approved', 'rejected')
  AND submitted_at < NOW() - INTERVAL '2 years';

-- Step 4: Clean up old proof photos in descriptions (they can be very large)
-- This removes base64 image data from descriptions older than 1 year
-- The images are stored elsewhere, so this just removes redundant data
UPDATE hour_requests
SET description = REGEXP_REPLACE(
  description, 
  'data:image/[^;]+;base64,[A-Za-z0-9+/=]{100,}', 
  '[Photo stored in archive]',
  'g'
)
WHERE description LIKE '%base64%'
  AND submitted_at < NOW() - INTERVAL '1 year';

UPDATE hour_requests_archive
SET description = REGEXP_REPLACE(
  description, 
  'data:image/[^;]+;base64,[A-Za-z0-9+/=]{100,}', 
  '[Photo stored in archive]',
  'g'
)
WHERE description LIKE '%base64%'
  AND submitted_at < NOW() - INTERVAL '1 year';

-- Step 5: Vacuum to reclaim space
VACUUM FULL hour_requests;
VACUUM FULL hour_requests_archive;
VACUUM FULL students;
VACUUM FULL auth_users;

-- Step 6: Check size again
SELECT 
  pg_size_pretty(pg_database_size(current_database())) as total_database_size;
