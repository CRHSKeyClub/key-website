#!/usr/bin/env python3
"""
Script to update t-shirt sizes in Supabase database.
This will apply the fixes directly to your Supabase database.
"""

import os
import sys
from supabase import create_client, Client

def get_supabase_client():
    """Initialize Supabase client using environment variables."""
    try:
        # Get Supabase credentials from environment variables
        url = os.getenv('EXPO_PUBLIC_SUPABASE_URL')
        key = os.getenv('EXPO_PUBLIC_SUPABASE_ANON_KEY')
        
        if not url or not key:
            print("❌ Error: Supabase credentials not found!")
            print("Please set the following environment variables:")
            print("  EXPO_PUBLIC_SUPABASE_URL=your_supabase_url")
            print("  EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key")
            return None
        
        supabase: Client = create_client(url, key)
        print("✅ Connected to Supabase")
        return supabase
        
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        return None

def get_fixed_discrepancies():
    """Get the list of students with corrected t-shirt sizes."""
    # These are the students we identified and fixed
    discrepancies = [
        {'s_number': 's202943', 'name': 'Elly Chang', 'old_size': 'L', 'new_size': 'M'},
        {'s_number': 's905482', 'name': 'Kevin Chirayil', 'old_size': 'M', 'new_size': 'L'},
        {'s_number': 's923009', 'name': 'Nikhilesh Gnanaraj', 'old_size': 'L', 'new_size': 'M'},
        {'s_number': 's923833', 'name': 'Kathleen Lai', 'old_size': 'S', 'new_size': 'L'},
        {'s_number': 's894833', 'name': 'Suhan Patel', 'old_size': 'M', 'new_size': 'L'},
        {'s_number': 's260168', 'name': 'Avani Yalamanchili', 'old_size': 'M', 'new_size': 'S'}
    ]
    return discrepancies

def update_supabase_tshirt_sizes(supabase: Client):
    """Update t-shirt sizes in Supabase database."""
    discrepancies = get_fixed_discrepancies()
    
    print(f"🔧 Updating {len(discrepancies)} students in Supabase...")
    print("="*60)
    
    successful_updates = []
    failed_updates = []
    
    for student in discrepancies:
        s_number = student['s_number']
        new_size = student['new_size']
        name = student['name']
        
        try:
            # Update the student's t-shirt size in Supabase
            result = supabase.table('students').update({
                'tshirt_size': new_size
            }).eq('s_number', s_number).execute()
            
            if result.data:
                print(f"✅ {s_number} ({name}): Updated to {new_size}")
                successful_updates.append(student)
            else:
                print(f"❌ {s_number} ({name}): No record found or update failed")
                failed_updates.append(student)
                
        except Exception as e:
            print(f"❌ {s_number} ({name}): Error - {e}")
            failed_updates.append(student)
    
    return successful_updates, failed_updates

def verify_supabase_updates(supabase: Client):
    """Verify that the updates were successful in Supabase."""
    discrepancies = get_fixed_discrepancies()
    
    print("\n🔍 Verifying Supabase updates...")
    print("="*50)
    
    try:
        # Get all the students we updated
        s_numbers = [d['s_number'] for d in discrepancies]
        
        result = supabase.table('students').select('s_number, name, tshirt_size').in_('s_number', s_numbers).execute()
        
        if result.data:
            print("Current t-shirt sizes in Supabase:")
            for student in result.data:
                s_number = student['s_number']
                name = student.get('name', 'Unknown')
                current_size = student.get('tshirt_size', 'None')
                
                # Find expected size
                expected = next((d for d in discrepancies if d['s_number'] == s_number), None)
                expected_size = expected['new_size'] if expected else 'Unknown'
                
                status = "✅" if current_size == expected_size else "❌"
                print(f"{status} {s_number} ({name}): {current_size} (expected: {expected_size})")
        else:
            print("❌ Could not retrieve student data from Supabase")
            
    except Exception as e:
        print(f"❌ Error verifying updates: {e}")

def main():
    """Main function to update Supabase with t-shirt size fixes."""
    print("🔧 UPDATE SUPABASE T-SHIRT SIZES")
    print("="*50)
    
    # Initialize Supabase client
    supabase = get_supabase_client()
    if not supabase:
        return
    
    # Show what we're about to update
    discrepancies = get_fixed_discrepancies()
    print(f"\n📋 Students to update ({len(discrepancies)} total):")
    for student in discrepancies:
        print(f"  • {student['s_number']} ({student['name']}): {student['old_size']} → {student['new_size']}")
    
    # Ask for confirmation
    print(f"\n⚠️  This will update {len(discrepancies)} students in your Supabase database.")
    response = input("Do you want to proceed? (y/N): ").strip().lower()
    
    if response not in ['y', 'yes']:
        print("❌ Operation cancelled.")
        return
    
    # Update the database
    successful, failed = update_supabase_tshirt_sizes(supabase)
    
    # Show results
    print("\n" + "="*60)
    print("UPDATE RESULTS")
    print("="*60)
    print(f"✅ Successfully updated: {len(successful)} students")
    print(f"❌ Failed to update: {len(failed)} students")
    
    if failed:
        print("\nFailed updates:")
        for student in failed:
            print(f"  • {student['s_number']} ({student['name']})")
    
    # Verify the updates
    verify_supabase_updates(supabase)
    
    print("\n🎉 Supabase update complete!")

if __name__ == "__main__":
    main()
