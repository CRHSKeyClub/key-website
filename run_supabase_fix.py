#!/usr/bin/env python3
"""
Script to update Supabase with t-shirt size fixes.
This script will try to get your Supabase credentials and apply the fixes.
"""

import os
import sys
from supabase import create_client, Client

def get_supabase_credentials():
    """Get Supabase credentials from environment or prompt user."""
    # Try to get from environment variables
    url = os.getenv('EXPO_PUBLIC_SUPABASE_URL') or os.getenv('VITE_SUPABASE_URL')
    key = os.getenv('EXPO_PUBLIC_SUPABASE_ANON_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY')
    
    if url and key:
        print("✅ Found Supabase credentials in environment variables")
        return url, key
    
    # If not found, prompt user
    print("❌ Supabase credentials not found in environment variables")
    print("\nPlease provide your Supabase credentials:")
    print("You can find these in your Supabase dashboard:")
    print("  Settings → API → Project URL and anon public key")
    print()
    
    url = input("Enter your Supabase URL (e.g., https://your-project.supabase.co): ").strip()
    key = input("Enter your Supabase anon key: ").strip()
    
    if not url or not key:
        print("❌ Invalid credentials provided")
        return None, None
    
    return url, key

def get_supabase_client():
    """Initialize Supabase client."""
    try:
        url, key = get_supabase_credentials()
        
        if not url or not key:
            return None
        
        supabase: Client = create_client(url, key)
        print("✅ Connected to Supabase")
        return supabase
        
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        print("Make sure you have the supabase-py package installed:")
        print("  pip install supabase")
        return None

def get_all_fixes():
    """Get the complete list of all t-shirt size fixes."""
    fixes = [
        {'s_number': 's202943', 'name': 'Elly Chang', 'old_size': 'L', 'new_size': 'M'},
        {'s_number': 's905482', 'name': 'Kevin Chirayil', 'old_size': 'M', 'new_size': 'L'},
        {'s_number': 's923009', 'name': 'Nikhilesh Gnanaraj', 'old_size': 'L', 'new_size': 'M'},
        {'s_number': 's923833', 'name': 'Kathleen Lai', 'old_size': 'S', 'new_size': 'L'},
        {'s_number': 's894833', 'name': 'Suhan Patel', 'old_size': 'M', 'new_size': 'L'},
        {'s_number': 's260168', 'name': 'Avani Yalamanchili', 'old_size': 'M', 'new_size': 'S'}
    ]
    return fixes

def update_supabase_all_fixes(supabase: Client):
    """Update all t-shirt size fixes in Supabase database."""
    fixes = get_all_fixes()
    
    print(f"🔧 Updating {len(fixes)} students in Supabase...")
    print("="*60)
    
    successful_updates = []
    failed_updates = []
    
    for fix in fixes:
        s_number = fix['s_number']
        new_size = fix['new_size']
        name = fix['name']
        old_size = fix['old_size']
        
        try:
            # Update the student's t-shirt size in Supabase
            result = supabase.table('students').update({
                'tshirt_size': new_size
            }).eq('s_number', s_number).execute()
            
            if result.data:
                print(f"✅ {s_number} ({name}): {old_size} → {new_size}")
                successful_updates.append(fix)
            else:
                print(f"❌ {s_number} ({name}): No record found or update failed")
                failed_updates.append(fix)
                
        except Exception as e:
            print(f"❌ {s_number} ({name}): Error - {e}")
            failed_updates.append(fix)
    
    return successful_updates, failed_updates

def verify_all_fixes(supabase: Client):
    """Verify that all fixes were successful in Supabase."""
    fixes = get_all_fixes()
    
    print("\n🔍 Verifying all fixes in Supabase...")
    print("="*50)
    
    try:
        # Get all the students we updated
        s_numbers = [f['s_number'] for f in fixes]
        
        result = supabase.table('students').select('s_number, name, tshirt_size').in_('s_number', s_numbers).execute()
        
        if result.data:
            print("Current t-shirt sizes in Supabase:")
            all_correct = True
            
            for student in result.data:
                s_number = student['s_number']
                name = student.get('name', 'Unknown')
                current_size = student.get('tshirt_size', 'None')
                
                # Find expected size
                expected = next((f for f in fixes if f['s_number'] == s_number), None)
                expected_size = expected['new_size'] if expected else 'Unknown'
                
                status = "✅" if current_size == expected_size else "❌"
                print(f"{status} {s_number} ({name}): {current_size} (expected: {expected_size})")
                
                if current_size != expected_size:
                    all_correct = False
            
            return all_correct
        else:
            print("❌ Could not retrieve student data from Supabase")
            return False
            
    except Exception as e:
        print(f"❌ Error verifying updates: {e}")
        return False

def main():
    """Main function to update Supabase with all t-shirt size fixes."""
    print("🔧 UPDATE SUPABASE - ALL T-SHIRT SIZE FIXES")
    print("="*60)
    
    # Initialize Supabase client
    supabase = get_supabase_client()
    if not supabase:
        return
    
    # Show what we're about to update
    fixes = get_all_fixes()
    print(f"\n📋 Students to update ({len(fixes)} total):")
    for fix in fixes:
        print(f"  • {fix['s_number']} ({fix['name']}): {fix['old_size']} → {fix['new_size']}")
    
    # Ask for confirmation
    print(f"\n⚠️  This will update {len(fixes)} students in your Supabase database.")
    response = input("Do you want to proceed? (y/N): ").strip().lower()
    
    if response not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return
    
    # Update the database
    successful, failed = update_supabase_all_fixes(supabase)
    
    # Show results
    print("\n" + "="*60)
    print("UPDATE RESULTS")
    print("="*60)
    print(f"✅ Successfully updated: {len(successful)} students")
    print(f"❌ Failed to update: {len(failed)} students")
    
    if failed:
        print("\nFailed updates:")
        for fix in failed:
            print(f"  • {fix['s_number']} ({fix['name']})")
    
    # Verify the updates
    all_correct = verify_all_fixes(supabase)
    
    print("\n" + "="*60)
    print("FINAL SUMMARY")
    print("="*60)
    
    if all_correct:
        print("🎉 All t-shirt size fixes have been successfully applied to Supabase!")
        print("✅ All 6 students now have the correct t-shirt sizes from the Google Form")
    else:
        print("⚠️  Some fixes may not have been applied correctly. Please check the verification output above.")
    
    print(f"\nFixed students:")
    for fix in successful:
        print(f"  • {fix['s_number']} ({fix['name']}): {fix['old_size']} → {fix['new_size']}")

if __name__ == "__main__":
    main()
