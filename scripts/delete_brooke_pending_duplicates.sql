-- Delete Brooke James's PENDING duplicate hour requests
-- Student number: s983454
-- Only removes pending duplicates, keeps approved/rejected requests

-- ============================================================================
-- STEP 1: PREVIEW - See pending duplicates
-- ============================================================================

-- Show all pending requests for Brooke James
SELECT 
  id,
  event_name,
  event_date,
  hours_requested,
  type,
  status,
  submitted_at,
  description
FROM hour_requests
WHERE student_s_number = 's983454'
  AND status = 'pending'
ORDER BY event_name, event_date, submitted_at;

-- Find pending duplicates (same event_name, event_date, hours_requested)
SELECT 
  event_name,
  event_date,
  hours_requested,
  type,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(id ORDER BY submitted_at) as request_ids,
  ARRAY_AGG(submitted_at ORDER BY submitted_at) as submission_dates,
  'Will keep first, delete rest' as action
FROM hour_requests
WHERE student_s_number = 's983454'
  AND status = 'pending'
GROUP BY event_name, event_date, hours_requested, type
HAVING COUNT(*) > 1
ORDER BY event_date DESC;

-- Preview which pending requests will be DELETED
WITH pending_to_keep AS (
  -- Keep the oldest pending request for each unique event
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id
  FROM hour_requests
  WHERE student_s_number = 's983454'
    AND status = 'pending'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
)
SELECT 
  hr.id,
  hr.event_name,
  hr.event_date,
  hr.hours_requested,
  hr.type,
  hr.submitted_at,
  'WILL BE DELETED' as action
FROM hour_requests hr
WHERE hr.student_s_number = 's983454'
  AND hr.status = 'pending'
  AND hr.id NOT IN (SELECT id FROM pending_to_keep)
ORDER BY hr.event_name, hr.event_date, hr.submitted_at;

-- Count how many will be deleted
WITH pending_to_keep AS (
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id
  FROM hour_requests
  WHERE student_s_number = 's983454'
    AND status = 'pending'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
)
SELECT 
  COUNT(*) as total_pending_requests,
  (SELECT COUNT(*) FROM pending_to_keep) as requests_to_keep,
  COUNT(*) - (SELECT COUNT(*) FROM pending_to_keep) as requests_to_delete
FROM hour_requests
WHERE student_s_number = 's983454'
  AND status = 'pending';

-- ============================================================================
-- STEP 2: DELETE PENDING DUPLICATES (run after reviewing preview)
-- ============================================================================

-- Delete pending duplicates, keeping the oldest submission for each event
WITH pending_to_keep AS (
  SELECT DISTINCT ON (event_name, event_date, hours_requested, type)
    id
  FROM hour_requests
  WHERE student_s_number = 's983454'
    AND status = 'pending'
  ORDER BY event_name, event_date, hours_requested, type, submitted_at ASC
)
DELETE FROM hour_requests
WHERE student_s_number = 's983454'
  AND status = 'pending'
  AND id NOT IN (SELECT id FROM pending_to_keep)
RETURNING 
  id, 
  event_name, 
  event_date, 
  hours_requested, 
  type,
  submitted_at;

-- ============================================================================
-- STEP 3: VERIFY - Check results
-- ============================================================================

-- Count remaining pending requests
SELECT 
  COUNT(*) as remaining_pending_requests,
  SUM(hours_requested) as total_pending_hours
FROM hour_requests
WHERE student_s_number = 's983454'
  AND status = 'pending';

-- Verify no pending duplicates remain
SELECT 
  event_name,
  event_date,
  hours_requested,
  type,
  COUNT(*) as count
FROM hour_requests
WHERE student_s_number = 's983454'
  AND status = 'pending'
GROUP BY event_name, event_date, hours_requested, type
HAVING COUNT(*) > 1;

-- If the query above returns no rows, duplicates are gone! ✅

-- Show all remaining pending requests
SELECT 
  id,
  event_name,
  event_date,
  hours_requested,
  type,
  submitted_at
FROM hour_requests
WHERE student_s_number = 's983454'
  AND status = 'pending'
ORDER BY event_date DESC;
