#!/usr/bin/env python3
"""
Script to check the current state of specific students in Supabase.
"""

from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://zvoavkzruhnzzeqyihrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM"

def main():
    """Check current state of students in Supabase."""
    print("🔍 CHECKING CURRENT SUPABASE STATE")
    print("="*50)
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase")
        
        # Check the specific students we're trying to fix
        students_to_check = [
            's202943', 's905482', 's923009', 's923833', 's894833', 's260168'
        ]
        
        print(f"\n🔍 Current t-shirt sizes for the 6 students:")
        print("-" * 50)
        
        result = supabase.table('students').select('s_number, name, tshirt_size').in_('s_number', students_to_check).execute()
        
        if result.data:
            for student in result.data:
                s_number = student['s_number']
                name = student.get('name', 'Unknown')
                tshirt_size = student.get('tshirt_size', 'None')
                print(f"  {s_number} ({name}): {tshirt_size}")
        else:
            print("❌ No students found")
        
        print(f"\n📊 Total students found: {len(result.data) if result.data else 0}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
