-- Move ALL data from Brooke James OLD account to NEW account
-- Step 1: Find both accounts and copy their actual UUID IDs

-- First, get the actual IDs for both accounts
-- Look for the accounts and note their id values (UUIDs)
SELECT 
  id,
  s_number,
  name,
  email,
  volunteering_hours,
  social_hours,
  total_hours,
  tshirt_size,
  account_status,
  created_at
FROM students
WHERE LOWER(name) LIKE '%brooke%james%' OR LOWER(name) LIKE '%james%brooke%'
ORDER BY total_hours DESC NULLS LAST, created_at DESC;

-- Step 2: After you see the IDs above, replace the UUIDs in the DO block below
-- Then run the DO block to move everything

DO $$
DECLARE
  -- OLD account = the one with hours/data (ID: 2274)
  -- NEW account = the one to move everything TO (ID: 2581)
  old_student_id INTEGER := 2274;  -- OLD account ID
  new_student_id INTEGER := 2581;  -- NEW account ID
  
  old_student RECORD;
  new_student RECORD;
  old_s TEXT;
  new_s TEXT;
  old_auth_id UUID;
  new_auth_id UUID;
  n INTEGER;
BEGIN
  -- Fetch both student records
  SELECT * INTO old_student FROM students WHERE id = old_student_id;
  SELECT * INTO new_student FROM students WHERE id = new_student_id;

  IF old_student.id IS NULL THEN
    RAISE EXCEPTION 'OLD account not found with ID: %', old_student_id;
  END IF;
  IF new_student.id IS NULL THEN
    RAISE EXCEPTION 'NEW account not found with ID: %', new_student_id;
  END IF;

  old_s := LOWER(old_student.s_number);
  new_s := LOWER(new_student.s_number);

  RAISE NOTICE '';
  RAISE NOTICE '📦 Moving data FROM ID % (s_number: %) TO ID % (s_number: %)', 
    old_student_id, old_s, new_student_id, new_s;
  RAISE NOTICE '   OLD: % | V: % S: % T: %', 
    old_student.name, 
    COALESCE(old_student.volunteering_hours,0), 
    COALESCE(old_student.social_hours,0), 
    COALESCE(old_student.total_hours,0);
  RAISE NOTICE '   NEW: % | V: % S: % T: %', 
    new_student.name,
    COALESCE(new_student.volunteering_hours,0), 
    COALESCE(new_student.social_hours,0), 
    COALESCE(new_student.total_hours,0);
  RAISE NOTICE '';

  -- 1. hour_requests
  UPDATE hour_requests 
  SET student_s_number = new_s 
  WHERE LOWER(student_s_number) = old_s;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '✅ hour_requests: updated % rows', n;

  -- 2. hour_requests_archive (if exists)
  BEGIN
    UPDATE hour_requests_archive 
    SET student_s_number = new_s 
    WHERE LOWER(student_s_number) = old_s;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE '✅ hour_requests_archive: updated % rows', n;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'ℹ️ hour_requests_archive: table does not exist (skip)';
  END;

  -- 3. meeting_attendance: remove duplicates first, then update
  DELETE FROM meeting_attendance ma1
  USING meeting_attendance ma2
  WHERE LOWER(ma1.student_s_number) = old_s
    AND LOWER(ma2.student_s_number) = new_s
    AND ma1.meeting_id = ma2.meeting_id;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN 
    RAISE NOTICE '✅ meeting_attendance: removed % duplicate(s)', n; 
  END IF;

  UPDATE meeting_attendance 
  SET student_s_number = new_s 
  WHERE LOWER(student_s_number) = old_s;
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE '✅ meeting_attendance: updated % rows', n;

  -- 4. event_attendees + auth_users
  SELECT id INTO old_auth_id FROM auth_users WHERE LOWER(s_number) = old_s LIMIT 1;
  SELECT id INTO new_auth_id FROM auth_users WHERE LOWER(s_number) = new_s LIMIT 1;

  IF old_auth_id IS NOT NULL AND new_auth_id IS NOT NULL THEN
    -- Remove duplicates
    DELETE FROM event_attendees ea1
    USING event_attendees ea2
    WHERE ea1.student_id = old_auth_id 
      AND ea2.student_id = new_auth_id 
      AND ea1.event_id = ea2.event_id;
    
    -- Update remaining
    UPDATE event_attendees 
    SET student_id = new_auth_id 
    WHERE student_id = old_auth_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    RAISE NOTICE '✅ event_attendees: updated % rows', n;
    
    -- Delete old auth_user
    DELETE FROM auth_users WHERE id = old_auth_id;
    RAISE NOTICE '✅ auth_users: deleted OLD auth record';
  ELSIF old_auth_id IS NOT NULL THEN
    -- Only old exists, update it to point to new s_number
    UPDATE auth_users SET s_number = new_s WHERE id = old_auth_id;
    RAISE NOTICE '✅ auth_users: updated OLD auth s_number to NEW';
  ELSE
    RAISE NOTICE 'ℹ️ auth_users: no OLD auth record found (skip)';
  END IF;

  -- 5. Copy hours + profile from OLD to NEW student record
  UPDATE students
  SET
    volunteering_hours = COALESCE(old_student.volunteering_hours, 0),
    social_hours       = COALESCE(old_student.social_hours, 0),
    total_hours        = COALESCE(old_student.total_hours, 0),
    last_hour_update   = old_student.last_hour_update,
    tshirt_size        = COALESCE(NULLIF(TRIM(old_student.tshirt_size), ''), students.tshirt_size),
    email              = COALESCE(NULLIF(TRIM(old_student.email), ''), students.email),
    updated_at         = NOW()
  WHERE students.id = new_student_id;
  RAISE NOTICE '✅ students: copied hours and profile from OLD to NEW';

  -- 6. Delete OLD student record
  DELETE FROM students WHERE id = old_student_id;
  RAISE NOTICE '✅ students: deleted OLD account (ID: %)', old_student_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Done! All data moved to ID % (s_number: %)', new_student_id, new_s;
END $$;

-- Step 3: Verify (should only see NEW account with all the hours)
SELECT 
  id,
  s_number,
  name,
  email,
  volunteering_hours,
  social_hours,
  total_hours,
  tshirt_size,
  account_status
FROM students
WHERE LOWER(name) LIKE '%brooke%james%' OR LOWER(name) LIKE '%james%brooke%'
ORDER BY created_at DESC;
