-- Check how many Brooke James accounts exist in the students table
-- This will find accounts with "Brooke James" or similar variations in the name

-- Count total Brooke James accounts (case-insensitive, matches full name or variations)
SELECT 
  COUNT(*) as total_brooke_james_accounts,
  COUNT(CASE WHEN LOWER(name) LIKE '%brooke%james%' THEN 1 END) as exact_matches,
  COUNT(CASE WHEN LOWER(name) LIKE '%brooke%' AND LOWER(name) LIKE '%james%' THEN 1 END) as partial_matches
FROM students
WHERE LOWER(name) LIKE '%brooke%' AND LOWER(name) LIKE '%james%';

-- Get detailed list of all Brooke James accounts
SELECT 
  id,
  s_number,
  name,
  email,
  volunteering_hours,
  social_hours,
  total_hours,
  account_status,
  created_at,
  updated_at
FROM students
WHERE LOWER(name) LIKE '%brooke%' AND LOWER(name) LIKE '%james%'
ORDER BY created_at DESC;

-- Also check for variations like "Brooke", "Brooke J", etc.
SELECT 
  id,
  s_number,
  name,
  email,
  volunteering_hours,
  social_hours,
  total_hours,
  account_status,
  created_at
FROM students
WHERE LOWER(name) LIKE '%brooke%'
ORDER BY 
  CASE 
    WHEN LOWER(name) LIKE '%brooke%james%' THEN 1
    WHEN LOWER(name) LIKE '%brooke j%' THEN 2
    ELSE 3
  END,
  created_at DESC;
