-- Mark all students' attendance as present for:
-- - September 2024 (last year)
-- - January 2025 (this year)
-- This will create meetings if they don't exist and add attendance for all students

-- Step 1: Create September 2024 meeting if it doesn't exist
-- Change the date to the specific September date you want
INSERT INTO meetings (meeting_date, meeting_type, attendance_code, is_open, created_by, created_at)
SELECT '2024-09-15', 'both', 'ATTEND', false, 'admin', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM meetings WHERE meeting_date = '2024-09-15'
);

-- Step 2: Create January 2025 meeting if it doesn't exist
-- Change the date to the specific January date you want
INSERT INTO meetings (meeting_date, meeting_type, attendance_code, is_open, created_by, created_at)
SELECT '2025-01-15', 'both', 'ATTEND', false, 'admin', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM meetings WHERE meeting_date = '2025-01-15'
);

-- Step 3: Add attendance for ALL students for September 2024
INSERT INTO meeting_attendance (meeting_id, student_s_number, attendance_code, session_type, submitted_at)
SELECT 
  m.id,
  LOWER(s.s_number),
  'IMPORTED',
  'morning', -- Change to 'afternoon' if needed
  NOW()
FROM students s
CROSS JOIN meetings m
WHERE m.meeting_date = '2024-09-15'
  AND NOT EXISTS (
    SELECT 1 
    FROM meeting_attendance ma 
    WHERE ma.meeting_id = m.id 
      AND LOWER(ma.student_s_number) = LOWER(s.s_number)
  );

-- Step 4: Add attendance for ALL students for January 2025
INSERT INTO meeting_attendance (meeting_id, student_s_number, attendance_code, session_type, submitted_at)
SELECT 
  m.id,
  LOWER(s.s_number),
  'IMPORTED',
  'morning', -- Change to 'afternoon' if needed
  NOW()
FROM students s
CROSS JOIN meetings m
WHERE m.meeting_date = '2025-01-15'
  AND NOT EXISTS (
    SELECT 1 
    FROM meeting_attendance ma 
    WHERE ma.meeting_id = m.id 
      AND LOWER(ma.student_s_number) = LOWER(s.s_number)
  );

-- Step 5: Verify - show counts
SELECT 
  'September 2024' as meeting,
  COUNT(*) as attendance_count
FROM meeting_attendance ma
JOIN meetings m ON ma.meeting_id = m.id
WHERE m.meeting_date = '2024-09-15'

UNION ALL

SELECT 
  'January 2025' as meeting,
  COUNT(*) as attendance_count
FROM meeting_attendance ma
JOIN meetings m ON ma.meeting_id = m.id
WHERE m.meeting_date = '2025-01-15';
