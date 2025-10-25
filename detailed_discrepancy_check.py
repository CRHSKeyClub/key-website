#!/usr/bin/env python3
"""
Detailed script to check for ALL discrepancies with more thorough analysis.
"""

import csv
import os
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://zvoavkzruhnzzeqyihrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM"

def get_google_form_data():
    """Get Google Form data with detailed logging."""
    csv_file = './Key Club Parent Permission Form 2025-2026 (Responses) - Form Responses 1.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return {}
    
    form_data = {}
    print(f"📊 Reading Google Form data from: {csv_file}")
    
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

def get_supabase_data():
    """Get Supabase data with detailed logging."""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase")
        
        # Get all students with t-shirt sizes
        result = supabase.table('students').select('s_number, name, tshirt_size').not_.is_('tshirt_size', 'null').execute()
        
        if result.data:
            supabase_dict = {student['s_number']: student for student in result.data}
            print(f"📊 Loaded {len(supabase_dict)} students from Supabase")
            return supabase_dict
        return {}
        
    except Exception as e:
        print(f"❌ Error getting Supabase data: {e}")
        return {}

def check_specific_students():
    """Check the specific students we know had issues."""
    print("\n🔍 CHECKING SPECIFIC STUDENTS WE FIXED:")
    print("-" * 50)
    
    students_to_check = [
        's202943', 's905482', 's923009', 's923833', 's894833', 's260168'
    ]
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        result = supabase.table('students').select('s_number, name, tshirt_size').in_('s_number', students_to_check).execute()
        
        if result.data:
            for student in result.data:
                s_number = student['s_number']
                name = student.get('name', 'Unknown')
                tshirt_size = student.get('tshirt_size', 'None')
                print(f"  {s_number} ({name}): {tshirt_size}")
        else:
            print("❌ No students found")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Comprehensive discrepancy check."""
    print("🔍 COMPREHENSIVE DISCREPANCY CHECK")
    print("="*60)
    
    # Get data from both sources
    form_data = get_google_form_data()
    supabase_data = get_supabase_data()
    
    if not form_data or not supabase_data:
        print("❌ Could not load data from one or both sources")
        return
    
    # Check specific students first
    check_specific_students()
    
    # Find all discrepancies
    discrepancies = []
    matches = 0
    students_checked = 0
    
    print(f"\n🔍 COMPARING ALL STUDENTS:")
    print("-" * 50)
    
    for s_number in form_data:
        if s_number in supabase_data:
            students_checked += 1
            form_size = form_data[s_number]['size']
            supabase_size = supabase_data[s_number]['tshirt_size']
            name = form_data[s_number]['name'] or supabase_data[s_number]['name']
            
            if form_size != supabase_size:
                discrepancies.append({
                    's_number': s_number,
                    'name': name,
                    'form_size': form_size,
                    'supabase_size': supabase_size
                })
                print(f"❌ {s_number} ({name}): Form={form_size}, DB={supabase_size}")
            else:
                matches += 1
        else:
            print(f"⚠️  {s_number}: In Google Form but not in Supabase")
    
    print(f"\n📊 FINAL RESULTS:")
    print(f"✅ Matches: {matches}")
    print(f"❌ Discrepancies: {len(discrepancies)}")
    print(f"📊 Students checked: {students_checked}")
    
    if discrepancies:
        print(f"\n🔍 ALL DISCREPANCIES:")
        print("-" * 60)
        for i, disc in enumerate(discrepancies, 1):
            print(f"{i:2d}. {disc['s_number']} ({disc['name']}):")
            print(f"    Google Form: {disc['form_size']}")
            print(f"    Supabase:    {disc['supabase_size']}")
            print()
    else:
        print("\n🎉 NO DISCREPANCIES FOUND!")
        print("All t-shirt sizes match perfectly between Google Form and Supabase!")

if __name__ == "__main__":
    main()
