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
}

async function checkAjitesh() {
  const studentId = '219164'; // Ajitesh's ID
  
  console.log(`🔍 Checking Ajitesh Kowkuntla (Student ID: ${studentId})...\n`);
  
  // Read CSV
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  const ajiteshCSV = records.find(row => {
    const id = (row['Student ID#'] || '').trim();
    return id === studentId;
  });

  if (ajiteshCSV) {
    const csvVolunteering = parseFloat(ajiteshCSV['Total Hours Volunteering'] || '0') || 0;
    const csvSocial = parseFloat(ajiteshCSV['Total Hours Social'] || '0') || 0;
    const csvTotal = csvVolunteering + csvSocial;

    console.log(`📋 CSV Entry:`);
    console.log(`   Name: ${ajiteshCSV['Member Name']}`);
    console.log(`   Volunteering: ${csvVolunteering} hours`);
    console.log(`   Social: ${csvSocial} credits`);
    console.log(`   Total from CSV: ${csvTotal}\n`);
  }

  // Get student from database
  const variations = ['219164', 's219164'];
  
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
      console.log(`   Social Credits: ${student.social_hours || 0}`);
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
        
        requests.forEach((req: any, index: number) => {
          const hours = parseFloat(req.hours_requested || 0) || 0;
          const type = (req.type || 'volunteering').toLowerCase();
          const eventName = req.event_name || 'Unknown';
          const date = req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'Unknown';
          
          console.log(`   ${index + 1}. ${eventName}`);
          console.log(`      Hours: ${hours} ${type}`);
          console.log(`      Reviewed: ${date}`);
          
          if (type === 'volunteering') {
            totalFromRequests.volunteering += hours;
          } else {
            totalFromRequests.social += hours;
          }
          totalFromRequests.total += hours;
        });
        
        console.log(`\n📊 Total from requests: ${totalFromRequests.volunteering}V / ${totalFromRequests.social}S / ${totalFromRequests.total}T`);
        
        if (ajiteshCSV) {
          const csvVolunteering = parseFloat(ajiteshCSV['Total Hours Volunteering'] || '0') || 0;
          const csvSocial = parseFloat(ajiteshCSV['Total Hours Social'] || '0') || 0;
          
          console.log(`\n📊 Analysis:`);
          console.log(`   CSV: ${csvVolunteering}V + ${csvSocial}S = ${csvVolunteering + csvSocial}T`);
          console.log(`   Expected total hours: ${csvVolunteering} (CSV volunteering only, social is just credits)`);
          console.log(`   Current total hours: ${student.total_hours || 0}`);
          console.log(`   Expected social credits: ${csvSocial}`);
          console.log(`   Current social credits: ${student.social_hours || 0}`);
          
          const expectedTotal = csvVolunteering; // Social doesn't add to total
          const actualTotal = parseFloat(student.total_hours || 0) || 0;
          const diff = actualTotal - expectedTotal;
          
          if (Math.abs(diff) > 0.1) {
            console.log(`\n⚠️  ISSUE: Total hours should be ${expectedTotal} but is ${actualTotal}`);
            console.log(`   Difference: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}`);
          } else {
            console.log(`\n✅ Total hours are correct!`);
          }
        }
      }
      
      return;
    }
  }
  
  console.log(`❌ Ajitesh (ID: 219164) was not found in the database.`);
}

checkAjitesh()
  .then(() => {
    console.log('\n✅ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });

