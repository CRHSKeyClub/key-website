-- Find and analyze Brooke James's duplicate hour requests
-- Student number: s983454

-- Step 1: Check both tables for Brooke James's hour requests
SELECT 
  'hour_requests' as table_name,
  id,
  student_s_number,
  student_name,
  event_name,
  event_date,
  hours_requested,
  type,
  status,
  submitted_at,
  reviewed_at,
  description
FROM hour_requests
WHERE student_s_number = 's983454'
ORDER BY submitted_at DESC;

SELECT 
  'hour_requests_archive' as table_name,
  id,
  student_s_number,
  student_name,
  event_name,
  event_date,
  hours_requested,
  type,
  status,
  submitted_at,
  reviewed_at,
  description
FROM hour_requests_archive
WHERE student_s_number = 's983454'
ORDER BY submitted_at DESC;

-- Step 2: Find potential duplicates (same event_name, event_date, hours_requested)
-- Check main table
SELECT 
  event_name,
  event_date,
  hours_requested,
  type,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY submitted_at) as request_ids,
  ARRAY_AGG(status ORDER BY submitted_at) as statuses,
  ARRAY_AGG(submitted_at ORDER BY submitted_at) as submission_dates
FROM hour_requests
WHERE student_s_number = 's983454'
GROUP BY event_name, event_date, hours_requested, type
HAVING COUNT(*) > 1
ORDER BY event_date DESC;

-- Check archive table
SELECT 
  event_name,
  event_date,
  hours_requested,
  type,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY submitted_at) as request_ids,
  ARRAY_AGG(status ORDER BY submitted_at) as statuses,
  ARRAY_AGG(submitted_at ORDER BY submitted_at) as submission_dates
FROM hour_requests_archive
WHERE student_s_number = 's983454'
GROUP BY event_name, event_date, hours_requested, type
HAVING COUNT(*) > 1
ORDER BY event_date DESC;

-- Step 3: Check for duplicates across both tables
SELECT 
  COALESCE(hr.event_name, hra.event_name) as event_name,
  COALESCE(hr.event_date, hra.event_date) as event_date,
  COALESCE(hr.hours_requested, hra.hours_requested) as hours_requested,
  COALESCE(hr.type, hra.type) as type,
  hr.id as pending_id,
  hr.status as pending_status,
  hra.id as archive_id,
  hra.status as archive_status
FROM hour_requests hr
FULL OUTER JOIN hour_requests_archive hra 
  ON hr.event_name = hra.event_name 
  AND hr.event_date = hra.event_date 
  AND hr.hours_requested = hra.hours_requested
  AND hr.student_s_number = hra.student_s_number
WHERE hr.student_s_number = 's983454' 
  OR hra.student_s_number = 's983454'
ORDER BY event_date DESC;

-- Step 4: Count total requests
SELECT 
  'hour_requests' as table_name,
  COUNT(*) as total_requests,
  SUM(hours_requested) as total_hours
FROM hour_requests
WHERE student_s_number = 's983454'
UNION ALL
SELECT 
  'hour_requests_archive' as table_name,
  COUNT(*) as total_requests,
  SUM(hours_requested) as total_hours
FROM hour_requests_archive
WHERE student_s_number = 's983454';
