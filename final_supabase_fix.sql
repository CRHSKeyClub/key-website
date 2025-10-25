-- FINAL SUPABASE T-SHIRT SIZE FIX
-- Fixes all t-shirt size discrepancies to match Google Form responses
-- Run these commands in your Supabase SQL Editor

-- Update all 6 students with corrected t-shirt sizes
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
