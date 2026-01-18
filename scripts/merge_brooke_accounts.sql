-- Merge Brooke accounts - Brooke James and Brooke
-- Run this in Supabase SQL Editor
-- 
-- This script will:
-- 1. Find both Brooke accounts (Brooke James and Brooke)
-- 2. Keep the one with more hours
-- 3. Merge all data from the other account
-- 4. Delete the duplicate

-- Step 1: Find both accounts (run this first to see the accounts)
SELECT 
  id,
  s_number,
  name,
  volunteering_hours,
  social_hours,
  total_hours,
  email,
  CASE 
    WHEN (COALESCE(total_hours, 0) > 0 OR COALESCE(volunteering_hours, 0) > 0 OR COALESCE(social_hours, 0) > 0) 
    THEN 'KEEP' 
    ELSE 'CHECK' 
  END as action
FROM students
WHERE (LOWER(name) = 'brooke james' OR LOWER(name) = 'brooke')
   AND LOWER(name) LIKE '%brooke%'
ORDER BY total_hours DESC, volunteering_hours DESC, social_hours DESC;

-- Step 2: Auto-detect and merge (finds both accounts automatically)
DO $$
DECLARE
  brooke_james_record RECORD;
  brooke_record RECORD;
  account_to_keep_s_number TEXT;
  account_to_delete_s_number TEXT;
  account_to_keep_id UUID;
  account_to_delete_id UUID;
  delete_auth_id UUID;
  keep_auth_id UUID;
  updated_count INTEGER;
BEGIN
  -- Find "Brooke James" account
  SELECT * INTO brooke_james_record
  FROM students
  WHERE LOWER(name) = 'brooke james'
  LIMIT 1;

  -- Find "Brooke" account
  SELECT * INTO brooke_record
  FROM students
  WHERE LOWER(name) = 'brooke'
    AND LOWER(name) != 'brooke james'
  LIMIT 1;

  -- Determine which to keep (prefer Brooke James if both exist, otherwise keep the one with more hours)
  IF brooke_james_record.id IS NOT NULL AND brooke_record.id IS NOT NULL THEN
    -- Both exist - keep Brooke James (full name)
    account_to_keep_s_number := brooke_james_record.s_number;
    account_to_delete_s_number := brooke_record.s_number;
    account_to_keep_id := brooke_james_record.id;
    account_to_delete_id := brooke_record.id;
    
    -- If Brooke James has fewer hours, merge hours from Brooke
    IF (COALESCE(brooke_james_record.total_hours, 0) < COALESCE(brooke_record.total_hours, 0)) THEN
      RAISE NOTICE '⚠️ Brooke James has fewer hours. Merging hours...';
      UPDATE students
      SET 
        volunteering_hours = COALESCE(volunteering_hours, 0) + COALESCE(brooke_record.volunteering_hours, 0),
        social_hours = COALESCE(social_hours, 0) + COALESCE(brooke_record.social_hours, 0),
        total_hours = COALESCE(volunteering_hours, 0) + COALESCE(social_hours, 0) + 
                     COALESCE(brooke_record.volunteering_hours, 0) + COALESCE(brooke_record.social_hours, 0)
      WHERE id = account_to_keep_id;
    END IF;
    
  ELSIF brooke_james_record.id IS NOT NULL THEN
    -- Only Brooke James exists
    RAISE NOTICE 'ℹ️ Only "Brooke James" account found - nothing to merge';
    RETURN;
    
  ELSIF brooke_record.id IS NOT NULL THEN
    -- Only Brooke exists - rename to Brooke James
    RAISE NOTICE 'ℹ️ Only "Brooke" account found - renaming to "Brooke James"';
    UPDATE students
    SET name = 'Brooke James'
    WHERE id = brooke_record.id;
    RETURN;
    
  ELSE
    RAISE EXCEPTION '❌ Could not find either Brooke James or Brooke account';
  END IF;

  RAISE NOTICE '🔍 Found both accounts:';
  RAISE NOTICE '   KEEP: % (ID: %, % hours)', account_to_keep_s_number, account_to_keep_id, 
                COALESCE(brooke_james_record.total_hours, 0);
  RAISE NOTICE '   DELETE: % (ID: %, % hours)', account_to_delete_s_number, account_to_delete_id,
                COALESCE(brooke_record.total_hours, 0);

  -- Update hour_requests (move to keep account)
  UPDATE hour_requests
  SET student_s_number = account_to_keep_s_number,
      student_name = 'Brooke James'
  WHERE LOWER(student_s_number) = LOWER(account_to_delete_s_number);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE '✅ Updated % hour_requests records', updated_count;

  -- Update hour_requests_archive (if it exists)
  BEGIN
    UPDATE hour_requests_archive
    SET student_s_number = account_to_keep_s_number,
        student_name = 'Brooke James'
    WHERE LOWER(student_s_number) = LOWER(account_to_delete_s_number);
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % hour_requests_archive records', updated_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ hour_requests_archive table does not exist (skipping)';
  END;

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
  RAISE NOTICE '✅ Updated % meeting_attendance records', updated_count;

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
    -- Delete duplicate event registrations
    DELETE FROM event_attendees ea1
    USING event_attendees ea2
    WHERE ea1.student_id = delete_auth_id
      AND ea2.student_id = keep_auth_id
      AND ea1.event_id = ea2.event_id;
    
    -- Move remaining registrations
    UPDATE event_attendees
    SET student_id = keep_auth_id
    WHERE student_id = delete_auth_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Updated % event_attendees records', updated_count;

    -- Delete auth_user for duplicate
    DELETE FROM auth_users
    WHERE id = delete_auth_id;
    RAISE NOTICE '✅ Deleted auth_user for %', account_to_delete_s_number;
  ELSIF delete_auth_id IS NOT NULL THEN
    -- Delete orphaned auth_user
    DELETE FROM auth_users
    WHERE id = delete_auth_id;
    RAISE NOTICE '✅ Deleted orphaned auth_user for %', account_to_delete_s_number;
  END IF;

  -- Delete duplicate student record
  DELETE FROM students
  WHERE id = account_to_delete_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Successfully merged Brooke accounts!';
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
WHERE LOWER(name) = 'brooke james' 
   OR LOWER(name) = 'brooke';

-- Should only show 1 account now (Brooke James)
