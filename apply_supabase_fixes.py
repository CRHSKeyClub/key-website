#!/usr/bin/env python3
"""
Simple script to apply t-shirt size fixes to Supabase.
Replace the URL and KEY variables below with your actual Supabase credentials.
"""

import os
from supabase import create_client, Client

# ============================================================
# SUPABASE CREDENTIALS - REPLACE WITH YOUR ACTUAL VALUES
# ============================================================
# Get these from your Supabase dashboard: Settings → API
SUPABASE_URL = "https://zvoavkzruhnzzeqyihrc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM"

# ============================================================
# T-SHIRT SIZE FIXES
# ============================================================
FIXES = [
    {'s_number': 's202943', 'name': 'Elly Chang', 'old_size': 'L', 'new_size': 'M'},
    {'s_number': 's905482', 'name': 'Kevin Chirayil', 'old_size': 'M', 'new_size': 'L'},
    {'s_number': 's923009', 'name': 'Nikhilesh Gnanaraj', 'old_size': 'L', 'new_size': 'M'},
    {'s_number': 's923833', 'name': 'Kathleen Lai', 'old_size': 'S', 'new_size': 'L'},
    {'s_number': 's894833', 'name': 'Suhan Patel', 'old_size': 'M', 'new_size': 'L'},
    {'s_number': 's260168', 'name': 'Avani Yalamanchili', 'old_size': 'M', 'new_size': 'S'}
]

def main():
    """Apply all t-shirt size fixes to Supabase."""
    print("🔧 APPLYING T-SHIRT SIZE FIXES TO SUPABASE")
    print("="*60)
    
    # Check if credentials are set
    if SUPABASE_URL == "https://your-project-id.supabase.co" or SUPABASE_KEY == "your-anon-key-here":
        print("❌ Please update the SUPABASE_URL and SUPABASE_KEY variables in this script")
        print("   with your actual Supabase credentials from your dashboard.")
        print("   Settings → API → Project URL and anon public key")
        return
    
    try:
        # Initialize Supabase client
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Connected to Supabase")
        
        # Show what we're updating
        print(f"\n📋 Updating {len(FIXES)} students:")
        for fix in FIXES:
            print(f"  • {fix['s_number']} ({fix['name']}): {fix['old_size']} → {fix['new_size']}")
        
        # Apply fixes
        print(f"\n🔧 Applying fixes...")
        successful = 0
        failed = 0
        
        for fix in FIXES:
            s_number = fix['s_number']
            new_size = fix['new_size']
            name = fix['name']
            old_size = fix['old_size']
            
            try:
                # Update the student's t-shirt size
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
        
        # Show results
        print(f"\n" + "="*60)
        print("RESULTS")
        print("="*60)
        print(f"✅ Successfully updated: {successful} students")
        print(f"❌ Failed to update: {failed} students")
        
        if successful > 0:
            print(f"\n🎉 T-shirt size fixes applied successfully!")
            print("All students now have the correct t-shirt sizes from the Google Form.")
        
        # Verify the updates
        print(f"\n🔍 Verifying updates...")
        try:
            s_numbers = [f['s_number'] for f in FIXES]
            result = supabase.table('students').select('s_number, name, tshirt_size').in_('s_number', s_numbers).execute()
            
            if result.data:
                print("Current t-shirt sizes in Supabase:")
                for student in result.data:
                    s_number = student['s_number']
                    name = student.get('name', 'Unknown')
                    current_size = student.get('tshirt_size', 'None')
                    
                    # Find expected size
                    expected = next((f for f in FIXES if f['s_number'] == s_number), None)
                    expected_size = expected['new_size'] if expected else 'Unknown'
                    
                    status = "✅" if current_size == expected_size else "❌"
                    print(f"{status} {s_number} ({name}): {current_size} (expected: {expected_size})")
        except Exception as e:
            print(f"❌ Error verifying updates: {e}")
        
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        print("Please check your credentials and try again.")

if __name__ == "__main__":
    main()
