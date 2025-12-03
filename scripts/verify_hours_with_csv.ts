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
}

interface CSVData {
  volunteering: number;
  social: number;
  total: number;
  shouldBeAdded: boolean; // true if NOT marked with X
}

interface Discrepancy {
  studentSNumber: string;
  studentName: string;
  dbVolunteering: number;
  dbSocial: number;
  dbTotal: number;
  hoursFromRequests: { volunteering: number; social: number; total: number };
  hoursFromCSV: { volunteering: number; social: number; total: number };
  csvShouldBeAdded: boolean;
  expectedVolunteering: number;
  expectedSocial: number;
  expectedTotal: number;
  extraVolunteering: number;
  extraSocial: number;
  extraTotal: number;
  issue: string;
}

async function verifyHoursWithCSV() {
  console.log('🔍 Verifying hours: Approved Requests + CSV (excluding X-marked entries)...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  console.log(`📄 Reading CSV file...`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  // Build map of CSV data by student ID
  const csvDataMap = new Map<string, CSVData>();
  
  records.forEach(row => {
    const studentId = (row['Student ID#'] || '').trim();
    if (studentId) {
      const volunteering = parseFloat(row['Total Hours Volunteering'] || '0') || 0;
      const social = parseFloat(row['Total Hours Social'] || '0') || 0;
      const addedToApp = (row['Added to App'] || '').trim().toUpperCase();
      const shouldBeAdded = addedToApp !== 'X'; // Not marked with X
      
      csvDataMap.set(studentId.toLowerCase(), {
        volunteering,
        social,
        total: volunteering + social,
        shouldBeAdded
      });
    }
  });

  console.log(`✅ Loaded ${csvDataMap.size} students from CSV\n`);

  // Get all students from database
  let allStudents: Student[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log('📋 Fetching all students from database...');
  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('students')
      .select('id, s_number, name, volunteering_hours, social_hours, total_hours')
      .range(offset, offset + limit - 1)
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Error fetching students:', error);
      throw error;
    }

    if (batch && batch.length > 0) {
      allStudents = allStudents.concat(batch as Student[]);
      offset += limit;
      hasMore = batch.length === limit;
      if (batch.length === limit) {
        console.log(`  Fetched ${allStudents.length} students so far...`);
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allStudents.length} students in database\n`);
  console.log('🔎 Analyzing each student...\n');

  const discrepancies: Discrepancy[] = [];
  let processed = 0;

  for (const student of allStudents) {
    processed++;
    const dbVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
    const dbSocial = parseFloat(student.social_hours || 0) || 0;
    const dbTotal = parseFloat(student.total_hours || 0) || 0;

    // Get student ID without 's' prefix for CSV lookup
    const studentIdForCSV = student.s_number.toLowerCase().replace(/^s/, '');

    // Get CSV data for this student
    const csvData = csvDataMap.get(studentIdForCSV);
    const csvVolunteering = csvData?.volunteering || 0;
    const csvSocial = csvData?.social || 0;
    const csvTotal = csvData?.total || 0;
    const csvShouldBeAdded = csvData?.shouldBeAdded ?? false;

    // Get approved hour requests
    const { data: requests, error: requestsError } = await supabase
      .from('hour_requests')
      .select('hours_requested, type')
      .eq('student_s_number', student.s_number)
      .eq('status', 'approved');

    if (requestsError) {
      console.log(`   ⚠️  Error for ${student.name}: ${requestsError.message}`);
      continue;
    }

    // Calculate hours from requests
    let requestsVolunteering = 0;
    let requestsSocial = 0;

    (requests || []).forEach((req: HourRequest) => {
      const hours = parseFloat(req.hours_requested || 0) || 0;
      const type = (req.type || 'volunteering').toLowerCase();
      
      if (type === 'volunteering') {
        requestsVolunteering += hours;
      } else if (type === 'social') {
        requestsSocial += hours;
      }
    });

    const requestsTotal = requestsVolunteering + requestsSocial;

    // Calculate expected hours: requests + CSV (if CSV should be added)
    let expectedVolunteering = requestsVolunteering;
    let expectedSocial = requestsSocial;

    if (csvShouldBeAdded) {
      expectedVolunteering += csvVolunteering;
      expectedSocial += csvSocial;
    }

    const expectedTotal = expectedVolunteering + expectedSocial;

    // Check for discrepancies (allow small rounding differences of 0.1)
    const volunteeringDiff = Math.abs(dbVolunteering - expectedVolunteering);
    const socialDiff = Math.abs(dbSocial - expectedSocial);
    const totalDiff = Math.abs(dbTotal - expectedTotal);

    // Flag if there's a meaningful discrepancy (more than 0.1 hours)
    if (volunteeringDiff > 0.1 || socialDiff > 0.1 || totalDiff > 0.1) {
      const extraVolunteering = dbVolunteering - expectedVolunteering;
      const extraSocial = dbSocial - expectedSocial;
      const extraTotal = dbTotal - expectedTotal;

      let issue = '';
      if (extraTotal > 0.1) {
        issue = `Database has ${extraTotal.toFixed(1)} MORE hours than expected`;
      } else if (extraTotal < -0.1) {
        issue = `Database has ${Math.abs(extraTotal).toFixed(1)} FEWER hours than expected`;
      }

      discrepancies.push({
        studentSNumber: student.s_number,
        studentName: student.name || 'Unknown',
        dbVolunteering,
        dbSocial,
        dbTotal,
        hoursFromRequests: { volunteering: requestsVolunteering, social: requestsSocial, total: requestsTotal },
        hoursFromCSV: { volunteering: csvVolunteering, social: csvSocial, total: csvTotal },
        csvShouldBeAdded,
        expectedVolunteering,
        expectedSocial,
        expectedTotal,
        extraVolunteering,
        extraSocial,
        extraTotal,
        issue
      });

      if (Math.abs(extraTotal) > 0.5) { // Only log significant discrepancies
        console.log(`\n[${discrepancies.length}] ${student.name} (${student.s_number})`);
        console.log(`   ⚠️  ${issue}`);
        console.log(`   DB: ${dbVolunteering}V / ${dbSocial}S / ${dbTotal}T`);
        console.log(`   From requests: ${requestsVolunteering}V / ${requestsSocial}S / ${requestsTotal}T`);
        console.log(`   From CSV: ${csvVolunteering}V / ${csvSocial}S / ${csvTotal}T ${csvShouldBeAdded ? '(should be added)' : '(marked X, should NOT be added)'}`);
        console.log(`   Expected: ${expectedVolunteering}V / ${expectedSocial}S / ${expectedTotal}T`);
        console.log(`   Difference: ${extraVolunteering > 0 ? '+' : ''}${extraVolunteering.toFixed(1)}V / ${extraSocial > 0 ? '+' : ''}${extraSocial.toFixed(1)}S / ${extraTotal > 0 ? '+' : ''}${extraTotal.toFixed(1)}T`);
      }
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 DISCREPANCY REPORT');
  console.log('Expected = Approved Hour Requests + CSV Hours (if not marked X)');
  console.log('='.repeat(80));

  const totalDiscrepancies = discrepancies.length;
  const withExtraHours = discrepancies.filter(d => d.extraTotal > 0.1).length;
  const withMissingHours = discrepancies.filter(d => d.extraTotal < -0.1).length;
  const totalExtraHours = discrepancies.reduce((sum, d) => sum + Math.max(0, d.extraTotal), 0);
  const totalMissingHours = discrepancies.reduce((sum, d) => sum + Math.max(0, -d.extraTotal), 0);

  console.log(`\nTotal students with discrepancies: ${totalDiscrepancies}`);
  console.log(`⚠️  Students with EXTRA hours (DB > expected): ${withExtraHours}`);
  console.log(`⚠️  Students with MISSING hours (DB < expected): ${withMissingHours}`);
  console.log(`📊 Total extra hours: ${totalExtraHours.toFixed(1)}`);
  console.log(`📊 Total missing hours: ${totalMissingHours.toFixed(1)}`);

  if (withExtraHours > 0) {
    console.log('\n\n' + '⚠️ '.repeat(40));
    console.log('STUDENTS WITH EXTRA HOURS (Database has MORE than expected):');
    console.log('⚠️ '.repeat(40) + '\n');

    discrepancies
      .filter(d => d.extraTotal > 0.1)
      .sort((a, b) => b.extraTotal - a.extraTotal) // Sort by largest discrepancy first
      .slice(0, 50) // Show top 50
      .forEach((disc, index) => {
        console.log(`\n${index + 1}. ${disc.studentName} (${disc.studentSNumber})`);
        console.log(`   ${disc.issue}`);
        console.log(`   Database: ${disc.dbVolunteering}V / ${disc.dbSocial}S / ${disc.dbTotal}T`);
        console.log(`   From requests: ${disc.hoursFromRequests.volunteering}V / ${disc.hoursFromRequests.social}S / ${disc.hoursFromRequests.total}T`);
        console.log(`   From CSV: ${disc.hoursFromCSV.volunteering}V / ${disc.hoursFromCSV.social}S / ${disc.hoursFromCSV.total}T ${disc.csvShouldBeAdded ? '(included)' : '(excluded - marked X)'}`);
        console.log(`   Expected: ${disc.expectedVolunteering}V / ${disc.expectedSocial}S / ${disc.expectedTotal}T`);
        console.log(`   Extra: +${disc.extraVolunteering.toFixed(1)}V / +${disc.extraSocial.toFixed(1)}S / +${disc.extraTotal.toFixed(1)}T`);
      });

    if (withExtraHours > 50) {
      console.log(`\n   ... and ${withExtraHours - 50} more students with extra hours`);
    }
  }

  if (withMissingHours > 0) {
    console.log('\n\n' + '⚠️ '.repeat(40));
    console.log('STUDENTS WITH MISSING HOURS (Database has FEWER than expected):');
    console.log('⚠️ '.repeat(40) + '\n');

    discrepancies
      .filter(d => d.extraTotal < -0.1)
      .sort((a, b) => a.extraTotal - b.extraTotal)
      .slice(0, 20)
      .forEach((disc, index) => {
        console.log(`\n${index + 1}. ${disc.studentName} (${disc.studentSNumber})`);
        console.log(`   ${disc.issue}`);
        console.log(`   Database: ${disc.dbVolunteering}V / ${disc.dbSocial}S / ${disc.dbTotal}T`);
        console.log(`   Expected: ${disc.expectedVolunteering}V / ${disc.expectedSocial}S / ${disc.expectedTotal}T`);
        console.log(`   Missing: ${disc.extraVolunteering.toFixed(1)}V / ${disc.extraSocial.toFixed(1)}S / ${disc.extraTotal.toFixed(1)}T`);
      });
  }

  if (totalDiscrepancies === 0) {
    console.log('\n✅ No discrepancies found! All students\' hours match expected values.');
  }

  // Check Alice Sosa specifically
  console.log('\n\n' + '='.repeat(80));
  console.log('🔍 ALICE SOSA CHECK');
  console.log('='.repeat(80));
  const alice = discrepancies.find(d => 
    d.studentSNumber.toLowerCase() === 's127820' || 
    d.studentSNumber.toLowerCase() === '127820' ||
    d.studentName.toLowerCase().includes('alice') && d.studentName.toLowerCase().includes('sosa')
  );
  
  if (alice) {
    console.log(`\n📋 Alice Sosa Details:`);
    console.log(`   Database: ${alice.dbVolunteering}V / ${alice.dbSocial}S / ${alice.dbTotal}T`);
    console.log(`   From hour requests: ${alice.hoursFromRequests.volunteering}V / ${alice.hoursFromRequests.social}S / ${alice.hoursFromRequests.total}T`);
    console.log(`   From CSV: ${alice.hoursFromCSV.volunteering}V / ${alice.hoursFromCSV.social}S / ${alice.hoursFromCSV.total}T`);
    console.log(`   CSV marked with X: ${!alice.csvShouldBeAdded ? 'YES (should NOT be added)' : 'NO (should be added)'}`);
    console.log(`   Expected: ${alice.expectedVolunteering}V / ${alice.expectedSocial}S / ${alice.expectedTotal}T`);
    console.log(`   ${alice.issue}`);
    console.log(`   Extra/Missing: ${alice.extraVolunteering > 0 ? '+' : ''}${alice.extraVolunteering.toFixed(1)}V / ${alice.extraSocial > 0 ? '+' : ''}${alice.extraSocial.toFixed(1)}S / ${alice.extraTotal > 0 ? '+' : ''}${alice.extraTotal.toFixed(1)}T`);
  } else {
    // Try to find Alice in all students
    const aliceStudent = allStudents.find(s => 
      (s.s_number.toLowerCase() === 's127820' || s.s_number.toLowerCase() === '127820') &&
      s.name.toLowerCase().includes('alice') && s.name.toLowerCase().includes('sosa')
    );
    
    if (aliceStudent) {
      const aliceId = aliceStudent.s_number.toLowerCase().replace(/^s/, '');
      const aliceCSV = csvDataMap.get(aliceId);
      const { data: aliceRequests } = await supabase
        .from('hour_requests')
        .select('hours_requested, type')
        .eq('student_s_number', aliceStudent.s_number)
        .eq('status', 'approved');
      
      let reqV = 0, reqS = 0;
      (aliceRequests || []).forEach((req: HourRequest) => {
        const hours = parseFloat(req.hours_requested || 0) || 0;
        if ((req.type || 'volunteering').toLowerCase() === 'volunteering') {
          reqV += hours;
        } else {
          reqS += hours;
        }
      });
      
      const csvV = aliceCSV?.volunteering || 0;
      const csvS = aliceCSV?.social || 0;
      const csvShouldAdd = aliceCSV?.shouldBeAdded ?? false;
      const expectedV = reqV + (csvShouldAdd ? csvV : 0);
      const expectedS = reqS + (csvShouldAdd ? csvS : 0);
      
      console.log(`\n📋 Alice Sosa Details:`);
      console.log(`   Database: ${aliceStudent.volunteering_hours}V / ${aliceStudent.social_hours}S / ${aliceStudent.total_hours}T`);
      console.log(`   From hour requests: ${reqV}V / ${reqS}S / ${reqV + reqS}T`);
      console.log(`   From CSV: ${csvV}V / ${csvS}S / ${csvV + csvS}T ${csvShouldAdd ? '(included)' : '(excluded - marked X)'}`);
      console.log(`   Expected: ${expectedV}V / ${expectedS}S / ${expectedV + expectedS}T`);
      console.log(`   ✅ Hours match expected values`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// Run
verifyHoursWithCSV()
  .then(() => {
    console.log('✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });




