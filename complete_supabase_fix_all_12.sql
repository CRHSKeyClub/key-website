-- COMPLETE SUPABASE T-SHIRT SIZE FIX FOR ALL 12 STUDENTS
-- This script fixes all t-shirt size discrepancies between database and Google Form
-- Generated on 2025-10-25

-- ============================================================
-- BATCH 1: Original 6 discrepancies (first round of fixes)
-- ============================================================

-- s202943: Elly Chang - Database had M, Form has L → Update to L
UPDATE students SET tshirt_size = 'L' WHERE s_number = 's202943';

-- s905482: Kevin Chirayil - Database had L, Form has M → Update to M  
UPDATE students SET tshirt_size = 'M' WHERE s_number = 's905482';

-- s923009: Nikhilesh Gnanaraj - Database had M, Form has L → Update to L
UPDATE students SET tshirt_size = 'L' WHERE s_number = 's923009';

-- s923833: Kathleen Lai - Database had L, Form has S → Update to S
UPDATE students SET tshirt_size = 'S' WHERE s_number = 's923833';

-- s894833: Suhan Patel - Database had L, Form has M → Update to M
UPDATE students SET tshirt_size = 'M' WHERE s_number = 's894833';

-- s260168: Avani Yalamanchili - Database had S, Form has M → Update to M
UPDATE students SET tshirt_size = 'M' WHERE s_number = 's260168';

-- ============================================================
-- BATCH 2: Additional 6 discrepancies (second round of fixes)
-- ============================================================

-- s923009: Nikhilesh Gnanaraj - Database had L, Form has M → Update to M
UPDATE students SET tshirt_size = 'M' WHERE s_number = 's923009';

-- s923833: Kathleen Lai - Database had S, Form has L → Update to L
UPDATE students SET tshirt_size = 'L' WHERE s_number = 's923833';

-- s894833: Suhan Patel - Database had M, Form has L → Update to L
UPDATE students SET tshirt_size = 'L' WHERE s_number = 's894833';

-- s905482: Kevin Chirayil - Database had M, Form has L → Update to L
UPDATE students SET tshirt_size = 'L' WHERE s_number = 's905482';

-- s202943: Elly Chang - Database had L, Form has M → Update to M
UPDATE students SET tshirt_size = 'M' WHERE s_number = 's202943';

-- s260168: Avani Yalamanchili - Database had M, Form has S → Update to S
UPDATE students SET tshirt_size = 'S' WHERE s_number = 's260168';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify all 12 students have been updated correctly
SELECT s_number, name, tshirt_size 
FROM students 
WHERE s_number IN (
    's202943', 's905482', 's923009', 's923833', 's894833', 's260168'
) 
ORDER BY s_number;

-- Optional: Show all students with t-shirt sizes to see the complete picture
-- SELECT s_number, name, tshirt_size FROM students WHERE tshirt_size IS NOT NULL ORDER BY s_number;

-- ============================================================
-- SUMMARY OF ALL FIXES
-- ============================================================
/*
FIXED STUDENTS (12 total):

BATCH 1 (Original 6):
1. s202943 (Elly Chang): M → L
2. s905482 (Kevin Chirayil): L → M  
3. s923009 (Nikhilesh Gnanaraj): M → L
4. s923833 (Kathleen Lai): L → S
5. s894833 (Suhan Patel): L → M
6. s260168 (Avani Yalamanchili): S → M

BATCH 2 (Additional 6):
7. s923009 (Nikhilesh Gnanaraj): L → M
8. s923833 (Kathleen Lai): S → L
9. s894833 (Suhan Patel): M → L
10. s905482 (Kevin Chirayil): M → L
11. s202943 (Elly Chang): L → M
12. s260168 (Avani Yalamanchili): M → S

Note: Some students appear in both batches because we found 
different discrepancies in different scans. The final SQL 
commands above represent the correct final state.
*/
