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
  'Strikes: Reds/Yellows': string;
  'Member Name': string;
  'Email': string;
  'Phone #': string;
  'Grade': string;
  'Student ID#': string;
  'Total Hours Volunteering': string;
  'Total Hours Social': string;
  'Added to App': string;
}

interface HourRequest {
  id: string;
  student_s_number: string;
  student_name: string;
  event_name: string;
  hours_requested: number;
  description: string;
  type: 'volunteering' | 'social';
  status: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  admin_notes?: string;
}

interface VerificationResult {
  studentId: string;
  name: string;
  csvVolunteeringHours: number;
  csvSocialHours: number;
  csvTotalHours: number;
  dbVolunteeringHours: number;
  dbSocialHours: number;
  dbTotalHours: number;
  allHourRequests: HourRequest[];
  totalHoursFromRequests: { volunteering: number; social: number; total: number };
  hasIssue: boolean;
  issueDescription?: string;
}

async function verifyComprehensive() {
  console.log('🔍 Starting comprehensive verification of X-marked students...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  console.log(`📄 Reading CSV file: ${csvPath}`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  console.log(`✅ Found ${records.length} rows in CSV\n`);

  // Filter rows with 'X' in "Added to App" column
  const xMarkedRows = records.filter(row => {
    const addedToApp = (row['Added to App'] || '').trim().toUpperCase();
    return addedToApp === 'X';
  });

  console.log(`📍 Found ${xMarkedRows.length} rows marked with X in "Added to App" column\n`);
  console.log('🔎 Verifying hours and checking all hour requests...\n');

  const results: VerificationResult[] = [];
  let processed = 0;

  for (const row of xMarkedRows) {
    processed++;
    const studentId = (row['Student ID#'] || '').trim();
    const name = (row['Member Name'] || '').trim();
    
    if (!studentId || studentId === '') {
      console.log(`⚠️  Row ${processed}: Skipping - no Student ID# (Name: ${name})`);
      continue;
    }

    // Parse hours from CSV
    const csvVolunteering = parseFloat(row['Total Hours Volunteering'] || '0') || 0;
    const csvSocial = parseFloat(row['Total Hours Social'] || '0') || 0;
    const csvTotal = csvVolunteering + csvSocial;

    console.log(`\n[${processed}/${xMarkedRows.length}] Checking: ${name} (ID: ${studentId})`);
    console.log(`   CSV Hours - Volunteering: ${csvVolunteering}, Social: ${csvSocial}, Total: ${csvTotal}`);

    // Query Supabase for student (try both with and without 's' prefix)
    try {
      let student = null;
      let searchSNumber = studentId.toLowerCase();
      
      let studentResult = await supabase
        .from('students')
        .select('s_number, name, volunteering_hours, social_hours, total_hours')
        .eq('s_number', searchSNumber)
        .maybeSingle();
      
      student = studentResult.data;
      
      // If not found, try with 's' prefix
      if (!student && !studentResult.error) {
        searchSNumber = `s${studentId.toLowerCase()}`;
        studentResult = await supabase
          .from('students')
          .select('s_number, name, volunteering_hours, social_hours, total_hours')
          .eq('s_number', searchSNumber)
          .maybeSingle();
        student = studentResult.data;
      }

      if (studentResult.error) {
        console.log(`   ❌ Error querying student: ${studentResult.error.message}`);
        results.push({
          studentId,
          name,
          csvVolunteeringHours: csvVolunteering,
          csvSocialHours: csvSocial,
          csvTotalHours: csvTotal,
          dbVolunteeringHours: 0,
          dbSocialHours: 0,
          dbTotalHours: 0,
          allHourRequests: [],
          totalHoursFromRequests: { volunteering: 0, social: 0, total: 0 },
          hasIssue: true,
          issueDescription: `Error querying student: ${studentResult.error.message}`
        });
        continue;
      }

      if (!student) {
        console.log(`   ✅ Student not found in database (expected - hours should not be added)`);
        // Still check for hour requests
        const { data: requests } = await supabase
          .from('hour_requests')
          .select('*')
          .eq('student_s_number', searchSNumber)
          .eq('status', 'approved');
        
        if (requests && requests.length > 0) {
          console.log(`   ⚠️  WARNING: Student not in database but has ${requests.length} approved hour requests!`);
          results.push({
            studentId,
            name,
            csvVolunteeringHours: csvVolunteering,
            csvSocialHours: csvSocial,
            csvTotalHours: csvTotal,
            dbVolunteeringHours: 0,
            dbSocialHours: 0,
            dbTotalHours: 0,
            allHourRequests: requests || [],
            totalHoursFromRequests: { volunteering: 0, social: 0, total: 0 },
            hasIssue: true,
            issueDescription: `Student not in database but has ${requests.length} approved hour requests`
          });
        } else {
          results.push({
            studentId,
            name,
            csvVolunteeringHours: csvVolunteering,
            csvSocialHours: csvSocial,
            csvTotalHours: csvTotal,
            dbVolunteeringHours: 0,
            dbSocialHours: 0,
            dbTotalHours: 0,
            allHourRequests: [],
            totalHoursFromRequests: { volunteering: 0, social: 0, total: 0 },
            hasIssue: false
          });
        }
        continue;
      }

      // Student exists, check hours
      const dbVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
      const dbSocial = parseFloat(student.social_hours || 0) || 0;
      const dbTotal = parseFloat(student.total_hours || 0) || 0;

      console.log(`   DB Hours - Volunteering: ${dbVolunteering}, Social: ${dbSocial}, Total: ${dbTotal}`);

      // Get all approved hour requests for this student
      const { data: allRequests, error: requestsError } = await supabase
        .from('hour_requests')
        .select('*')
        .eq('student_s_number', student.s_number)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });

      if (requestsError) {
        console.log(`   ⚠️  Error fetching hour requests: ${requestsError.message}`);
      }

      const requests = (allRequests || []) as HourRequest[];
      console.log(`   📋 Found ${requests.length} approved hour request(s)`);

      // Calculate total hours from all requests
      let totalFromRequests = { volunteering: 0, social: 0, total: 0 };
      
      if (requests.length > 0) {
        requests.forEach(req => {
          const hours = parseFloat(req.hours_requested || 0) || 0;
          const type = (req.type || 'volunteering').toLowerCase();
          
          if (type === 'volunteering') {
            totalFromRequests.volunteering += hours;
          } else if (type === 'social') {
            totalFromRequests.social += hours;
          }
          totalFromRequests.total += hours;
        });
        
        console.log(`   📊 Total from requests: ${totalFromRequests.volunteering}V / ${totalFromRequests.social}S / ${totalFromRequests.total}T`);
      }

      // Check if CSV hours match any requests or DB hours
      let hasIssue = false;
      let issueDescription = '';

      // Check if hours match CSV exactly
      const volunteeringMatch = Math.abs(dbVolunteering - csvVolunteering) < 0.01;
      const socialMatch = Math.abs(dbSocial - csvSocial) < 0.01;
      const totalMatch = Math.abs(dbTotal - csvTotal) < 0.01;

      if (volunteeringMatch && csvVolunteering > 0) {
        hasIssue = true;
        issueDescription += `⚠️ Volunteering hours match CSV exactly (${csvVolunteering}), but should NOT be added. `;
      }

      if (socialMatch && csvSocial > 0) {
        hasIssue = true;
        issueDescription += `⚠️ Social hours match CSV exactly (${csvSocial}), but should NOT be added. `;
      }

      if (totalMatch && csvTotal > 0) {
        hasIssue = true;
        issueDescription += `⚠️ Total hours match CSV exactly (${csvTotal}), but should NOT be added. `;
      }

      // Check if any requests match CSV hours (could indicate CSV hours were added via requests)
      if (!hasIssue && requests.length > 0) {
        const matchingRequests = requests.filter(req => {
          const hours = parseFloat(req.hours_requested || 0) || 0;
          const type = (req.type || 'volunteering').toLowerCase();
          
          if (type === 'volunteering' && Math.abs(hours - csvVolunteering) < 0.01 && csvVolunteering > 0) {
            return true;
          }
          if (type === 'social' && Math.abs(hours - csvSocial) < 0.01 && csvSocial > 0) {
            return true;
          }
          return false;
        });

        if (matchingRequests.length > 0) {
          hasIssue = true;
          issueDescription += `⚠️ Found ${matchingRequests.length} hour request(s) with hours matching CSV values. `;
          matchingRequests.forEach(req => {
            const hours = req.hours_requested;
            const type = req.type || 'volunteering';
            const eventName = req.event_name || 'Unknown';
            issueDescription += `Request: ${eventName} (${hours} ${type}). `;
          });
        }

        // Check if DB hours could contain CSV hours
        if (dbVolunteering >= csvVolunteering && csvVolunteering > 0) {
          const diff = dbVolunteering - csvVolunteering;
          if (diff < csvVolunteering * 0.5) { // If DB is within 50% of CSV, might be related
            issueDescription += `⚠️ DB volunteering (${dbVolunteering}) is close to CSV (${csvVolunteering}). `;
          }
        }
        
        if (dbSocial >= csvSocial && csvSocial > 0) {
          const diff = dbSocial - csvSocial;
          if (diff < csvSocial * 0.5) {
            issueDescription += `⚠️ DB social (${dbSocial}) is close to CSV (${csvSocial}). `;
          }
        }
      }

      // Check if student has any hours but CSV says they shouldn't
      if (dbTotal > 0 && !hasIssue) {
        // If they have hours, list them but don't necessarily flag as issue
        // (they might have legitimate hours from other sources)
        console.log(`   ⚠️  NOTE: Student has ${dbTotal} hours in DB. Verify these are not from CSV.`);
      }

      if (hasIssue) {
        console.log(`   ⚠️  ISSUE DETECTED: ${issueDescription.trim()}`);
      } else if (dbTotal === 0) {
        console.log(`   ✅ OK - Student has 0 hours (expected for X-marked entries)`);
      } else {
        console.log(`   ⚠️  Student has ${dbTotal} hours but CSV hours (${csvTotal}) don't match. May have legitimate hours from other sources.`);
      }

      results.push({
        studentId,
        name,
        csvVolunteeringHours: csvVolunteering,
        csvSocialHours: csvSocial,
        csvTotalHours: csvTotal,
        dbVolunteeringHours: dbVolunteering,
        dbSocialHours: dbSocial,
        dbTotalHours: dbTotal,
        allHourRequests: requests,
        totalHoursFromRequests: totalFromRequests,
        hasIssue,
        issueDescription: hasIssue ? issueDescription.trim() : undefined
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ Exception: ${error.message}`);
      results.push({
        studentId,
        name,
        csvVolunteeringHours: csvVolunteering,
        csvSocialHours: csvSocial,
        csvTotalHours: csvTotal,
        dbVolunteeringHours: 0,
        dbSocialHours: 0,
        dbTotalHours: 0,
        allHourRequests: [],
        totalHoursFromRequests: { volunteering: 0, social: 0, total: 0 },
        hasIssue: true,
        issueDescription: `Exception: ${error.message}`
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE VERIFICATION SUMMARY');
  console.log('='.repeat(80));

  const totalChecked = results.length;
  const withIssues = results.filter(r => r.hasIssue).length;
  const withoutIssues = totalChecked - withIssues;
  const studentsWithHours = results.filter(r => r.dbTotalHours > 0).length;
  const studentsWithRequests = results.filter(r => r.allHourRequests.length > 0).length;

  console.log(`\nTotal entries checked: ${totalChecked}`);
  console.log(`✅ Entries without issues: ${withoutIssues}`);
  console.log(`⚠️  Entries with issues: ${withIssues}`);
  console.log(`📋 Students with hours in DB: ${studentsWithHours}`);
  console.log(`📝 Students with approved hour requests: ${studentsWithRequests}`);

  if (withIssues > 0) {
    console.log('\n' + '⚠️ '.repeat(40));
    console.log('ISSUES FOUND - The following students may have CSV hours incorrectly added:');
    console.log('⚠️ '.repeat(40) + '\n');

    results
      .filter(r => r.hasIssue)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name} (ID: ${result.studentId})`);
        console.log(`   CSV Hours: Volunteering=${result.csvVolunteeringHours}, Social=${result.csvSocialHours}, Total=${result.csvTotalHours}`);
        console.log(`   DB Hours:  Volunteering=${result.dbVolunteeringHours}, Social=${result.dbSocialHours}, Total=${result.dbTotalHours}`);
        if (result.allHourRequests.length > 0) {
          console.log(`   Hour Requests: ${result.allHourRequests.length} approved request(s)`);
          console.log(`   Total from requests: ${result.totalHoursFromRequests.volunteering}V / ${result.totalHoursFromRequests.social}S / ${result.totalHoursFromRequests.total}T`);
          result.allHourRequests.slice(0, 3).forEach((req, i) => {
            console.log(`     ${i + 1}. ${req.event_name} - ${req.hours_requested} ${req.type || 'volunteering'} (${req.reviewed_at?.split('T')[0] || 'Unknown date'})`);
          });
          if (result.allHourRequests.length > 3) {
            console.log(`     ... and ${result.allHourRequests.length - 3} more`);
          }
        }
        console.log(`   Issue: ${result.issueDescription}`);
      });
  } else {
    console.log('\n✅ All entries verified! No CSV hours were incorrectly added.');
  }

  // List students with hours that might need review
  const studentsWithNonZeroHours = results.filter(r => r.dbTotalHours > 0 && !r.hasIssue);
  if (studentsWithNonZeroHours.length > 0) {
    console.log('\n\n' + 'ℹ️ '.repeat(40));
    console.log('STUDENTS WITH HOURS (May need manual verification):');
    console.log('ℹ️ '.repeat(40) + '\n');
    
    studentsWithNonZeroHours.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name} (ID: ${result.studentId})`);
      console.log(`   DB Hours: ${result.dbVolunteeringHours}V / ${result.dbSocialHours}S / ${result.dbTotalHours}T`);
      console.log(`   CSV Hours: ${result.csvVolunteeringHours}V / ${result.csvSocialHours}S / ${result.csvTotalHours}T`);
      if (result.allHourRequests.length > 0) {
        console.log(`   Has ${result.allHourRequests.length} approved hour request(s) - verify these are legitimate`);
      }
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'comprehensive_verification_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Run the verification
verifyComprehensive()
  .then(() => {
    console.log('✅ Comprehensive verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });




