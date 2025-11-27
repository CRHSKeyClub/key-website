-- Add total_hours column to students table
-- This column will store the sum of volunteering_hours + social_hours

-- Step 1: Add total_hours column
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS total_hours NUMERIC(10, 2) DEFAULT 0;

-- Step 2: Populate total_hours with the sum of volunteering_hours + social_hours
UPDATE students 
SET total_hours = COALESCE(volunteering_hours, 0) + COALESCE(social_hours, 0);

-- Step 3: Add a trigger to automatically update total_hours when volunteering_hours or social_hours change
-- This ensures total_hours always stays in sync

-- First, create a function to update total_hours
CREATE OR REPLACE FUNCTION update_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_hours = COALESCE(NEW.volunteering_hours, 0) + COALESCE(NEW.social_hours, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists (to avoid errors on re-run)
DROP TRIGGER IF EXISTS trigger_update_total_hours ON students;

-- Create the trigger
CREATE TRIGGER trigger_update_total_hours
  BEFORE INSERT OR UPDATE OF volunteering_hours, social_hours ON students
  FOR EACH ROW
  EXECUTE FUNCTION update_total_hours();

-- Step 4: Add a comment to document the column
COMMENT ON COLUMN students.total_hours IS 'Total hours (sum of volunteering_hours + social_hours)';

-- Step 5: Verify the migration
SELECT 
  COUNT(*) as total_students,
  SUM(COALESCE(volunteering_hours, 0)) as total_volunteering,
  SUM(COALESCE(social_hours, 0)) as total_social,
  SUM(COALESCE(total_hours, 0)) as total_hours_sum,
  COUNT(CASE WHEN total_hours != (COALESCE(volunteering_hours, 0) + COALESCE(social_hours, 0)) THEN 1 END) as mismatched_rows
FROM students;

