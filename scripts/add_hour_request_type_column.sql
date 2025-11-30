-- Add type column to hour_requests table
-- Type can be 'volunteering' or 'social'
-- Default to 'volunteering' for existing records

ALTER TABLE hour_requests 
ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'volunteering';

-- Add check constraint to ensure type is either 'volunteering' or 'social'
ALTER TABLE hour_requests
ADD CONSTRAINT hour_requests_type_check CHECK (type IN ('volunteering', 'social'));

-- Update existing records to have type = 'volunteering' (default behavior before this change)
UPDATE hour_requests 
SET type = 'volunteering' 
WHERE type IS NULL;

-- Make the column NOT NULL now that all records have a value
ALTER TABLE hour_requests
ALTER COLUMN type SET NOT NULL;


