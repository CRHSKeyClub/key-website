-- Delete Brooke James's duplicate hour requests
-- Student number: s983454
-- 
-- IMPORTANT: Run find_brooke_james_duplicates.sql FIRST to identify duplicates
-- Review the output before running this deletion script
--
-- Strategy:
-- 1. For each duplicate group, keep the FIRST submitted request (oldest)
-- 2. Delete all subsequent duplicates (newer submissions)
-- 3. Handle both hour_requests and hour_requests_archive tables

-- ============================================================================
-- STEP 1: PREVIEW - See what will be deleted (run this first!)
-- ============================================================================

-- Preview duplicates that will be KEPT (oldest submission for each event)
WITH duplicates_to_keep AS (
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id,
    event_name,
    event_date,
    hours_requested,
    type,
    status,
    submitted_at,
    'KEEP' as action
  FROM hour_requests
  WHERE student_s_number = 's983454'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
)
SELECT * FROM duplicates_to_keep
ORDER BY submitted_at DESC;

-- Preview duplicates that will be DELETED from hour_requests
WITH duplicates_to_keep AS (
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id
  FROM hour_requests
  WHERE student_s_number = 's983454'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
),
duplicates_to_delete AS (
  SELECT 
    hr.id,
    hr.event_name,
    hr.event_date,
    hr.hours_requested,
    hr.type,
    hr.status,
    hr.submitted_at,
    'DELETE' as action
  FROM hour_requests hr
  WHERE hr.student_s_number = 's983454'
    AND hr.id NOT IN (SELECT id FROM duplicates_to_keep)
)
SELECT * FROM duplicates_to_delete
ORDER BY submitted_at DESC;

-- Preview for archive table - duplicates to KEEP
WITH archive_duplicates_to_keep AS (
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id,
    event_name,
    event_date,
    hours_requested,
    type,
    status,
    submitted_at,
    'KEEP' as action
  FROM hour_requests_archive
  WHERE student_s_number = 's983454'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
)
SELECT * FROM archive_duplicates_to_keep
ORDER BY submitted_at DESC;

-- Preview for archive table - duplicates to DELETE
WITH archive_duplicates_to_keep AS (
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id
  FROM hour_requests_archive
  WHERE student_s_number = 's983454'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
),
archive_duplicates_to_delete AS (
  SELECT 
    hra.id,
    hra.event_name,
    hra.event_date,
    hra.hours_requested,
    hra.type,
    hra.status,
    hra.submitted_at,
    'DELETE' as action
  FROM hour_requests_archive hra
  WHERE hra.student_s_number = 's983454'
    AND hra.id NOT IN (SELECT id FROM archive_duplicates_to_keep)
)
SELECT * FROM archive_duplicates_to_delete
ORDER BY submitted_at DESC;

-- ============================================================================
-- STEP 2: CREATE BACKUP (CRITICAL!)
-- ============================================================================

-- Create backup table for Brooke James's records before deletion
CREATE TEMP TABLE brooke_james_backup AS
SELECT 'hour_requests' as source_table, *
FROM hour_requests
WHERE student_s_number = 's983454'
UNION ALL
SELECT 'hour_requests_archive' as source_table, *
FROM hour_requests_archive
WHERE student_s_number = 's983454';

-- Verify backup
SELECT 
  source_table,
  COUNT(*) as total_records,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM brooke_james_backup
GROUP BY source_table;

-- ============================================================================
-- STEP 3: DELETE DUPLICATES (run only after reviewing preview)
-- ============================================================================

-- Delete duplicates from hour_requests table
-- Keeps the oldest submission for each unique (event_name, event_date, hours_requested, type)
WITH duplicates_to_keep AS (
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id
  FROM hour_requests
  WHERE student_s_number = 's983454'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
)
DELETE FROM hour_requests
WHERE student_s_number = 's983454'
  AND id NOT IN (SELECT id FROM duplicates_to_keep)
RETURNING id, event_name, event_date, hours_requested, status, submitted_at;

-- Delete duplicates from hour_requests_archive table
WITH archive_duplicates_to_keep AS (
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id
  FROM hour_requests_archive
  WHERE student_s_number = 's983454'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
)
DELETE FROM hour_requests_archive
WHERE student_s_number = 's983454'
  AND id NOT IN (SELECT id FROM archive_duplicates_to_keep)
RETURNING id, event_name, event_date, hours_requested, status, submitted_at;

-- ============================================================================
-- STEP 4: VERIFY RESULTS
-- ============================================================================

-- Count remaining records
SELECT 
  'hour_requests' as table_name,
  COUNT(*) as remaining_records,
  SUM(hours_requested) as total_hours
FROM hour_requests
WHERE student_s_number = 's983454'
UNION ALL
SELECT 
  'hour_requests_archive' as table_name,
  COUNT(*) as remaining_records,
  SUM(hours_requested) as total_hours
FROM hour_requests_archive
WHERE student_s_number = 's983454';

-- Verify no duplicates remain
SELECT 
  'hour_requests' as table_name,
  event_name,
  event_date,
  hours_requested,
  type,
  COUNT(*) as count
FROM hour_requests
WHERE student_s_number = 's983454'
GROUP BY event_name, event_date, hours_requested, type
HAVING COUNT(*) > 1;

SELECT 
  'hour_requests_archive' as table_name,
  event_name,
  event_date,
  hours_requested,
  type,
  COUNT(*) as count
FROM hour_requests_archive
WHERE student_s_number = 's983454'
GROUP BY event_name, event_date, hours_requested, type
HAVING COUNT(*) > 1;

-- Compare before and after
SELECT 
  'BEFORE (from backup)' as status,
  source_table,
  COUNT(*) as total_records
FROM brooke_james_backup
GROUP BY source_table
UNION ALL
SELECT 
  'AFTER' as status,
  'hour_requests' as source_table,
  COUNT(*) as total_records
FROM hour_requests
WHERE student_s_number = 's983454'
UNION ALL
SELECT 
  'AFTER' as status,
  'hour_requests_archive' as source_table,
  COUNT(*) as total_records
FROM hour_requests_archive
WHERE student_s_number = 's983454';

-- ============================================================================
-- STEP 5: UPDATE STUDENT TOTALS (if approved hours were deleted)
-- ============================================================================

-- Recalculate Brooke James's total hours from approved requests only
WITH approved_hours AS (
  SELECT 
    SUM(CASE WHEN type = 'Volunteering' THEN hours_requested ELSE 0 END) as volunteering_hours,
    SUM(CASE WHEN type = 'Social' THEN hours_requested ELSE 0 END) as social_hours
  FROM hour_requests_archive
  WHERE student_s_number = 's983454'
    AND status = 'approved'
)
UPDATE students
SET 
  volunteering_hours = (SELECT volunteering_hours FROM approved_hours),
  social_hours = (SELECT social_hours FROM approved_hours),
  total_hours = (SELECT volunteering_hours + social_hours FROM approved_hours),
  last_hour_update = NOW()
WHERE s_number = 's983454'
RETURNING s_number, name, volunteering_hours, social_hours, total_hours;

-- ✅ Deletion complete!
-- To restore from backup (if needed):
-- INSERT INTO hour_requests SELECT * FROM brooke_james_backup WHERE source_table = 'hour_requests';
-- INSERT INTO hour_requests_archive SELECT * FROM brooke_james_backup WHERE source_table = 'hour_requests_archive';
