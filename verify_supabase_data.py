#!/usr/bin/env python3
"""
Script to verify what's actually in your Supabase database
and check for any data inconsistencies.
"""

import os
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

def check_specific_students(supabase: Client):
    """Check the specific students we know had discrepancies."""
    # These are the students we fixed
    students_to_check = [
        's202943', 's905482', 's923009', 's923833', 's894833', 's260168'
    ]
    
    print("🔍 Checking specific students we fixed:")
    print("-" * 50)
    
    try:
        result = supabase.table('students').select('s_number, name, tshirt_size').in_('s_number', students_to_check).execute()
        
        if result.data:
            for student in result.data:
                s_number = student['s_number']
                name = student.get('name', 'Unknown')
                tshirt_size = student.get('tshirt_size', 'None')
                print(f"✅ {s_number} ({name}): {tshirt_size}")
        else:
            print("❌ No students found")
            
    except Exception as e:
        print(f"❌ Error checking students: {e}")

def check_all_tshirt_sizes(supabase: Client):
    """Check all t-shirt sizes in the database."""
    print("\n🔍 Checking all t-shirt sizes in database:")
    print("-" * 50)
    
    try:
        # Get count of each t-shirt size
        result = supabase.table('students').select('tshirt_size').not_.is_('tshirt_size', 'null').execute()
        
        if result.data:
            size_counts = {}
            for student in result.data:
                size = student['tshirt_size']
                size_counts[size] = size_counts.get(size, 0) + 1
            
            print("T-shirt size distribution:")
            for size, count in sorted(size_counts.items()):
                print(f"  {size}: {count} students")
            
            print(f"\nTotal students with t-shirt sizes: {len(result.data)}")
        else:
            print("❌ No students found")
            
    except Exception as e:
        print(f"❌ Error checking t-shirt sizes: {e}")

def check_recent_updates(supabase: Client):
    """Check for recent updates to see if our changes were applied."""
    print("\n🔍 Checking for recent updates:")
    print("-" * 50)
    
    try:
        # Get students with recent updates (if you have an updated_at field)
        result = supabase.table('students').select('s_number, name, tshirt_size, updated_at').in_('s_number', [
            's202943', 's905482', 's923009', 's923833', 's894833', 's260168'
        ]).execute()
        
        if result.data:
            for student in result.data:
                s_number = student['s_number']
                name = student.get('name', 'Unknown')
                tshirt_size = student.get('tshirt_size', 'None')
                updated_at = student.get('updated_at', 'Unknown')
                print(f"✅ {s_number} ({name}): {tshirt_size} (updated: {updated_at})")
        else:
            print("❌ No students found")
            
    except Exception as e:
        print(f"❌ Error checking recent updates: {e}")

def main():
    """Main function to verify Supabase data."""
    print("🔍 SUPABASE DATA VERIFICATION")
    print("="*50)
    
    supabase = get_supabase_client()
    if not supabase:
        return
    
    # Check specific students we fixed
    check_specific_students(supabase)
    
    # Check all t-shirt sizes
    check_all_tshirt_sizes(supabase)
    
    # Check recent updates
    check_recent_updates(supabase)
    
    print("\n" + "="*50)
    print("VERIFICATION COMPLETE")
    print("="*50)
    print("If you're still seeing wrong t-shirt sizes on your website:")
    print("1. Check if your website is using cached data")
    print("2. Verify your website is reading from the correct Supabase database")
    print("3. Check if there are any frontend caching issues")
    print("4. Try refreshing your website or clearing browser cache")

if __name__ == "__main__":
    main()
