-- Create archive table for approved/rejected hour requests
-- This dramatically speeds up queries since hour_requests will only contain pending requests
-- Run this in Supabase SQL Editor

-- Step 1: Create the archive table with identical structure to hour_requests
CREATE TABLE IF NOT EXISTS hour_requests_archive (
  LIKE hour_requests INCLUDING ALL
);

-- Step 2: Add a column to track when it was archived (optional but useful)
ALTER TABLE hour_requests_archive
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Create index on status for faster queries in archive (since we might still query it)
CREATE INDEX IF NOT EXISTS idx_hour_requests_archive_status 
ON hour_requests_archive(status);

CREATE INDEX IF NOT EXISTS idx_hour_requests_archive_submitted_at 
ON hour_requests_archive(submitted_at);

CREATE INDEX IF NOT EXISTS idx_hour_requests_archive_student_s_number 
ON hour_requests_archive(student_s_number);

-- Step 4: Create a function to automatically archive approved/rejected requests
-- This will be triggered when a request status changes to 'approved' or 'rejected'
CREATE OR REPLACE FUNCTION archive_hour_request()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed to approved or rejected, move to archive
  IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'pending' THEN
    -- Insert into archive
    INSERT INTO hour_requests_archive
    SELECT *, NOW() as archived_at
    FROM hour_requests
    WHERE id = NEW.id;
    
    -- Delete from main table
    DELETE FROM hour_requests WHERE id = NEW.id;
    
    -- Return NULL to prevent the update (we've already moved it)
    RETURN NULL;
  END IF;
  
  -- Otherwise, allow the update
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to auto-archive when status changes
DROP TRIGGER IF EXISTS trigger_archive_hour_request ON hour_requests;

CREATE TRIGGER trigger_archive_hour_request
  BEFORE UPDATE OF status ON hour_requests
  FOR EACH ROW
  EXECUTE FUNCTION archive_hour_request();

-- Step 6: Create a view that combines both tables for backwards compatibility
-- This allows old code to still work while new code can query just hour_requests
CREATE OR REPLACE VIEW hour_requests_all AS
SELECT 
  id,
  student_s_number,
  student_name,
  event_name,
  event_date,
  hours_requested,
  description,
  type,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by,
  admin_notes,
  image_name,
  NULL::TIMESTAMPTZ as archived_at  -- Main table doesn't have this
FROM hour_requests
UNION ALL
SELECT 
  id,
  student_s_number,
  student_name,
  event_name,
  event_date,
  hours_requested,
  description,
  type,
  status,
  submitted_at,
  reviewed_at,
  reviewed_by,
  admin_notes,
  image_name,
  archived_at
FROM hour_requests_archive;

-- Step 7: Verify the setup
SELECT 
  'hour_requests' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM hour_requests
UNION ALL
SELECT 
  'hour_requests_archive' as table_name,
  COUNT(*) as total_rows,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected
FROM hour_requests_archive;

-- Step 8: Show what will be archived when you run the migration script
SELECT 
  COUNT(*) as approved_to_archive,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count
FROM hour_requests
WHERE status IN ('approved', 'rejected');

-- ✅ Setup complete!
-- Next step: Run scripts/migrate_hour_requests_to_archive.sql to move existing approved/rejected records
