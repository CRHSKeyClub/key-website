#!/usr/bin/env python3
"""
Script to verify that the t-shirt size discrepancies have been fixed.
"""

import csv
from pathlib import Path

def verify_fixes():
    """
    Verify that the t-shirt size discrepancies have been corrected.
    """
    
    # Expected corrected sizes
    expected_sizes = {
        's202943': 'L',
        's905482': 'M', 
        's923009': 'L',
        's923833': 'S',
        's894833': 'M',
        's260168': 'M'
    }
    
    students_file = Path('/Users/parthzanwar/Downloads/students_rows.csv')
    
    if not students_file.exists():
        print(f"Error: {students_file} not found!")
        return False
    
    print("🔍 Verifying T-Shirt Size Fixes")
    print("="*50)
    
    # Read the CSV file
    with open(students_file, 'r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        all_correct = True
        for row in reader:
            s_number = row['s_number']
            if s_number in expected_sizes:
                current_size = row['tshirt_size']
                expected_size = expected_sizes[s_number]
                
                status = "✅" if current_size == expected_size else "❌"
                print(f"{status} {s_number}: {current_size} (expected: {expected_size})")
                
                if current_size != expected_size:
                    all_correct = False
    
    print("\n" + "="*50)
    if all_correct:
        print("🎉 All discrepancies have been successfully fixed!")
        print("✅ All 6 students now have the correct t-shirt sizes from the Google Form.")
    else:
        print("⚠️  Some discrepancies still exist. Please check the output above.")
    
    return all_correct

if __name__ == "__main__":
    verify_fixes()
