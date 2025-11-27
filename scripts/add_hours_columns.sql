-- Migration script to add volunteering_hours and social_hours columns to students table
-- Run this in Supabase SQL Editor BEFORE running the CSV import script

-- Step 1: Add volunteering_hours column (defaults to 0)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS volunteering_hours NUMERIC(10, 2) DEFAULT 0;

-- Step 2: Add social_hours column (defaults to 0)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS social_hours NUMERIC(10, 2) DEFAULT 0;

-- Step 3: Split existing total_hours into volunteering_hours and social_hours
-- Since we don't have the split in the database, we'll move all to volunteering_hours
-- The CSV import will then set the correct split based on CSV data
-- Only update if volunteering_hours is 0 or NULL (to avoid overwriting if already set)
UPDATE students 
SET volunteering_hours = COALESCE(total_hours, 0),
    social_hours = 0
WHERE (volunteering_hours = 0 OR volunteering_hours IS NULL)
  AND total_hours > 0;

-- Step 4: Update total_hours to be the sum of volunteering_hours + social_hours
-- (This ensures total_hours always equals the sum)
UPDATE students 
SET total_hours = COALESCE(volunteering_hours, 0) + COALESCE(social_hours, 0);

-- Step 5: Add comments to document the columns
COMMENT ON COLUMN students.volunteering_hours IS 'Volunteering/service hours';
COMMENT ON COLUMN students.social_hours IS 'Social/event hours';

-- Step 6: Verify the migration
SELECT 
  COUNT(*) as total_students,
  SUM(COALESCE(volunteering_hours, 0)) as total_volunteering,
  SUM(COALESCE(social_hours, 0)) as total_social,
  SUM(COALESCE(total_hours, 0)) as total_hours_sum,
  COUNT(CASE WHEN volunteering_hours > 0 OR social_hours > 0 THEN 1 END) as students_with_hours
FROM students;
