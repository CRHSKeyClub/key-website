#!/usr/bin/env python3
"""
Comprehensive script to check ALL t-shirt size discrepancies between 
Supabase database and Google Form responses.
"""

import os
import sys
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://zvoavkzruhnzzeqyihrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM"

def get_supabase_client():
    """Initialize Supabase client."""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase")
        return supabase
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        return None

def get_all_students_from_supabase(supabase: Client):
    """Get all students with t-shirt sizes from Supabase."""
    try:
        result = supabase.table('students').select('s_number, name, tshirt_size').not_.is_('tshirt_size', 'null').execute()
        
        if result.data:
            print(f"📊 Found {len(result.data)} students with t-shirt sizes in Supabase")
            return result.data
        else:
            print("❌ No students found in Supabase")
            return []
    except Exception as e:
        print(f"❌ Error fetching students from Supabase: {e}")
        return []

def get_google_form_data():
    """Get Google Form data from the CSV file."""
    # Try to find the CSV file in common locations
    possible_paths = [
        '/Users/parthzanwar/Downloads/Key Club Parent Permission Form 2025-2026 (Responses) - Form Responses 1.csv',
        './Key Club Parent Permission Form 2025-2026 (Responses) - Form Responses 1.csv',
        '../Key Club Parent Permission Form 2025-2026 (Responses) - Form Responses 1.csv'
    ]
    
    csv_file = None
    for path in possible_paths:
        if os.path.exists(path):
            csv_file = path
            break
    
    if not csv_file:
        print("❌ Google Form CSV file not found!")
        print("Please make sure the CSV file is in one of these locations:")
        for path in possible_paths:
            print(f"  - {path}")
        return {}
    
    print(f"📊 Found Google Form CSV: {csv_file}")
    
    import csv
    form_data = {}
    
    with open(csv_file, 'r', newline='', encoding='utf-8') as file:
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
    
    print(f"📊 Loaded {len(form_data)} students from Google Form")
    return form_data

def find_all_discrepancies():
    """Find all t-shirt size discrepancies."""
    print("🔍 COMPREHENSIVE DISCREPANCY CHECK")
    print("="*60)
    
    # Get Supabase client
    supabase = get_supabase_client()
    if not supabase:
        return []
    
    # Get data from both sources
    supabase_data = get_all_students_from_supabase(supabase)
    form_data = get_google_form_data()
    
    if not supabase_data or not form_data:
        return []
    
    # Convert Supabase data to dict for easier lookup
    supabase_dict = {student['s_number']: student for student in supabase_data}
    
    discrepancies = []
    matches = 0
    
    print(f"\n🔍 Comparing {len(supabase_data)} Supabase students with {len(form_data)} Google Form students...")
    
    # Check all students that exist in both datasets
    for s_number in form_data:
        if s_number in supabase_dict:
            form_size = form_data[s_number]['size']
            supabase_size = supabase_dict[s_number]['tshirt_size']
            name = form_data[s_number]['name'] or supabase_dict[s_number]['name']
            
            if form_size != supabase_size:
                discrepancies.append({
                    's_number': s_number,
                    'name': name,
                    'supabase_size': supabase_size,
                    'form_size': form_size
                })
            else:
                matches += 1
    
    print(f"✅ Found {matches} matching sizes")
    print(f"❌ Found {len(discrepancies)} discrepancies")
    
    return discrepancies

def fix_discrepancies_in_supabase(supabase: Client, discrepancies):
    """Fix all discrepancies in Supabase."""
    if not discrepancies:
        print("🎉 No discrepancies found!")
        return True
    
    print(f"\n🔧 Fixing {len(discrepancies)} discrepancies in Supabase...")
    print("="*60)
    
    successful = 0
    failed = 0
    
    for disc in discrepancies:
        s_number = disc['s_number']
        new_size = disc['form_size']
        name = disc['name']
        old_size = disc['supabase_size']
        
        try:
            result = supabase.table('students').update({
                'tshirt_size': new_size
            }).eq('s_number', s_number).execute()
            
            if result.data:
                print(f"✅ {s_number} ({name}): {old_size} → {new_size}")
                successful += 1
            else:
                print(f"❌ {s_number} ({name}): No record found")
                failed += 1
                
        except Exception as e:
            print(f"❌ {s_number} ({name}): Error - {e}")
            failed += 1
    
    print(f"\n📊 Results: {successful} successful, {failed} failed")
    return successful > 0

def main():
    """Main function to check and fix all discrepancies."""
    print("🔧 COMPREHENSIVE T-SHIRT SIZE DISCREPANCY CHECKER")
    print("="*60)
    
    # Find all discrepancies
    discrepancies = find_all_discrepancies()
    
    if not discrepancies:
        print("🎉 No discrepancies found! All t-shirt sizes match.")
        return
    
    print(f"\n📋 DISCREPANCIES FOUND ({len(discrepancies)} total):")
    print("-" * 60)
    for i, disc in enumerate(discrepancies, 1):
        print(f"{i:2d}. {disc['s_number']} ({disc['name']}): "
              f"Supabase={disc['supabase_size']} → Form={disc['form_size']}")
    
    # Ask if user wants to fix them
    print(f"\n⚠️  Found {len(discrepancies)} discrepancies that need fixing.")
    response = input("Do you want to fix all of them in Supabase? (y/N): ").strip().lower()
    
    if response not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return
    
    # Get Supabase client and fix discrepancies
    supabase = get_supabase_client()
    if not supabase:
        return
    
    success = fix_discrepancies_in_supabase(supabase, discrepancies)
    
    if success:
        print(f"\n🎉 Successfully fixed {len(discrepancies)} discrepancies!")
        print("All t-shirt sizes should now match the Google Form responses.")
    else:
        print(f"\n❌ Failed to fix discrepancies. Please check the errors above.")

if __name__ == "__main__":
    main()
