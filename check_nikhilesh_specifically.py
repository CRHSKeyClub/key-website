#!/usr/bin/env python3
"""
Script to check Nikhilesh's t-shirt size specifically in Supabase.
"""

from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://zvoavkzruhnzzeqyihrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM"

def main():
    """Check Nikhilesh's current t-shirt size in Supabase."""
    print("🔍 CHECKING NIKHILESH'S T-SHIRT SIZE IN SUPABASE")
    print("="*60)
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase")
        
        # Check Nikhilesh specifically
        print(f"\n🔍 Looking for Nikhilesh (s923009)...")
        
        result = supabase.table('students').select('s_number, name, tshirt_size, updated_at').eq('s_number', 's923009').execute()
        
        if result.data:
            student = result.data[0]
            s_number = student['s_number']
            name = student.get('name', 'Unknown')
            tshirt_size = student.get('tshirt_size', 'None')
            updated_at = student.get('updated_at', 'Unknown')
            
            print(f"📊 Current data for {s_number}:")
            print(f"   Name: {name}")
            print(f"   T-shirt Size: {tshirt_size}")
            print(f"   Last Updated: {updated_at}")
            
            # Check what it should be according to Google Form
            print(f"\n🔍 According to Google Form, Nikhilesh should have: M")
            
            if tshirt_size == 'M':
                print("✅ CORRECT: Nikhilesh has the right t-shirt size (M)")
            else:
                print(f"❌ WRONG: Nikhilesh has {tshirt_size} but should have M")
                print("   This needs to be fixed!")
        else:
            print("❌ Nikhilesh not found in database")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
