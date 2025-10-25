#!/usr/bin/env python3
"""
Script to fix Nikhilesh's t-shirt size immediately.
"""

from supabase import create_client, Client

# Supabase credentials
SUPABASE_URL = "https://zvoavkzruhnzzeqyihrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM"

def main():
    """Fix Nikhilesh's t-shirt size in Supabase."""
    print("🔧 FIXING NIKHILESH'S T-SHIRT SIZE")
    print("="*50)
    
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase")
        
        # Check current state
        print(f"\n🔍 Current state of Nikhilesh (s923009)...")
        result = supabase.table('students').select('s_number, name, tshirt_size').eq('s_number', 's923009').execute()
        
        if result.data:
            student = result.data[0]
            current_size = student.get('tshirt_size', 'None')
            print(f"   Current t-shirt size: {current_size}")
            print(f"   Should be: L (from Google Form)")
            
            if current_size != 'L':
                print(f"\n🔧 Updating Nikhilesh's t-shirt size: {current_size} → L")
                
                # Update to L
                update_result = supabase.table('students').update({
                    'tshirt_size': 'L'
                }).eq('s_number', 's923009').execute()
                
                if update_result.data:
                    print("✅ SUCCESS: Nikhilesh's t-shirt size updated to L")
                    
                    # Verify the update
                    verify_result = supabase.table('students').select('s_number, name, tshirt_size').eq('s_number', 's923009').execute()
                    if verify_result.data:
                        new_size = verify_result.data[0].get('tshirt_size', 'None')
                        print(f"✅ VERIFIED: Nikhilesh now has t-shirt size: {new_size}")
                else:
                    print("❌ FAILED: Could not update Nikhilesh's t-shirt size")
            else:
                print("✅ Nikhilesh already has the correct t-shirt size (L)")
        else:
            print("❌ Nikhilesh not found in database")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()
