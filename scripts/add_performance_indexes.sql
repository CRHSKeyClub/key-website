-- Performance indexes to fix timeout issues
-- Run this in Supabase SQL Editor to improve query performance
-- These indexes are critical for preventing timeout errors (code 57014)

-- Index on hour_requests.status (most commonly filtered column)
-- This significantly speeds up getAllHourRequests() and searchHourRequests()
CREATE INDEX IF NOT EXISTS idx_hour_requests_status 
ON hour_requests(status);

-- Index on hour_requests.submitted_at (used for ordering)
CREATE INDEX IF NOT EXISTS idx_hour_requests_submitted_at 
ON hour_requests(submitted_at);

-- Composite index for common query pattern: status + submitted_at
CREATE INDEX IF NOT EXISTS idx_hour_requests_status_submitted_at 
ON hour_requests(status, submitted_at);

-- Index on hour_requests.student_s_number (for filtering by student)
CREATE INDEX IF NOT EXISTS idx_hour_requests_student_s_number 
ON hour_requests(student_s_number);

-- Index on students.s_number (primary lookup column)
CREATE INDEX IF NOT EXISTS idx_students_s_number 
ON students(s_number);

-- Index on students.name (for ordering)
CREATE INDEX IF NOT EXISTS idx_students_name 
ON students(name);

-- Index on auth_users.s_number (for join with students)
CREATE INDEX IF NOT EXISTS idx_auth_users_s_number 
ON auth_users(s_number);

-- Index on event_attendees.event_id (for event queries)
CREATE INDEX IF NOT EXISTS idx_event_attendees_event_id 
ON event_attendees(event_id);

-- Index on event_attendees.student_id (for student queries)
CREATE INDEX IF NOT EXISTS idx_event_attendees_student_id 
ON event_attendees(student_id);

-- Index on meeting_attendance.meeting_id (for meeting queries)
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_meeting_id 
ON meeting_attendance(meeting_id);

-- Index on meeting_attendance.student_s_number (for student queries)
CREATE INDEX IF NOT EXISTS idx_meeting_attendance_student_s_number 
ON meeting_attendance(student_s_number);

-- Verify indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('hour_requests', 'students', 'auth_users', 'event_attendees', 'meeting_attendance')
ORDER BY tablename, indexname;
