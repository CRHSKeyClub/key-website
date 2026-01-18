-- Check pending hour requests count and stats
-- Run this in Supabase SQL Editor

-- Step 1: Count total pending requests
SELECT 
  COUNT(*) as total_pending_requests
FROM hour_requests
WHERE status = 'pending';

-- Step 2: Break down by type (volunteering vs social)
SELECT 
  type,
  COUNT(*) as count,
  SUM(hours_requested) as total_hours_requested
FROM hour_requests
WHERE status = 'pending'
GROUP BY type
ORDER BY type;

-- Step 3: Show oldest pending requests (most urgent)
SELECT 
  id,
  student_s_number,
  student_name,
  event_name,
  hours_requested,
  type,
  submitted_at,
  EXTRACT(DAY FROM NOW() - submitted_at) as days_old
FROM hour_requests
WHERE status = 'pending'
ORDER BY submitted_at ASC
LIMIT 10;

-- Step 4: Show recent pending requests
SELECT 
  id,
  student_s_number,
  student_name,
  event_name,
  hours_requested,
  type,
  submitted_at,
  EXTRACT(DAY FROM NOW() - submitted_at) as days_old
FROM hour_requests
WHERE status = 'pending'
ORDER BY submitted_at DESC
LIMIT 10;

-- Step 5: Statistics summary
SELECT 
  COUNT(*) as total_pending,
  COUNT(*) FILTER (WHERE type = 'volunteering') as pending_volunteering,
  COUNT(*) FILTER (WHERE type = 'social') as pending_social,
  SUM(hours_requested) as total_hours_pending,
  SUM(hours_requested) FILTER (WHERE type = 'volunteering') as volunteering_hours_pending,
  SUM(hours_requested) FILTER (WHERE type = 'social') as social_hours_pending,
  MIN(submitted_at) as oldest_pending_date,
  MAX(submitted_at) as newest_pending_date,
  AVG(EXTRACT(DAY FROM NOW() - submitted_at)) as avg_days_pending
FROM hour_requests
WHERE status = 'pending';
