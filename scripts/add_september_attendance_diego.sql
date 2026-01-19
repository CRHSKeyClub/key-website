-- Simple script to add September 9th attendance for all students named Diego

-- Step 1: First, make sure the September 9th meeting exists (create it if needed)
INSERT INTO meetings (meeting_date, meeting_type, attendance_code, is_open, created_by, created_at)
SELECT '2025-09-09', 'both', 'ATTEND', false, 'admin', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM meetings WHERE meeting_date = '2025-09-09'
);

-- Step 2: Add attendance for all Diego students (using 'morning' as default)
-- Change 'morning' to 'afternoon' if needed
-- This will skip any that already have attendance for this meeting
INSERT INTO meeting_attendance (meeting_id, student_s_number, attendance_code, session_type, submitted_at)
SELECT 
  m.id,
  LOWER(s.s_number),
  'IMPORTED',
  'morning', -- Valid values: 'morning' or 'afternoon' (NOT 'both')
  NOW()
FROM students s
CROSS JOIN meetings m
WHERE LOWER(s.name) LIKE '%diego%'
  AND m.meeting_date = '2025-09-09'
  AND NOT EXISTS (
    SELECT 1 
    FROM meeting_attendance ma 
    WHERE ma.meeting_id = m.id 
      AND LOWER(ma.student_s_number) = LOWER(s.s_number)
  );

-- Step 3: Verify it worked
SELECT 
  s.name,
  s.s_number,
  m.meeting_date,
  ma.attendance_code
FROM meeting_attendance ma
JOIN meetings m ON ma.meeting_id = m.id
JOIN students s ON LOWER(ma.student_s_number) = LOWER(s.s_number)
WHERE LOWER(s.name) LIKE '%diego%'
  AND m.meeting_date = '2025-09-09';
