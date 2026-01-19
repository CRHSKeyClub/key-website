-- Remove the "Brooke" account (but NOT "Brooke James")
-- This script will delete the account named exactly "Brooke" and all associated data
-- It will NOT touch the "Brooke James" account

-- Step 1: First, check the account we're deleting (ID: 2579)
SELECT 
  id,
  s_number,
  name,
  email,
  volunteering_hours,
  social_hours,
  total_hours,
  created_at,
  'DELETE THIS ONE' as action
FROM students
WHERE id = '2579';

-- Also show "Brooke James" to confirm it's different
SELECT 
  id,
  s_number,
  name,
  email,
  volunteering_hours,
  social_hours,
  total_hours,
  created_at,
  'KEEP THIS ONE' as action
FROM students
WHERE LOWER(name) LIKE '%brooke%james%';

-- Step 2: Count what will be deleted (dry run)
DO $$
DECLARE
  brooke_account RECORD;
  brooke_s_number TEXT;
  brooke_auth_id UUID;
  hour_requests_count INTEGER;
  attendance_count INTEGER;
  event_attendees_count INTEGER;
BEGIN
  -- Find the "Brooke" account by ID (2579)
  SELECT * INTO brooke_account
  FROM students
  WHERE id = '2579';

  IF brooke_account.id IS NULL THEN
    RAISE NOTICE '❌ Account with ID 2579 not found';
    RETURN;
  END IF;

  -- Double-check it's actually "Brooke" and not "Brooke James"
  IF LOWER(brooke_account.name) LIKE '%brooke%james%' THEN
    RAISE EXCEPTION '❌ STOP: Account ID 2579 appears to be "Brooke James" - aborting for safety';
  END IF;

  brooke_s_number := LOWER(brooke_account.s_number);
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Account to DELETE:';
  RAISE NOTICE '   S Number: %', brooke_account.s_number;
  RAISE NOTICE '   Name: %', brooke_account.name;
  RAISE NOTICE '   Hours: % (V: %, S: %)', 
    COALESCE(brooke_account.total_hours, 0),
    COALESCE(brooke_account.volunteering_hours, 0),
    COALESCE(brooke_account.social_hours, 0);
  RAISE NOTICE '';

  -- Count hour_requests
  SELECT COUNT(*) INTO hour_requests_count
  FROM hour_requests
  WHERE LOWER(student_s_number) = brooke_s_number;
  
  RAISE NOTICE '📋 Will delete:';
  RAISE NOTICE '   - % hour_requests records', hour_requests_count;

  -- Count meeting_attendance
  SELECT COUNT(*) INTO attendance_count
  FROM meeting_attendance
  WHERE LOWER(student_s_number) = brooke_s_number;
  
  RAISE NOTICE '   - % meeting_attendance records', attendance_count;

  -- Get auth_user ID and count event_attendees
  SELECT id INTO brooke_auth_id
  FROM auth_users
  WHERE LOWER(s_number) = brooke_s_number
  LIMIT 1;

  IF brooke_auth_id IS NOT NULL THEN
    SELECT COUNT(*) INTO event_attendees_count
    FROM event_attendees
    WHERE student_id = brooke_auth_id;
    
    RAISE NOTICE '   - % event_attendees records', event_attendees_count;
    RAISE NOTICE '   - 1 auth_users record';
  ELSE
    RAISE NOTICE '   - 0 event_attendees records (no auth_user found)';
  END IF;

  RAISE NOTICE '   - 1 students record';
  RAISE NOTICE '';

END $$;

-- Step 3: Delete all associated data for "Brooke" account only
DO $$
DECLARE
  brooke_account RECORD;
  brooke_s_number TEXT;
  brooke_auth_id UUID;
  deleted_count INTEGER;
BEGIN
  -- Find the "Brooke" account by ID (2579)
  SELECT * INTO brooke_account
  FROM students
  WHERE id = '2579';

  IF brooke_account.id IS NULL THEN
    RAISE EXCEPTION '❌ Account with ID 2579 not found - nothing to delete';
  END IF;

  -- Double-check it's actually "Brooke" and not "Brooke James"
  IF LOWER(brooke_account.name) LIKE '%brooke%james%' THEN
    RAISE EXCEPTION '❌ STOP: Account ID 2579 appears to be "Brooke James" - aborting for safety';
  END IF;

  brooke_s_number := LOWER(brooke_account.s_number);
  
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Starting deletion of account:';
  RAISE NOTICE '   ID: %', brooke_account.id;
  RAISE NOTICE '   Name: %', brooke_account.name;
  RAISE NOTICE '   S Number: %', brooke_account.s_number;
  RAISE NOTICE '';

  -- Step 1: Delete hour_requests
  RAISE NOTICE '🔄 Step 1: Deleting hour_requests...';
  DELETE FROM hour_requests
  WHERE LOWER(student_s_number) = brooke_s_number;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % hour_requests records', deleted_count;

  -- Step 2: Delete meeting_attendance
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 2: Deleting meeting_attendance...';
  DELETE FROM meeting_attendance
  WHERE LOWER(student_s_number) = brooke_s_number;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE '   ✅ Deleted % meeting_attendance records', deleted_count;

  -- Step 3: Delete event_attendees and auth_users
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 3: Deleting event_attendees and auth_users...';
  
  SELECT id INTO brooke_auth_id
  FROM auth_users
  WHERE LOWER(s_number) = brooke_s_number
  LIMIT 1;

  IF brooke_auth_id IS NOT NULL THEN
    -- Delete event_attendees
    DELETE FROM event_attendees
    WHERE student_id = brooke_auth_id;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Deleted % event_attendees records', deleted_count;

    -- Delete auth_user
    DELETE FROM auth_users
    WHERE id = brooke_auth_id;
    
    RAISE NOTICE '   ✅ Deleted auth_user record';
  ELSE
    RAISE NOTICE '   ℹ️ No auth_user found - skipping event_attendees and auth_users deletion';
  END IF;

  -- Step 4: Delete student record
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Step 4: Deleting students record...';
  DELETE FROM students
  WHERE id = brooke_account.id;
  
  RAISE NOTICE '   ✅ Deleted students record';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Deletion Complete!';
  RAISE NOTICE '   Deleted account: % (ID: %, Name: %)', brooke_account.s_number, brooke_account.id, brooke_account.name;
  RAISE NOTICE '   ✅ "Brooke James" account was NOT touched';

END $$;

-- Step 4: Verify deletion (should only show "Brooke James" now)
SELECT 
  id,
  s_number,
  name,
  email,
  volunteering_hours,
  social_hours,
  total_hours,
  created_at
FROM students
WHERE LOWER(name) LIKE '%brooke%'
ORDER BY name;

-- Should only show "Brooke James" account now
