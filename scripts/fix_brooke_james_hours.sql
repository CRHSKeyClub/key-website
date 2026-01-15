-- Fix Brooke James hours by recalculating from hour_requests
-- This will recalculate volunteering_hours and social_hours from all approved hour_requests
-- Run this in Supabase SQL Editor after merging the accounts

-- Step 1: Find Brooke James account
SELECT 
  id,
  s_number,
  name,
  volunteering_hours,
  social_hours,
  total_hours
FROM students
WHERE LOWER(name) LIKE '%brooke%james%' 
   OR LOWER(name) LIKE '%james%brooke%';

-- Step 2: Recalculate hours from hour_requests and update
DO $$
DECLARE
  brooke_record RECORD;
  calculated_volunteering NUMERIC(10, 2) := 0;
  calculated_social NUMERIC(10, 2) := 0;
  calculated_total NUMERIC(10, 2) := 0;
  request_record RECORD;
BEGIN
  -- Find Brooke James account (the one with hours - should be the only one now)
  SELECT * INTO brooke_record
  FROM students
  WHERE (LOWER(name) LIKE '%brooke%james%' OR LOWER(name) LIKE '%james%brooke%')
  ORDER BY COALESCE(total_hours, 0) DESC, COALESCE(volunteering_hours, 0) DESC
  LIMIT 1;

  IF brooke_record.id IS NULL THEN
    RAISE EXCEPTION '❌ Could not find Brooke James account';
  END IF;

  RAISE NOTICE '📊 Found account: % (ID: %)', brooke_record.s_number, brooke_record.id;
  RAISE NOTICE '   Current hours: % volunteering, % social, % total', 
    COALESCE(brooke_record.volunteering_hours, 0), 
    COALESCE(brooke_record.social_hours, 0), 
    COALESCE(brooke_record.total_hours, 0);
  RAISE NOTICE '';

  -- Calculate hours from all approved hour_requests
  RAISE NOTICE '🔄 Calculating hours from approved hour_requests...';
  
  FOR request_record IN
    SELECT hours_requested, type
    FROM hour_requests
    WHERE LOWER(student_s_number) = LOWER(brooke_record.s_number)
      AND status = 'approved'
  LOOP
    IF LOWER(request_record.type) = 'social' THEN
      calculated_social := calculated_social + COALESCE(request_record.hours_requested, 0);
    ELSE
      -- Default to volunteering if type is null or not social
      calculated_volunteering := calculated_volunteering + COALESCE(request_record.hours_requested, 0);
    END IF;
  END LOOP;

  calculated_total := calculated_volunteering + calculated_social;

  RAISE NOTICE '   Calculated hours: % volunteering, % social, % total', 
    calculated_volunteering, calculated_social, calculated_total;
  RAISE NOTICE '';

  -- Check if hours need to be updated
  IF ABS(COALESCE(brooke_record.volunteering_hours, 0) - calculated_volunteering) > 0.01 OR
     ABS(COALESCE(brooke_record.social_hours, 0) - calculated_social) > 0.01 THEN
    
    RAISE NOTICE '⚠️ Hours mismatch detected!';
    RAISE NOTICE '   Current:  % volunteering, % social, % total', 
      COALESCE(brooke_record.volunteering_hours, 0), 
      COALESCE(brooke_record.social_hours, 0), 
      COALESCE(brooke_record.total_hours, 0);
    RAISE NOTICE '   Calculated: % volunteering, % social, % total', 
      calculated_volunteering, calculated_social, calculated_total;
    RAISE NOTICE '';

    -- Update student hours
    -- The trigger will automatically update total_hours
    UPDATE students
    SET 
      volunteering_hours = calculated_volunteering,
      social_hours = calculated_social,
      last_hour_update = NOW()
    WHERE id = brooke_record.id;

    RAISE NOTICE '✅ Updated hours for %', brooke_record.s_number;
    RAISE NOTICE '   New hours: % volunteering, % social, % total', 
      calculated_volunteering, calculated_social, calculated_total;
  ELSE
    RAISE NOTICE '✅ Hours are already correct - no update needed';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📋 Summary of approved hour_requests:';
  
  -- Show breakdown of hour_requests
  FOR request_record IN
    SELECT 
      event_name,
      event_date,
      hours_requested,
      type,
      submitted_at,
      reviewed_at
    FROM hour_requests
    WHERE LOWER(student_s_number) = LOWER(brooke_record.s_number)
      AND status = 'approved'
    ORDER BY reviewed_at DESC NULLS LAST, submitted_at DESC
  LOOP
    RAISE NOTICE '   - %: % hours (%), Event: %, Date: %', 
      request_record.reviewed_at::date, 
      request_record.hours_requested,
      UPPER(request_record.type),
      request_record.event_name,
      request_record.event_date;
  END LOOP;

END $$;

-- Step 3: Verify the update
SELECT 
  id,
  s_number,
  name,
  volunteering_hours,
  social_hours,
  total_hours,
  (SELECT COUNT(*) FROM hour_requests WHERE LOWER(student_s_number) = LOWER(students.s_number) AND status = 'approved') as approved_requests_count
FROM students
WHERE LOWER(name) LIKE '%brooke%james%' 
   OR LOWER(name) LIKE '%james%brooke%';

-- Step 4: Show all approved hour_requests for verification
SELECT 
  id,
  event_name,
  event_date,
  hours_requested,
  type,
  status,
  submitted_at,
  reviewed_at
FROM hour_requests
WHERE LOWER(student_s_number) IN (
  SELECT LOWER(s_number) 
  FROM students 
  WHERE LOWER(name) LIKE '%brooke%james%' 
     OR LOWER(name) LIKE '%james%brooke%'
)
AND status = 'approved'
ORDER BY reviewed_at DESC NULLS LAST, submitted_at DESC;
