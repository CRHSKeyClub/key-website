#!/usr/bin/env python3
"""
Script to check what the Google Form says Nikhilesh's t-shirt size should be.
"""

import csv
import os

def main():
    """Check Nikhilesh's t-shirt size in Google Form."""
    print("🔍 CHECKING NIKHILESH'S T-SHIRT SIZE IN GOOGLE FORM")
    print("="*60)
    
    csv_file = './Key Club Parent Permission Form 2025-2026 (Responses) - Form Responses 1.csv'
    
    if not os.path.exists(csv_file):
        print(f"❌ CSV file not found: {csv_file}")
        return
    
    print(f"📊 Reading Google Form data from: {csv_file}")
    
    try:
        with open(csv_file, 'r', newline='', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                student_id_raw = row.get('Student ID # (NO S)', '').strip()
                first_name = row.get('First Name', '').strip()
                last_name = row.get('Last Name', '').strip()
                tshirt_size = row.get('T-Shirt Size', '').strip().upper()
                
                # Look for Nikhilesh
                if 'nikhilesh' in first_name.lower() or 'gnanaraj' in last_name.lower() or student_id_raw == '923009':
                    print(f"\n🎯 FOUND NIKHILESH IN GOOGLE FORM:")
                    print(f"   Student ID: {student_id_raw}")
                    print(f"   Name: {first_name} {last_name}")
                    print(f"   T-shirt Size: {tshirt_size}")
                    print(f"   Full Student ID: s{student_id_raw}")
                    
                    # Also check what we think it should be
                    if student_id_raw == '923009':
                        print(f"\n✅ This matches s923009 in our database")
                        print(f"   Google Form says: {tshirt_size}")
                        print(f"   Database should have: {tshirt_size}")
                    break
            else:
                print("❌ Nikhilesh not found in Google Form")
                
    except Exception as e:
        print(f"❌ Error reading CSV: {e}")

if __name__ == "__main__":
    main()
