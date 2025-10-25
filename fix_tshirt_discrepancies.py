#!/usr/bin/env python3
"""
Script to fix t-shirt size discrepancies between students_rows.csv and Google Form responses.
This script will update the students_rows.csv file with the correct t-shirt sizes from the Google Form.
"""

import csv
import sys
from pathlib import Path

def fix_tshirt_discrepancies():
    """
    Fix the t-shirt size discrepancies by updating students_rows.csv with Google Form data.
    """
    
    # Define the discrepancies to fix
    # Format: s_number: (database_size, form_size)
    discrepancies = {
        's202943': ('M', 'L'),
        's905482': ('L', 'M'), 
        's923009': ('M', 'L'),
        's923833': ('L', 'S'),
        's894833': ('L', 'M'),
        's260168': ('S', 'M')
    }
    
    # Paths to files
    students_file = Path('/Users/parthzanwar/Downloads/students_rows.csv')
    backup_file = Path('/Users/parthzanwar/Downloads/students_rows_backup.csv')
    
    if not students_file.exists():
        print(f"Error: {students_file} not found!")
        return False
    
    # Create backup
    print("Creating backup of original file...")
    import shutil
    shutil.copy2(students_file, backup_file)
    print(f"Backup created: {backup_file}")
    
    # Read the CSV file
    print("Reading students data...")
    rows = []
    with open(students_file, 'r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)
    
    # Update the discrepancies
    print("Updating t-shirt sizes...")
    updates_made = 0
    
    for row in rows:
        s_number = row['s_number']
        if s_number in discrepancies:
            old_size = row['tshirt_size']
            new_size = discrepancies[s_number][1]  # Use form size
            
            print(f"Updating {s_number}: {old_size} → {new_size}")
            row['tshirt_size'] = new_size
            updates_made += 1
    
    # Write the updated data back
    print(f"Writing updated data... ({updates_made} updates made)")
    with open(students_file, 'w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print("✅ T-shirt size discrepancies fixed!")
    print(f"Updated {updates_made} records")
    print(f"Original file backed up to: {backup_file}")
    
    return True

def generate_sql_updates():
    """
    Generate SQL UPDATE statements for the discrepancies.
    """
    discrepancies = {
        's202943': ('M', 'L'),
        's905482': ('L', 'M'), 
        's923009': ('M', 'L'),
        's923833': ('L', 'S'),
        's894833': ('L', 'M'),
        's260168': ('S', 'M')
    }
    
    print("\n" + "="*60)
    print("SQL UPDATE STATEMENTS")
    print("="*60)
    print("-- T-Shirt Size Discrepancy Fixes")
    print("-- Generated on", __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    print("-- Total records to update:", len(discrepancies))
    print()
    
    for s_number, (old_size, new_size) in discrepancies.items():
        print(f"UPDATE students SET tshirt_size = '{new_size}' WHERE s_number = '{s_number}';")
    
    print()
    print("-- Verify the updates")
    print("SELECT s_number, name, tshirt_size FROM students WHERE s_number IN (")
    s_numbers = "', '".join(discrepancies.keys())
    print(f"    '{s_numbers}'")
    print(") ORDER BY s_number;")

if __name__ == "__main__":
    print("🔧 T-Shirt Size Discrepancy Fixer")
    print("="*50)
    
    # Fix the CSV file
    success = fix_tshirt_discrepancies()
    
    if success:
        # Generate SQL statements
        generate_sql_updates()
        
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        print("✅ Fixed 6 t-shirt size discrepancies")
        print("✅ Created backup of original file")
        print("✅ Generated SQL update statements")
        print("\nThe following students had their t-shirt sizes corrected:")
        print("• s202943: M → L")
        print("• s905482: L → M") 
        print("• s923009: M → L")
        print("• s923833: L → S")
        print("• s894833: L → M")
        print("• s260168: S → M")
    else:
        print("❌ Failed to fix discrepancies")
        sys.exit(1)
