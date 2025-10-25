-- Migration: Add t-shirt size column to students table
-- Run this in your Supabase SQL Editor

-- Add tshirt_size column to students table
ALTER TABLE students 
ADD COLUMN tshirt_size VARCHAR(10);

-- Add a check constraint to ensure valid t-shirt sizes
ALTER TABLE students 
ADD CONSTRAINT valid_tshirt_size 
CHECK (tshirt_size IS NULL OR tshirt_size IN ('XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'));

-- Add a comment to document the column
COMMENT ON COLUMN students.tshirt_size IS 'T-shirt size for the student (XS, S, M, L, XL, XXL, XXXL)';

-- Optional: Update existing students with a default value (uncomment if needed)
-- UPDATE students SET tshirt_size = 'M' WHERE tshirt_size IS NULL;
