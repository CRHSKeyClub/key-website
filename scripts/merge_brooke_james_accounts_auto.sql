-- Auto-merge Brooke James duplicate accounts
-- This script will automatically detect which account has hours and keep that one
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  account_to_keep RECORD;
  account_to_delete RECORD;
  delete_auth_id UUID;
  keep_auth_id UUID;
  updated_count INTEGER;
BEGIN
  -- Step 1: Find both accounts
  RAISE NOTICE '🔍 Finding Brooke James accounts...';

  -- Get account with hours (KEEP THIS ONE)
  SELECT * INTO account_to_keep
  FROM students
  WHERE (LOWER(name) LIKE '%brooke%james%' OR LOWER(name) LIKE '%james%brooke%')
    AND (COALESCE(total_hours, 0) > 0 OR COALESCE(volunteering_hours, 0) > 0 OR COALESCE(social_hours, 0) > 0)
  ORDER BY COALESCE(total_hours, 0) DESC, COALESCE(volunteering_hours, 0) DESC
  LIMIT 1;

  -- Get account without hours (DELETE THIS ONE)
  SELECT * INTO account_to_delete
  FROM students
  WHERE (LOWER(name) LIKE '%brooke%james%' OR LOWER(name) LIKE '%james%brooke%')
    AND (COALESCE(total_hours, 0) = 0 AND COALESCE(volunteering_hours, 0) = 0 AND COALESCE(social_hours, 0) = 0)
  LIMIT 1;

  -- Validate
  IF account_to_keep.id IS NULL THEN
    RAISE EXCEPTION '❌ Could not find Brooke James account with hours';
  END IF;

  IF account_to_delete.id IS NULL THEN
    RAISE NOTICE '✅ Only one Brooke James account found - no merge needed';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '📊 Merge Plan:';
  RAISE NOTICE '   ✅ KEEP: % (ID: %) - % hours', account_to_keep.s_number, account_to_keep.id, COALESCE(account_to_keep.total_hours, 0);
  RAISE NOTICE '   ❌ DELETE: % (ID: %) - % hours', account_to_delete.s_number, account_to_delete.id, COALESCE(account_to_delete.total_hours, 0);
  RAISE NOTICE '';

  -- Step 2: Update hour_requests
  RAISE NOTICE '🔄 Step 2: Updating hour_requests...';
  UPDATE hour_requests
  SET student_s_number = LOWER(account_to_keep.s_number)
  WHERE LOWER(student_s_number) = LOWER(account_to_delete.s_number);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % hour_requests', updated_count;

  -- Step 3: Update meeting_attendance (delete duplicates first)
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 3: Updating meeting_attendance...';
  
  -- Delete duplicates
  DELETE FROM meeting_attendance ma1
  USING meeting_attendance ma2
  WHERE LOWER(ma1.student_s_number) = LOWER(account_to_delete.s_number)
    AND LOWER(ma2.student_s_number) = LOWER(account_to_keep.s_number)
    AND ma1.meeting_id = ma2.meeting_id;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count > 0 THEN
    RAISE NOTICE '   ✅ Deleted % duplicate attendance records', updated_count;
  END IF;
  
  -- Update remaining
  UPDATE meeting_attendance
  SET student_s_number = LOWER(account_to_keep.s_number)
  WHERE LOWER(student_s_number) = LOWER(account_to_delete.s_number);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Updated % meeting_attendance records', updated_count;

  -- Step 4: Update event_attendees
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 4: Updating event_attendees...';
  
  SELECT id INTO delete_auth_id
  FROM auth_users
  WHERE LOWER(s_number) = LOWER(account_to_delete.s_number)
  LIMIT 1;

  SELECT id INTO keep_auth_id
  FROM auth_users
  WHERE LOWER(s_number) = LOWER(account_to_keep.s_number)
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
    RAISE NOTICE '   ✅ Updated % event_attendees records', updated_count;

    -- Delete auth_user
    DELETE FROM auth_users
    WHERE id = delete_auth_id;
    RAISE NOTICE '   ✅ Deleted auth_user for %', account_to_delete.s_number;
  ELSE
    RAISE NOTICE '   ℹ️ No auth_user found for one or both accounts - skipping event_attendees update';
  END IF;

  -- Step 5: Delete student record
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 5: Deleting duplicate student record...';
  DELETE FROM students
  WHERE id = account_to_delete.id;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Merge Complete!';
  RAISE NOTICE '   Kept: % (ID: %) - % hours', account_to_keep.s_number, account_to_keep.id, COALESCE(account_to_keep.total_hours, 0);
  RAISE NOTICE '   Deleted: % (ID: %)', account_to_delete.s_number, account_to_delete.id;

END $$;

-- Step 6: Verify merge was successful
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
