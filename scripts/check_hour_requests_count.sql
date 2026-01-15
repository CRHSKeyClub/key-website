-- Check how many hour requests you have
-- This will help diagnose if the issue is too many records

SELECT 
  'Total hour requests' AS metric,
  COUNT(*) AS count
FROM hour_requests
UNION ALL
SELECT 
  'Pending requests' AS metric,
  COUNT(*) AS count
FROM hour_requests
WHERE status = 'pending'
UNION ALL
SELECT 
  'Pending (last 6 months)' AS metric,
  COUNT(*) AS count
FROM hour_requests
WHERE status = 'pending'
  AND submitted_at >= NOW() - INTERVAL '6 months'
UNION ALL
SELECT 
  'Pending (last 3 months)' AS metric,
  COUNT(*) AS count
FROM hour_requests
WHERE status = 'pending'
  AND submitted_at >= NOW() - INTERVAL '3 months'
UNION ALL
SELECT 
  'Approved requests' AS metric,
  COUNT(*) AS count
FROM hour_requests
WHERE status = 'approved'
UNION ALL
SELECT 
  'Rejected requests' AS metric,
  COUNT(*) AS count
FROM hour_requests
WHERE status = 'rejected';

-- If you have thousands of pending requests, that's likely the issue
-- Consider archiving old approved/rejected requests
