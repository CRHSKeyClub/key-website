-- Migration Examples: Supabase Query Builder → Neon SQL
-- This file shows how each Supabase query would be written in raw SQL for Neon
-- Reference only - shows the conversion patterns

-- ============================================================
-- EXAMPLE 1: Get All Pending Hour Requests
-- ============================================================

-- Supabase (Query Builder):
-- supabase
--   .from('hour_requests')
--   .select('id, student_s_number, student_name, event_name, hours_requested, status')
--   .eq('status', 'pending')
--   .order('submitted_at', { ascending: true })
--   .limit(25)

-- Neon (Raw SQL):
SELECT 
  id, 
  student_s_number, 
  student_name, 
  event_name, 
  hours_requested, 
  status
FROM hour_requests
WHERE status = 'pending'
ORDER BY submitted_at ASC
LIMIT 25;


-- ============================================================
-- EXAMPLE 2: Search with Multiple Conditions
-- ============================================================

-- Supabase:
-- supabase
--   .from('hour_requests')
--   .select('*')
--   .eq('status', 'pending')
--   .gte('submitted_at', '2024-01-01')
--   .ilike('student_name', '%john%')
--   .or('type.eq.volunteering,type.eq.social')

-- Neon:
SELECT *
FROM hour_requests
WHERE status = 'pending'
  AND submitted_at >= '2024-01-01'
  AND LOWER(student_name) LIKE LOWER('%john%')
  AND (type = 'volunteering' OR type = 'social');


-- ============================================================
-- EXAMPLE 3: Insert with RETURNING
-- ============================================================

-- Supabase:
-- supabase
--   .from('hour_requests')
--   .insert([{
--     student_s_number: 's123456',
--     student_name: 'John Doe',
--     event_name: 'Event',
--     hours_requested: 2,
--     status: 'pending'
--   }])
--   .select()
--   .single()

-- Neon:
INSERT INTO hour_requests (
  student_s_number,
  student_name,
  event_name,
  hours_requested,
  status,
  submitted_at
)
VALUES (
  's123456',
  'John Doe',
  'Event',
  2,
  'pending',
  NOW()
)
RETURNING *;


-- ============================================================
-- EXAMPLE 4: Update with WHERE
-- ============================================================

-- Supabase:
-- supabase
--   .from('hour_requests')
--   .update({
--     status: 'approved',
--     reviewed_at: NOW(),
--     reviewed_by: 'Admin'
--   })
--   .eq('id', 'request-id-123')
--   .select()
--   .single()

-- Neon:
UPDATE hour_requests
SET 
  status = 'approved',
  reviewed_at = NOW(),
  reviewed_by = 'Admin'
WHERE id = 'request-id-123'
RETURNING *;


-- ============================================================
-- EXAMPLE 5: Delete
-- ============================================================

-- Supabase:
-- supabase
--   .from('hour_requests')
--   .delete()
--   .eq('id', 'request-id-123')

-- Neon:
DELETE FROM hour_requests
WHERE id = 'request-id-123';


-- ============================================================
-- EXAMPLE 6: Join Tables
-- ============================================================

-- Supabase:
-- supabase
--   .from('hour_requests')
--   .select(`
--     *,
--     students (name, s_number)
--   `)
--   .eq('status', 'pending')

-- Neon:
SELECT 
  hr.*,
  s.name as student_name,
  s.s_number
FROM hour_requests hr
LEFT JOIN students s ON hr.student_s_number = s.s_number
WHERE hr.status = 'pending';


-- ============================================================
-- EXAMPLE 7: Aggregate Queries
-- ============================================================

-- Supabase:
-- supabase
--   .from('hour_requests')
--   .select('student_s_number, hours_requested, status')
--   .eq('status', 'approved')

-- Then aggregate in JavaScript

-- Neon:
SELECT 
  student_s_number,
  SUM(hours_requested) as total_hours,
  COUNT(*) as request_count
FROM hour_requests
WHERE status = 'approved'
GROUP BY student_s_number
ORDER BY total_hours DESC;


-- ============================================================
-- EXAMPLE 8: Date Filtering
-- ============================================================

-- Supabase:
-- const oneYearAgo = new Date();
-- oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
-- supabase
--   .from('hour_requests')
--   .select('*')
--   .gte('submitted_at', oneYearAgo.toISOString())

-- Neon:
SELECT *
FROM hour_requests
WHERE submitted_at >= NOW() - INTERVAL '1 year';


-- ============================================================
-- EXAMPLE 9: IN Clause
-- ============================================================

-- Supabase:
-- supabase
--   .from('hour_requests')
--   .select('*')
--   .in('status', ['approved', 'rejected'])

-- Neon:
SELECT *
FROM hour_requests
WHERE status IN ('approved', 'rejected');


-- ============================================================
-- EXAMPLE 10: Count with Conditions
-- ============================================================

-- Supabase:
-- supabase
--   .from('hour_requests')
--   .select('*', { count: 'exact', head: true })
--   .eq('status', 'pending')

-- Neon:
SELECT COUNT(*) as total_pending
FROM hour_requests
WHERE status = 'pending';


-- ============================================================
-- PARAMETERIZED QUERIES (How to use in TypeScript with postgres.js)
-- ============================================================

-- ✅ GOOD: Parameterized (safe from SQL injection)
import { sql } from './neonClient';

const studentNumber = 's123456';
const status = 'pending';

const data = await sql`
  SELECT * FROM hour_requests
  WHERE student_s_number = ${studentNumber}
    AND status = ${status}
`;

-- ❌ BAD: String concatenation (SQL injection risk)
const query = `SELECT * FROM hour_requests WHERE student_s_number = '${studentNumber}'`;
// DON'T DO THIS!
