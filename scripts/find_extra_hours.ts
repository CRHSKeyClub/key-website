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
  'Total Hours Volunteering': string;
  'Total Hours Social': string;
}

interface Student {
  id: string;
  s_number: string;
  name: string;
  volunteering_hours: number;
  social_hours: number;
  total_hours: number;
}

interface HourRequest {
  hours_requested: number;
  type: 'volunteering' | 'social';
  event_name: string;
}

interface ExtraHoursIssue {
  studentSNumber: string;
  studentName: string;
  dbVolunteering: number;
  dbSocial: number;
  dbTotal: number;
  requestsVolunteering: number;
  requestsSocial: number;
  requestsTotal: number;
  csvVolunteering: number;
  csvSocial: number;
  csvTotal: number;
  expectedTotal: number;
  extraVolunteering: number;
  extraSocial: number;
  extraTotal: number;
  allRequests: HourRequest[];
}

async function findExtraHours() {
  console.log('🔍 Finding students with extra hours (DB > Approved Requests + CSV)...\n');

  // Read CSV
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  const csvDataMap = new Map<string, { volunteering: number; social: number }>();
  records.forEach(row => {
    const studentId = (row['Student ID#'] || '').trim();
    if (studentId) {
      csvDataMap.set(studentId.toLowerCase(), {
        volunteering: parseFloat(row['Total Hours Volunteering'] || '0') || 0,
        social: parseFloat(row['Total Hours Social'] || '0') || 0
      });
    }
  });

  console.log(`✅ Loaded ${csvDataMap.size} students from CSV\n`);

  // Get all students
  let allStudents: Student[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('students')
      .select('id, s_number, name, volunteering_hours, social_hours, total_hours')
      .range(offset, offset + limit - 1)
      .order('name', { ascending: true });

    if (error) throw error;

    if (batch && batch.length > 0) {
      allStudents = allStudents.concat(batch as Student[]);
      offset += limit;
      hasMore = batch.length === limit;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allStudents.length} students in database\n`);

  const issues: ExtraHoursIssue[] = [];

  for (const student of allStudents) {
    const dbVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
    const dbSocial = parseFloat(student.social_hours || 0) || 0;
    const dbTotal = parseFloat(student.total_hours || 0) || 0;

    if (dbTotal === 0) continue;

    const studentIdForCSV = student.s_number.toLowerCase().replace(/^s/, '');
    const csvData = csvDataMap.get(studentIdForCSV);
    const csvVolunteering = csvData?.volunteering || 0;
    const csvSocial = csvData?.social || 0;
    const csvTotal = csvVolunteering + csvSocial;

    // Get approved requests (EXCLUDE "Hours Added from Other Events" - those were artificially created)
    const { data: requests } = await supabase
      .from('hour_requests')
      .select('hours_requested, type, event_name')
      .eq('student_s_number', student.s_number)
      .eq('status', 'approved');

    let requestsVolunteering = 0;
    let requestsSocial = 0;

    (requests || []).forEach((req: HourRequest) => {
      // Skip "Hours Added from Other Events" - these were auto-created and shouldn't count
      const eventName = (req.event_name || '').toLowerCase();
      if (eventName.includes('hours added from other events')) {
        return;
      }

      const hours = parseFloat(req.hours_requested || 0) || 0;
      const type = (req.type || 'volunteering').toLowerCase();
      if (type === 'volunteering') {
        requestsVolunteering += hours;
      } else {
        requestsSocial += hours;
      }
    });

    const requestsTotal = requestsVolunteering + requestsSocial;

    // Expected = real requests (excluding auto-created) + CSV (always include CSV)
    const expectedVolunteering = requestsVolunteering + csvVolunteering;
    const expectedSocial = requestsSocial + csvSocial;
    const expectedTotal = expectedVolunteering + expectedSocial;

    // Check if DB has MORE than expected
    const extraVolunteering = dbVolunteering - expectedVolunteering;
    const extraSocial = dbSocial - expectedSocial;
    const extraTotal = dbTotal - expectedTotal;

    if (extraTotal > 0.1) { // More than 0.1 hours extra
      issues.push({
        studentSNumber: student.s_number,
        studentName: student.name || 'Unknown',
        dbVolunteering,
        dbSocial,
        dbTotal,
        requestsVolunteering,
        requestsSocial,
        requestsTotal,
        csvVolunteering,
        csvSocial,
        csvTotal,
        expectedTotal,
        extraVolunteering,
        extraSocial,
        extraTotal,
        allRequests: requests || []
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 STUDENTS WITH EXTRA HOURS');
  console.log('Expected = Approved Requests + CSV Hours');
  console.log('='.repeat(80));

  console.log(`\nTotal students with extra hours: ${issues.length}`);
  const totalExtra = issues.reduce((sum, i) => sum + i.extraTotal, 0);
  console.log(`Total extra hours across all students: ${totalExtra.toFixed(1)}\n`);

  if (issues.length > 0) {
    issues
      .sort((a, b) => b.extraTotal - a.extraTotal)
      .forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.studentName} (${issue.studentSNumber})`);
        console.log(`   Database: ${issue.dbVolunteering}V / ${issue.dbSocial}S / ${issue.dbTotal}T`);
        console.log(`   From requests: ${issue.requestsVolunteering}V / ${issue.requestsSocial}S / ${issue.requestsTotal}T`);
        console.log(`   From CSV: ${issue.csvVolunteering}V / ${issue.csvSocial}S / ${issue.csvTotal}T`);
        console.log(`   Expected: ${(issue.requestsVolunteering + issue.csvVolunteering).toFixed(1)}V / ${(issue.requestsSocial + issue.csvSocial).toFixed(1)}S / ${issue.expectedTotal.toFixed(1)}T`);
        console.log(`   ⚠️  EXTRA: +${issue.extraVolunteering.toFixed(1)}V / +${issue.extraSocial.toFixed(1)}S / +${issue.extraTotal.toFixed(1)}T`);
        
        // Show "Hours Added from Other Events" requests that might be the issue
        const otherEventsRequests = issue.allRequests.filter(r => 
          r.event_name && r.event_name.toLowerCase().includes('hours added from other events')
        );
        if (otherEventsRequests.length > 0) {
          console.log(`   🔍 Has ${otherEventsRequests.length} "Hours Added from Other Events" request(s):`);
          otherEventsRequests.forEach(req => {
            console.log(`      - ${req.hours_requested} ${req.type || 'volunteering'} hours`);
          });
        }
      });
  } else {
    console.log('\n✅ No students with extra hours found!');
  }

  // Check Alice specifically
  console.log('\n\n' + '='.repeat(80));
  console.log('🔍 ALICE SOSA DETAILED CHECK');
  console.log('='.repeat(80));
  
  const aliceIssue = issues.find(i => 
    i.studentSNumber.toLowerCase() === 's127820' || 
    i.studentSNumber === '127820'
  );
  
  if (aliceIssue) {
    console.log(`\n📋 Alice Sosa has EXTRA hours:`);
    console.log(`   Database: ${aliceIssue.dbVolunteering}V / ${aliceIssue.dbSocial}S / ${aliceIssue.dbTotal}T`);
    console.log(`   From approved requests: ${aliceIssue.requestsVolunteering}V / ${aliceIssue.requestsSocial}S / ${aliceIssue.requestsTotal}T`);
    console.log(`   From CSV: ${aliceIssue.csvVolunteering}V / ${aliceIssue.csvSocial}S / ${aliceIssue.csvTotal}T`);
    console.log(`   Expected total: ${aliceIssue.expectedTotal.toFixed(1)}T`);
    console.log(`   ⚠️  Extra hours: +${aliceIssue.extraTotal.toFixed(1)}T`);
    console.log(`\n   All requests:`);
    aliceIssue.allRequests.forEach((req, i) => {
      console.log(`     ${i + 1}. ${req.event_name} - ${req.hours_requested} ${req.type || 'volunteering'}`);
    });
    console.log(`\n   💡 Alice should have: ${aliceIssue.requestsVolunteering + aliceIssue.csvVolunteering}V / ${aliceIssue.requestsSocial + aliceIssue.csvSocial}S / ${aliceIssue.expectedTotal.toFixed(1)}T`);
    console.log(`   💡 But has: ${aliceIssue.dbVolunteering}V / ${aliceIssue.dbSocial}S / ${aliceIssue.dbTotal}T`);
  } else {
    console.log(`\n   ✅ Alice Sosa's hours are correct`);
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

findExtraHours()
  .then(() => {
    console.log('✅ Analysis complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });

