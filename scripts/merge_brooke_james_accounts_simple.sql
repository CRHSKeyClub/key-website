-- Merge Brooke James duplicate accounts - Simple Version
-- Run this in Supabase SQL Editor
-- 
-- This script will:
-- 1. Find both Brooke James accounts
-- 2. Keep the one with 10 hours
-- 3. Merge data from the 0-hour account
-- 4. Delete the duplicate

-- Step 1: Find both accounts (run this first to see the accounts)
SELECT 
  id,
  s_number,
  name,
  volunteering_hours,
  social_hours,
  total_hours,
  CASE 
    WHEN (COALESCE(total_hours, 0) > 0 OR COALESCE(volunteering_hours, 0) > 0 OR COALESCE(social_hours, 0) > 0) 
    THEN 'KEEP' 
    ELSE 'DELETE' 
  END as action
FROM students
WHERE LOWER(name) LIKE '%brooke%james%' 
   OR LOWER(name) LIKE '%james%brooke%'
ORDER BY total_hours DESC, volunteering_hours DESC, social_hours DESC;

-- Step 2: Run the merge (replace the s_numbers below with actual values from Step 1)
-- After seeing the results above, identify:
-- - KEEP: The account with 10 hours (s_number)
-- - DELETE: The account with 0 hours (s_number)

-- ⚠️ CHANGE THESE TO YOUR ACTUAL S-NUMBERS FROM STEP 1:
-- Example: If Step 1 shows s983454 with 10 hours and s123456 with 0 hours:
DO $$
DECLARE
  -- CHANGE THESE VALUES:
  account_to_keep_s_number TEXT := 's983454';  -- Account with 10 hours (KEEP)
  account_to_delete_s_number TEXT := 's123456';  -- Account with 0 hours (DELETE)
  
  account_to_keep_id UUID;
  account_to_delete_id UUID;
  delete_auth_id UUID;
  keep_auth_id UUID;
  updated_count INTEGER;
BEGIN
  -- Get student IDs
  SELECT id INTO account_to_keep_id
  FROM students
  WHERE LOWER(s_number) = LOWER(account_to_keep_s_number)
  LIMIT 1;

  SELECT id INTO account_to_delete_id
  FROM students
  WHERE LOWER(s_number) = LOWER(account_to_delete_s_number)
  LIMIT 1;

  IF account_to_keep_id IS NULL THEN
    RAISE EXCEPTION 'Account to keep not found: %', account_to_keep_s_number;
  END IF;

  IF account_to_delete_id IS NULL THEN
    RAISE EXCEPTION 'Account to delete not found: %', account_to_delete_s_number;
  END IF;

  RAISE NOTICE 'KEEP: % (ID: %)', account_to_keep_s_number, account_to_keep_id;
  RAISE NOTICE 'DELETE: % (ID: %)', account_to_delete_s_number, account_to_delete_id;

  -- Update hour_requests
  UPDATE hour_requests
  SET student_s_number = account_to_keep_s_number
  WHERE LOWER(student_s_number) = LOWER(account_to_delete_s_number);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % hour_requests', updated_count;

  -- Update meeting_attendance (delete duplicates first)
  DELETE FROM meeting_attendance ma1
  USING meeting_attendance ma2
  WHERE LOWER(ma1.student_s_number) = LOWER(account_to_delete_s_number)
    AND LOWER(ma2.student_s_number) = LOWER(account_to_keep_s_number)
    AND ma1.meeting_id = ma2.meeting_id;
  
  UPDATE meeting_attendance
  SET student_s_number = account_to_keep_s_number
  WHERE LOWER(student_s_number) = LOWER(account_to_delete_s_number);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % meeting_attendance records', updated_count;

  -- Update event_attendees
  SELECT id INTO delete_auth_id
  FROM auth_users
  WHERE LOWER(s_number) = LOWER(account_to_delete_s_number)
  LIMIT 1;

  SELECT id INTO keep_auth_id
  FROM auth_users
  WHERE LOWER(s_number) = LOWER(account_to_keep_s_number)
  LIMIT 1;

  IF delete_auth_id IS NOT NULL AND keep_auth_id IS NOT NULL THEN
    -- Delete duplicates
    DELETE FROM event_attendees ea1
    USING event_attendees ea2
    WHERE ea1.student_id = delete_auth_id
      AND ea2.student_id = keep_auth_id
      AND ea1.event_id = ea2.event_id;
    
    -- Update remaining
    UPDATE event_attendees
    SET student_id = keep_auth_id
    WHERE student_id = delete_auth_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % event_attendees records', updated_count;

    -- Delete auth_user
    DELETE FROM auth_users
    WHERE id = delete_auth_id;
    RAISE NOTICE 'Deleted auth_user for %', account_to_delete_s_number;
  END IF;

  -- Delete student record
  DELETE FROM students
  WHERE id = account_to_delete_id;
  
  RAISE NOTICE '✅ Successfully merged accounts!';
  RAISE NOTICE '   Kept: % (ID: %)', account_to_keep_s_number, account_to_keep_id;
  RAISE NOTICE '   Deleted: % (ID: %)', account_to_delete_s_number, account_to_delete_id;
END $$;

-- Step 3: Verify merge was successful
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

-- Should only show 1 account now with 10 hours
