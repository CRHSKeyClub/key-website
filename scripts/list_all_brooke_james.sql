-- List all Brooke James accounts from students table with their stats
SELECT 
  id,
  s_number,
  name,
  email,
  COALESCE(volunteering_hours, 0) as volunteering_hours,
  COALESCE(social_hours, 0) as social_hours,
  COALESCE(total_hours, 0) as total_hours,
  (SELECT COUNT(*) FROM hour_requests WHERE LOWER(student_s_number) = LOWER(students.s_number)) as total_hour_requests,
  (SELECT COUNT(*) FROM hour_requests WHERE LOWER(student_s_number) = LOWER(students.s_number) AND status = 'approved') as approved_requests,
  (SELECT COUNT(*) FROM hour_requests WHERE LOWER(student_s_number) = LOWER(students.s_number) AND status = 'pending') as pending_requests,
  (SELECT COUNT(*) FROM meeting_attendance WHERE LOWER(student_s_number) = LOWER(students.s_number)) as meeting_attendance_count,
  tshirt_size,
  account_status,
  created_at,
  updated_at
FROM students
WHERE LOWER(name) LIKE '%brooke%james%' 
   OR LOWER(name) LIKE '%james%brooke%'
ORDER BY total_hours DESC NULLS LAST, created_at DESC;
