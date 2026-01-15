-- Create January Meeting and Mark All Students as Attended
-- Run this in Supabase SQL Editor
-- 
-- INSTRUCTIONS:
-- 1. Replace ALL instances of '2025-01-15' with your actual January meeting date (YYYY-MM-DD format)
-- 2. Copy and paste the entire script into Supabase SQL Editor
-- 3. Click "Run"
-- 4. Check the results at the bottom

-- ⚠️ CHANGE THIS DATE (replace '2025-01-15' with your actual date in ALL 4 places below)
-- Format: YYYY-MM-DD (e.g., '2025-01-08', '2025-01-22', etc.)

-- Step 1: Create the meeting (if it doesn't already exist)
-- Note: meeting_type must be one of: 'both', 'morning', or 'afternoon'
-- Note: session_type must be one of: 'morning' or 'afternoon' (NOT 'both')
INSERT INTO meetings (meeting_date, meeting_type, attendance_code, is_open, created_by, created_at)
SELECT '2025-01-15'::date, 'both', 'ATTEND', false, 'admin', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM meetings WHERE meeting_date = '2025-01-15'::date
);

-- Step 2: Mark all students as attended (skip if already exists)
-- Note: session_type must be 'morning' or 'afternoon' (using 'morning' as default)
-- If you want 'afternoon' instead, change 'morning' to 'afternoon' on line 34
INSERT INTO meeting_attendance (
  meeting_id,
  student_s_number,
  attendance_code,
  session_type,
  submitted_at
)
SELECT
  (SELECT id FROM meetings WHERE meeting_date = '2025-01-15'::date LIMIT 1),
  LOWER(s_number),
  'ATTEND',
  'morning',  -- Change to 'afternoon' if needed
  NOW()
FROM students
WHERE s_number IS NOT NULL
  AND s_number != ''
  AND LOWER(TRIM(s_number)) LIKE 's%'  -- Ensure it starts with 's'
  AND NOT EXISTS (
    SELECT 1
    FROM meeting_attendance ma
    JOIN meetings m ON ma.meeting_id = m.id
    WHERE m.meeting_date = '2025-01-15'::date
      AND LOWER(ma.student_s_number) = LOWER(students.s_number)
  );

-- Step 3: Show the results
SELECT 
  m.meeting_date,
  m.meeting_type,
  COUNT(ma.id) as attendance_count,
  (SELECT COUNT(*) FROM students WHERE s_number IS NOT NULL AND s_number != '' AND LOWER(TRIM(s_number)) LIKE 's%') as total_students,
  CASE 
    WHEN COUNT(ma.id) >= (SELECT COUNT(*) FROM students WHERE s_number IS NOT NULL AND s_number != '' AND LOWER(TRIM(s_number)) LIKE 's%') * 0.95 
    THEN '✅ Success - All or nearly all students marked'
    ELSE '⚠️ Warning - Some students may be missing'
  END as status
FROM meetings m
LEFT JOIN meeting_attendance ma ON m.id = ma.meeting_id
WHERE m.meeting_date = '2025-01-15'::date
GROUP BY m.id, m.meeting_date, m.meeting_type;
