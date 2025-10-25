#!/usr/bin/env python3
"""
Script to find ALL 12 t-shirt size discrepancies and generate complete SQL commands.
"""

import csv
from pathlib import Path

def load_google_form_data():
    """Load Google Form data."""
    form_file = Path('/Users/parthzanwar/Downloads/Key Club Parent Permission Form 2025-2026 (Responses) - Form Responses 1.csv')
    
    form_data = {}
    with open(form_file, 'r', newline='', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            student_id_raw = row.get('Student ID # (NO S)', '').strip()
            tshirt_size = row.get('T-Shirt Size', '').strip().upper()
            first_name = row.get('First Name', '').strip()
            last_name = row.get('Last Name', '').strip()
            
            if student_id_raw and tshirt_size:
                student_id = f"s{student_id_raw}"
                form_data[student_id] = {
                    'size': tshirt_size,
                    'name': f"{first_name} {last_name}".strip()
                }
    return form_data

def load_database_data():
    """Load database data."""
    db_file = Path('/Users/parthzanwar/Downloads/students_rows.csv')
    
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
    return db_data

def find_all_discrepancies():
    """Find all discrepancies."""
    print("🔍 Finding ALL t-shirt size discrepancies...")
    
    form_data = load_google_form_data()
    db_data = load_database_data()
    
    discrepancies = []
    
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
    
    return discrepancies

def main():
    """Main function."""
    print("🔍 COMPREHENSIVE DISCREPANCY FINDER")
    print("="*60)
    
    discrepancies = find_all_discrepancies()
    
    print(f"Found {len(discrepancies)} discrepancies:")
    print("-" * 60)
    
    for i, disc in enumerate(discrepancies, 1):
        print(f"{i:2d}. {disc['s_number']} ({disc['name']}): "
              f"DB={disc['database_size']} → Form={disc['form_size']}")
    
    print("\n" + "="*60)
    print("SQL UPDATE COMMANDS FOR ALL DISCREPANCIES")
    print("="*60)
    
    for disc in discrepancies:
        print(f"UPDATE students SET tshirt_size = '{disc['form_size']}' WHERE s_number = '{disc['s_number']}';  -- {disc['name']}: {disc['database_size']} → {disc['form_size']}")
    
    print("\n-- Verify all updates")
    s_numbers = "', '".join([d['s_number'] for d in discrepancies])
    print(f"SELECT s_number, name, tshirt_size FROM students WHERE s_number IN (")
    print(f"    '{s_numbers}'")
    print(") ORDER BY s_number;")
    
    print(f"\nTotal discrepancies found: {len(discrepancies)}")

if __name__ == "__main__":
    main()
