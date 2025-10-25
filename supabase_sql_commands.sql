-- T-Shirt Size Discrepancy Fixes for Supabase
-- Generated on 2025-10-25
-- These SQL commands will fix the t-shirt size discrepancies in your Supabase database

-- Update the 6 students with corrected t-shirt sizes
UPDATE students SET tshirt_size = 'M' WHERE s_number = 's202943';  -- Elly Chang: L → M
UPDATE students SET tshirt_size = 'L' WHERE s_number = 's905482';  -- Kevin Chirayil: M → L  
UPDATE students SET tshirt_size = 'M' WHERE s_number = 's923009';  -- Nikhilesh Gnanaraj: L → M
UPDATE students SET tshirt_size = 'L' WHERE s_number = 's923833';  -- Kathleen Lai: S → L
UPDATE students SET tshirt_size = 'L' WHERE s_number = 's894833';  -- Suhan Patel: M → L
UPDATE students SET tshirt_size = 'S' WHERE s_number = 's260168';  -- Avani Yalamanchili: M → S

-- Verify the updates were successful
SELECT s_number, name, tshirt_size 
FROM students 
WHERE s_number IN (
    's202943', 's905482', 's923009', 's923833', 's894833', 's260168'
) 
ORDER BY s_number;

-- Optional: Check all students with t-shirt sizes to see the current state
-- SELECT s_number, name, tshirt_size FROM students WHERE tshirt_size IS NOT NULL ORDER BY s_number;
