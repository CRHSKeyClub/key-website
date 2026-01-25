-- Fix timeout and whitespace issues
-- This script addresses two main problems:
-- 1. Query timeouts due to missing indexes on hour_requests_archive
-- 2. Trailing whitespace in student_s_number fields causing query failures

-- ============================================================================
-- PART 1: Add missing indexes on hour_requests_archive
-- ============================================================================

-- Composite index for student lookups (most important for getStudentHourRequests)
-- This index covers: student_s_number + status + submitted_at ordering
CREATE INDEX IF NOT EXISTS idx_hour_requests_archive_student_status_submitted 
ON hour_requests_archive(student_s_number, status, submitted_at DESC);

-- Additional indexes if they don't exist (should already be there from create script)
CREATE INDEX IF NOT EXISTS idx_hour_requests_archive_status 
ON hour_requests_archive(status);

CREATE INDEX IF NOT EXISTS idx_hour_requests_archive_submitted_at 
ON hour_requests_archive(submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_hour_requests_archive_student_s_number 
ON hour_requests_archive(student_s_number);

-- ============================================================================
-- PART 2: Clean up whitespace in student_s_number fields
-- ============================================================================

-- Check for records with trailing/leading whitespace
SELECT 
  'hour_requests' as table_name,
  COUNT(*) as records_with_whitespace
FROM hour_requests
WHERE student_s_number != TRIM(student_s_number);

SELECT 
  'hour_requests_archive' as table_name,
  COUNT(*) as records_with_whitespace
FROM hour_requests_archive
WHERE student_s_number != TRIM(student_s_number);

SELECT 
  'students' as table_name,
  COUNT(*) as records_with_whitespace
FROM students
WHERE s_number != TRIM(s_number);

-- Clean up hour_requests table
UPDATE hour_requests
SET student_s_number = TRIM(LOWER(student_s_number))
WHERE student_s_number != TRIM(LOWER(student_s_number));

-- Clean up hour_requests_archive table
UPDATE hour_requests_archive
SET student_s_number = TRIM(LOWER(student_s_number))
WHERE student_s_number != TRIM(LOWER(student_s_number));

-- Clean up students table
UPDATE students
SET s_number = TRIM(LOWER(s_number))
WHERE s_number != TRIM(LOWER(s_number));

-- Clean up auth_users table (if it has whitespace)
UPDATE auth_users
SET s_number = TRIM(LOWER(s_number))
WHERE s_number != TRIM(LOWER(s_number));

-- ============================================================================
-- PART 3: Add constraint to prevent future whitespace issues
-- ============================================================================

-- Add check constraints to ensure no leading/trailing whitespace in future inserts/updates
-- Note: This will fail if there are still records with whitespace, so run after cleanup

ALTER TABLE hour_requests
ADD CONSTRAINT IF NOT EXISTS check_student_s_number_no_whitespace
CHECK (student_s_number = TRIM(student_s_number));

ALTER TABLE hour_requests_archive
ADD CONSTRAINT IF NOT EXISTS check_student_s_number_no_whitespace
CHECK (student_s_number = TRIM(student_s_number));

ALTER TABLE students
ADD CONSTRAINT IF NOT EXISTS check_s_number_no_whitespace
CHECK (s_number = TRIM(s_number));

-- ============================================================================
-- PART 4: Verify the fixes
-- ============================================================================

-- Check indexes on hour_requests_archive
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'hour_requests_archive'
  AND indexname LIKE 'idx_hour_requests_archive%'
ORDER BY indexname;

-- Verify no whitespace remains
SELECT 
  'hour_requests' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE student_s_number != TRIM(student_s_number)) as records_with_whitespace
FROM hour_requests
UNION ALL
SELECT 
  'hour_requests_archive' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE student_s_number != TRIM(student_s_number)) as records_with_whitespace
FROM hour_requests_archive
UNION ALL
SELECT 
  'students' as table_name,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE s_number != TRIM(s_number)) as records_with_whitespace
FROM students;

-- Test query performance for Brooke James specifically
EXPLAIN ANALYZE
SELECT *
FROM hour_requests_archive
WHERE student_s_number = 's983454'
  AND status IN ('approved', 'rejected')
ORDER BY submitted_at DESC;

-- ✅ Script complete!
-- The queries should now be much faster and no longer timeout.
