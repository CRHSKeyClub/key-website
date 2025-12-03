import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CSVRow {
  'Student ID#': string;
  'Member Name': string;
  'Total Hours Volunteering': string;
  'Total Hours Social': string;
  'Added to App': string;
}

async function checkXuanHo() {
  const studentId = '935062'; // Xuan Ho's ID
  
  console.log(`🔍 Checking Xuan Ho (Student ID: ${studentId})...\n`);
  
  // Read CSV to get Xuan Ho's data
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  const xuanHoCSV = records.find(row => {
    const id = (row['Student ID#'] || '').trim();
    return id === studentId;
  });

  if (xuanHoCSV) {
    const csvVolunteering = parseFloat(xuanHoCSV['Total Hours Volunteering'] || '0') || 0;
    const csvSocial = parseFloat(xuanHoCSV['Total Hours Social'] || '0') || 0;
    const csvTotal = csvVolunteering + csvSocial;
    const addedToApp = (xuanHoCSV['Added to App'] || '').trim().toUpperCase();
    const isMarkedX = addedToApp === 'X';

    console.log(`📋 CSV Entry:`);
    console.log(`   Name: ${xuanHoCSV['Member Name']}`);
    console.log(`   Volunteering: ${csvVolunteering} hours`);
    console.log(`   Social: ${csvSocial} hours`);
    console.log(`   Total: ${csvTotal} hours`);
    console.log(`   Marked with X: ${isMarkedX ? 'YES (should NOT be added)' : 'NO (should be added)'}\n`);
  }

  // Get student from database
  const variations = ['935062', 's935062'];
  
  for (const id of variations) {
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('s_number', id)
      .maybeSingle();
    
    if (error) {
      console.log(`❌ Error with ID ${id}: ${error.message}`);
      continue;
    }
    
    if (student) {
      console.log(`✅ Found student!`);
      console.log(`   Name: ${student.name}`);
      console.log(`   S Number: ${student.s_number}`);
      console.log(`\n📊 CURRENT HOURS IN DATABASE:`);
      console.log(`   Volunteering Hours: ${student.volunteering_hours || 0}`);
      console.log(`   Social Hours: ${student.social_hours || 0}`);
      console.log(`   Total Hours: ${student.total_hours || 0}`);

      // Get all hour requests
      const { data: requests } = await supabase
        .from('hour_requests')
        .select('*')
        .eq('student_s_number', student.s_number)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });

      if (requests && requests.length > 0) {
        console.log(`\n📝 Approved Hour Requests (${requests.length}):`);
        
        let totalFromRequests = { volunteering: 0, social: 0, total: 0 };
        let realRequests = { volunteering: 0, social: 0, total: 0 };
        
        requests.forEach((req: any, index: number) => {
          const hours = parseFloat(req.hours_requested || 0) || 0;
          const type = (req.type || 'volunteering').toLowerCase();
          const eventName = req.event_name || 'Unknown';
          const isAutoCreated = eventName.toLowerCase().includes('hours added from other events');
          const date = req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'Unknown';
          
          console.log(`   ${index + 1}. ${eventName}`);
          console.log(`      Hours: ${hours} ${type}`);
          console.log(`      Reviewed: ${date} by ${req.reviewed_by || 'Unknown'}`);
          if (isAutoCreated) {
            console.log(`      ⚠️  AUTO-CREATED (should be excluded from calculations)`);
          }
          
          if (type === 'volunteering') {
            totalFromRequests.volunteering += hours;
            if (!isAutoCreated) {
              realRequests.volunteering += hours;
            }
          } else {
            totalFromRequests.social += hours;
            if (!isAutoCreated) {
              realRequests.social += hours;
            }
          }
          totalFromRequests.total += hours;
          if (!isAutoCreated) {
            realRequests.total += hours;
          }
        });
        
        console.log(`\n📊 Summary:`);
        console.log(`   Total from all requests: ${totalFromRequests.volunteering}V / ${totalFromRequests.social}S / ${totalFromRequests.total}T`);
        console.log(`   From real requests (excluding auto-created): ${realRequests.volunteering}V / ${realRequests.social}S / ${realRequests.total}T`);
        
        if (xuanHoCSV) {
          const csvVolunteering = parseFloat(xuanHoCSV['Total Hours Volunteering'] || '0') || 0;
          const csvSocial = parseFloat(xuanHoCSV['Total Hours Social'] || '0') || 0;
          const csvTotal = csvVolunteering + csvSocial;
          
          const expectedVolunteering = realRequests.volunteering + csvVolunteering;
          const expectedSocial = realRequests.social + csvSocial;
          const expectedTotal = expectedVolunteering + expectedSocial;
          
          console.log(`   From CSV: ${csvVolunteering}V / ${csvSocial}S / ${csvTotal}T`);
          console.log(`   Expected (real requests + CSV): ${expectedVolunteering}V / ${expectedSocial}S / ${expectedTotal}T`);
          console.log(`   Database: ${student.volunteering_hours || 0}V / ${student.social_hours || 0}S / ${student.total_hours || 0}T`);
          
          const diffVolunteering = (student.volunteering_hours || 0) - expectedVolunteering;
          const diffSocial = (student.social_hours || 0) - expectedSocial;
          const diffTotal = (student.total_hours || 0) - expectedTotal;
          
          if (Math.abs(diffTotal) > 0.1) {
            console.log(`\n⚠️  DISCREPANCY:`);
            console.log(`   Difference: ${diffVolunteering > 0 ? '+' : ''}${diffVolunteering.toFixed(1)}V / ${diffSocial > 0 ? '+' : ''}${diffSocial.toFixed(1)}S / ${diffTotal > 0 ? '+' : ''}${diffTotal.toFixed(1)}T`);
            if (diffTotal > 0) {
              console.log(`   Database has ${diffTotal.toFixed(1)} MORE hours than expected`);
            } else {
              console.log(`   Database has ${Math.abs(diffTotal).toFixed(1)} FEWER hours than expected`);
            }
          } else {
            console.log(`\n✅ Hours match expected values!`);
          }
        }
      } else {
        console.log(`\n📝 No approved hour requests found`);
        
        if (xuanHoCSV) {
          const csvVolunteering = parseFloat(xuanHoCSV['Total Hours Volunteering'] || '0') || 0;
          const csvSocial = parseFloat(xuanHoCSV['Total Hours Social'] || '0') || 0;
          const csvTotal = csvVolunteering + csvSocial;
          
          console.log(`\n📊 Expected:`);
          console.log(`   From CSV: ${csvVolunteering}V / ${csvSocial}S / ${csvTotal}T`);
          console.log(`   Database: ${student.volunteering_hours || 0}V / ${student.social_hours || 0}S / ${student.total_hours || 0}T`);
          
          const diffTotal = (student.total_hours || 0) - csvTotal;
          if (Math.abs(diffTotal) > 0.1) {
            console.log(`\n⚠️  Difference: ${diffTotal > 0 ? '+' : ''}${diffTotal.toFixed(1)}T`);
          } else {
            console.log(`\n✅ Hours match CSV!`);
          }
        }
      }
      
      return;
    }
  }
  
  console.log(`❌ Xuan Ho (ID: 935062) was not found in the database.`);
}

checkXuanHo()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });



