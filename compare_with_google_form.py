#!/usr/bin/env python3
"""
Script to compare current Supabase data with Google Form responses.
"""

import csv
import os
from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://zvoavkzruhnzzeqyihrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM"

def get_google_form_data():
    """Get Google Form data."""
    csv_file = './Key Club Parent Permission Form 2025-2026 (Responses) - Form Responses 1.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return {}
    
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
    
    return form_data

def get_supabase_data():
    """Get current Supabase data."""
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        students_to_check = [
            's202943', 's905482', 's923009', 's923833', 's894833', 's260168'
        ]
        
        result = supabase.table('students').select('s_number, name, tshirt_size').in_('s_number', students_to_check).execute()
        
        if result.data:
            return {student['s_number']: student for student in result.data}
        return {}
        
    except Exception as e:
        print(f"❌ Error getting Supabase data: {e}")
        return {}

def main():
    """Compare Supabase with Google Form."""
    print("🔍 COMPARING SUPABASE WITH GOOGLE FORM")
    print("="*60)
    
    # Get data from both sources
    form_data = get_google_form_data()
    supabase_data = get_supabase_data()
    
    if not form_data:
        print("❌ Could not load Google Form data")
        return
    
    if not supabase_data:
        print("❌ Could not load Supabase data")
        return
    
    print(f"📊 Google Form: {len(form_data)} students")
    print(f"📊 Supabase: {len(supabase_data)} students")
    
    print(f"\n🔍 COMPARISON FOR THE 6 STUDENTS:")
    print("-" * 60)
    
    discrepancies = []
    
    for s_number in ['s202943', 's905482', 's923009', 's923833', 's894833', 's260168']:
        if s_number in form_data and s_number in supabase_data:
            form_size = form_data[s_number]['size']
            supabase_size = supabase_data[s_number]['tshirt_size']
            name = form_data[s_number]['name'] or supabase_data[s_number]['name']
            
            if form_size != supabase_size:
                status = "❌ MISMATCH"
                discrepancies.append({
                    's_number': s_number,
                    'name': name,
                    'form_size': form_size,
                    'supabase_size': supabase_size
                })
            else:
                status = "✅ MATCH"
            
            print(f"{status} {s_number} ({name}):")
            print(f"    Google Form: {form_size}")
            print(f"    Supabase:    {supabase_size}")
            print()
    
    if discrepancies:
        print(f"❌ Found {len(discrepancies)} discrepancies that need fixing!")
        print("\nThese students need to be updated in Supabase:")
        for disc in discrepancies:
            print(f"  • {disc['s_number']} ({disc['name']}): {disc['supabase_size']} → {disc['form_size']}")
    else:
        print("🎉 All t-shirt sizes match between Google Form and Supabase!")

if __name__ == "__main__":
    main()
