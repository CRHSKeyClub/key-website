#!/usr/bin/env python3
"""
Comprehensive script to find and fix ALL t-shirt size discrepancies between 
students_rows.csv and Google Form responses.
"""

import csv
import sys
from pathlib import Path
from collections import defaultdict

def load_google_form_data():
    """
    Load and parse Google Form responses to extract t-shirt sizes.
    """
    form_file = Path('/Users/parthzanwar/Downloads/Key Club Parent Permission Form 2025-2026 (Responses) - Form Responses 1.csv')
    
    if not form_file.exists():
        print(f"Error: {form_file} not found!")
        return {}
    
    form_data = {}
    
    with open(form_file, 'r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Extract student ID and t-shirt size
            student_id_raw = row.get('Student ID # (NO S)', '').strip()
            tshirt_size = row.get('T-Shirt Size', '').strip().upper()
            first_name = row.get('First Name', '').strip()
            last_name = row.get('Last Name', '').strip()
            
            if student_id_raw and tshirt_size:
                # Add 's' prefix to student ID
                student_id = f"s{student_id_raw}"
                form_data[student_id] = {
                    'size': tshirt_size,
                    'name': f"{first_name} {last_name}".strip()
                }
    
    print(f"📊 Loaded {len(form_data)} students from Google Form")
    return form_data

def load_database_data():
    """
    Load and parse students_rows.csv data.
    """
    db_file = Path('/Users/parthzanwar/Downloads/students_rows.csv')
    
    if not db_file.exists():
        print(f"Error: {db_file} not found!")
        return {}
    
    db_data = {}
    
    with open(db_file, 'r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            s_number = row.get('s_number', '').strip()
            tshirt_size = row.get('tshirt_size', '').strip().upper()
            name = row.get('name', '').strip()
            
            if s_number and tshirt_size:
                db_data[s_number] = {
                    'size': tshirt_size,
                    'name': name
                }
    
    print(f"📊 Loaded {len(db_data)} students from database")
    return db_data

def find_all_discrepancies():
    """
    Find all t-shirt size discrepancies between database and Google Form.
    """
    print("🔍 Finding ALL t-shirt size discrepancies...")
    print("="*60)
    
    form_data = load_google_form_data()
    db_data = load_database_data()
    
    discrepancies = []
    matches = 0
    
    # Check all students that exist in both datasets
    for s_number in form_data:
        if s_number in db_data:
            form_size = form_data[s_number]['size']
            db_size = db_data[s_number]['size']
            name = form_data[s_number]['name'] or db_data[s_number]['name']
            
            if form_size != db_size:
                discrepancies.append({
                    's_number': s_number,
                    'name': name,
                    'database_size': db_size,
                    'form_size': form_size
                })
            else:
                matches += 1
    
    print(f"✅ Found {matches} matching sizes")
    print(f"❌ Found {len(discrepancies)} discrepancies")
    print()
    
    if discrepancies:
        print("DISCREPANCIES FOUND:")
        print("-" * 60)
        for i, disc in enumerate(discrepancies, 1):
            print(f"{i:2d}. {disc['s_number']} ({disc['name']}): "
                  f"DB={disc['database_size']} → Form={disc['form_size']}")
        print()
    
    return discrepancies

def fix_all_discrepancies(discrepancies):
    """
    Fix all t-shirt size discrepancies by updating the database file.
    """
    if not discrepancies:
        print("🎉 No discrepancies found! All t-shirt sizes match.")
        return True
    
    print(f"🔧 Fixing {len(discrepancies)} discrepancies...")
    
    # Create backup
    students_file = Path('/Users/parthzanwar/Downloads/students_rows.csv')
    backup_file = Path('/Users/parthzanwar/Downloads/students_rows_comprehensive_backup.csv')
    
    import shutil
    shutil.copy2(students_file, backup_file)
    print(f"📁 Backup created: {backup_file}")
    
    # Read the CSV file
    rows = []
    with open(students_file, 'r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        fieldnames = reader.fieldnames
        for row in reader:
            rows.append(row)
    
    # Create lookup for discrepancies
    disc_lookup = {d['s_number']: d['form_size'] for d in discrepancies}
    
    # Update the discrepancies
    updates_made = 0
    for row in rows:
        s_number = row['s_number']
        if s_number in disc_lookup:
            old_size = row['tshirt_size']
            new_size = disc_lookup[s_number]
            
            print(f"   {s_number}: {old_size} → {new_size}")
            row['tshirt_size'] = new_size
            updates_made += 1
    
    # Write the updated data back
    with open(students_file, 'w', newline='', encoding='utf-8') as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    
    print(f"✅ Updated {updates_made} records")
    return True

def generate_comprehensive_sql(discrepancies):
    """
    Generate SQL UPDATE statements for all discrepancies.
    """
    if not discrepancies:
        return
    
    print("\n" + "="*60)
    print("SQL UPDATE STATEMENTS")
    print("="*60)
    print("-- Comprehensive T-Shirt Size Discrepancy Fixes")
    print("-- Generated on", __import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    print(f"-- Total records to update: {len(discrepancies)}")
    print()
    
    for disc in discrepancies:
        print(f"UPDATE students SET tshirt_size = '{disc['form_size']}' WHERE s_number = '{disc['s_number']}';")
    
    print()
    print("-- Verify the updates")
    s_numbers = "', '".join([d['s_number'] for d in discrepancies])
    print(f"SELECT s_number, name, tshirt_size FROM students WHERE s_number IN (")
    print(f"    '{s_numbers}'")
    print(") ORDER BY s_number;")

def verify_all_fixes(discrepancies):
    """
    Verify that all discrepancies have been fixed.
    """
    if not discrepancies:
        return True
    
    print("\n🔍 Verifying all fixes...")
    print("="*40)
    
    students_file = Path('/Users/parthzanwar/Downloads/students_rows.csv')
    
    # Create lookup for expected sizes
    expected_sizes = {d['s_number']: d['form_size'] for d in discrepancies}
    
    all_correct = True
    with open(students_file, 'r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            s_number = row['s_number']
            if s_number in expected_sizes:
                current_size = row['tshirt_size']
                expected_size = expected_sizes[s_number]
                
                status = "✅" if current_size == expected_size else "❌"
                print(f"{status} {s_number}: {current_size} (expected: {expected_size})")
                
                if current_size != expected_size:
                    all_correct = False
    
    return all_correct

def main():
    """
    Main function to find and fix all t-shirt size discrepancies.
    """
    print("🔧 COMPREHENSIVE T-SHIRT SIZE DISCREPANCY FIXER")
    print("="*60)
    
    # Find all discrepancies
    discrepancies = find_all_discrepancies()
    
    if not discrepancies:
        print("🎉 No discrepancies found! All t-shirt sizes are already correct.")
        return
    
    # Ask for confirmation
    print(f"Found {len(discrepancies)} discrepancies to fix.")
    response = input("Do you want to fix all of them? (y/N): ").strip().lower()
    
    if response not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return
    
    # Fix all discrepancies
    success = fix_all_discrepancies(discrepancies)
    
    if success:
        # Generate SQL statements
        generate_comprehensive_sql(discrepancies)
        
        # Verify fixes
        all_correct = verify_all_fixes(discrepancies)
        
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        
        if all_correct:
            print("🎉 All discrepancies have been successfully fixed!")
            print(f"✅ Fixed {len(discrepancies)} t-shirt size discrepancies")
            print("✅ All students now have the correct t-shirt sizes from the Google Form")
        else:
            print("⚠️  Some discrepancies may still exist. Please check the verification output.")
        
        print(f"📁 Original file backed up to: students_rows_comprehensive_backup.csv")
    else:
        print("❌ Failed to fix discrepancies")

if __name__ == "__main__":
    main()
