import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Student {
  id: string;
  s_number: string;
  name: string;
  volunteering_hours: number;
  social_hours: number;
  total_hours: number;
}

interface HourRequest {
  id: string;
  event_name: string;
  hours_requested: number;
  type: 'volunteering' | 'social';
  reviewed_at?: string;
  description: string;
  admin_notes?: string;
}

interface Discrepancy {
  studentSNumber: string;
  studentName: string;
  dbVolunteering: number;
  dbSocial: number;
  dbTotal: number;
  expectedVolunteering: number;
  expectedSocial: number;
  expectedTotal: number;
  extraVolunteering: number;
  extraSocial: number;
  extraTotal: number;
  allRequests: HourRequest[];
  issue: string;
}

async function verifyHourDiscrepancies() {
  console.log('🔍 Verifying hour discrepancies across all students...\n');

  // Get all students
  let allStudents: Student[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  console.log('📋 Fetching all students...');
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

  console.log(`✅ Found ${allStudents.length} students\n`);
  console.log('🔎 Analyzing hour requests vs database hours...\n');

  const discrepancies: Discrepancy[] = [];
  let processed = 0;

  for (const student of allStudents) {
    processed++;
    const dbVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
    const dbSocial = parseFloat(student.social_hours || 0) || 0;
    const dbTotal = parseFloat(student.total_hours || 0) || 0;

    // Skip students with no hours
    if (dbTotal === 0) {
      continue;
    }

    // Get all approved hour requests for this student
    const { data: requests, error: requestsError } = await supabase
      .from('hour_requests')
      .select('id, event_name, hours_requested, type, reviewed_at, description, admin_notes')
      .eq('student_s_number', student.s_number)
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false });

    if (requestsError) {
      console.log(`   ⚠️  Error for ${student.name}: ${requestsError.message}`);
      continue;
    }

    // Calculate expected hours from requests
    let expectedVolunteering = 0;
    let expectedSocial = 0;

    (requests || []).forEach((req: HourRequest) => {
      const hours = parseFloat(req.hours_requested || 0) || 0;
      const type = (req.type || 'volunteering').toLowerCase();
      
      if (type === 'volunteering') {
        expectedVolunteering += hours;
      } else if (type === 'social') {
        expectedSocial += hours;
      }
    });

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
        issue = `Database has ${extraTotal.toFixed(1)} MORE hours than hour requests account for`;
      } else if (extraTotal < -0.1) {
        issue = `Database has ${Math.abs(extraTotal).toFixed(1)} FEWER hours than hour requests account for`;
      }

      discrepancies.push({
        studentSNumber: student.s_number,
        studentName: student.name || 'Unknown',
        dbVolunteering,
        dbSocial,
        dbTotal,
        expectedVolunteering,
        expectedSocial,
        expectedTotal,
        extraVolunteering,
        extraSocial,
        extraTotal,
        allRequests: requests || [],
        issue
      });

      if (Math.abs(extraTotal) > 0.5) { // Only log significant discrepancies
        console.log(`\n[${discrepancies.length}] ${student.name} (${student.s_number})`);
        console.log(`   ⚠️  ${issue}`);
        console.log(`   DB: ${dbVolunteering}V / ${dbSocial}S / ${dbTotal}T`);
        console.log(`   Expected from requests: ${expectedVolunteering}V / ${expectedSocial}S / ${expectedTotal}T`);
        console.log(`   Difference: ${extraVolunteering > 0 ? '+' : ''}${extraVolunteering.toFixed(1)}V / ${extraSocial > 0 ? '+' : ''}${extraSocial.toFixed(1)}S / ${extraTotal > 0 ? '+' : ''}${extraTotal.toFixed(1)}T`);
        console.log(`   Hour requests: ${(requests || []).length} approved`);
      }
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 DISCREPANCY REPORT');
  console.log('='.repeat(80));

  const totalDiscrepancies = discrepancies.length;
  const withExtraHours = discrepancies.filter(d => d.extraTotal > 0.1).length;
  const withMissingHours = discrepancies.filter(d => d.extraTotal < -0.1).length;
  const totalExtraHours = discrepancies.reduce((sum, d) => sum + Math.max(0, d.extraTotal), 0);
  const totalMissingHours = discrepancies.reduce((sum, d) => sum + Math.max(0, -d.extraTotal), 0);

  console.log(`\nTotal students with discrepancies: ${totalDiscrepancies}`);
  console.log(`⚠️  Students with EXTRA hours (DB > requests): ${withExtraHours}`);
  console.log(`⚠️  Students with MISSING hours (DB < requests): ${withMissingHours}`);
  console.log(`📊 Total extra hours in database: ${totalExtraHours.toFixed(1)}`);
  console.log(`📊 Total missing hours in database: ${totalMissingHours.toFixed(1)}`);

  if (withExtraHours > 0) {
    console.log('\n\n' + '⚠️ '.repeat(40));
    console.log('STUDENTS WITH EXTRA HOURS (Database has MORE than hour requests):');
    console.log('⚠️ '.repeat(40) + '\n');

    discrepancies
      .filter(d => d.extraTotal > 0.1)
      .sort((a, b) => b.extraTotal - a.extraTotal) // Sort by largest discrepancy first
      .forEach((disc, index) => {
        console.log(`\n${index + 1}. ${disc.studentName} (${disc.studentSNumber})`);
        console.log(`   ${disc.issue}`);
        console.log(`   Database Hours: ${disc.dbVolunteering}V / ${disc.dbSocial}S / ${disc.dbTotal}T`);
        console.log(`   Expected (from requests): ${disc.expectedVolunteering}V / ${disc.expectedSocial}S / ${disc.expectedTotal}T`);
        console.log(`   Extra: +${disc.extraVolunteering.toFixed(1)}V / +${disc.extraSocial.toFixed(1)}S / +${disc.extraTotal.toFixed(1)}T`);
        console.log(`   Hour Requests (${disc.allRequests.length}):`);
        disc.allRequests.slice(0, 5).forEach((req, i) => {
          const date = req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'Unknown';
          console.log(`     ${i + 1}. ${req.event_name} - ${req.hours_requested} ${req.type} (${date})`);
          if (req.admin_notes) {
            console.log(`        Notes: ${req.admin_notes.substring(0, 60)}${req.admin_notes.length > 60 ? '...' : ''}`);
          }
        });
        if (disc.allRequests.length > 5) {
          console.log(`     ... and ${disc.allRequests.length - 5} more`);
        }
      });
  }

  if (withMissingHours > 0) {
    console.log('\n\n' + '⚠️ '.repeat(40));
    console.log('STUDENTS WITH MISSING HOURS (Database has FEWER than hour requests):');
    console.log('⚠️ '.repeat(40) + '\n');

    discrepancies
      .filter(d => d.extraTotal < -0.1)
      .sort((a, b) => a.extraTotal - b.extraTotal) // Sort by largest missing first
      .forEach((disc, index) => {
        console.log(`\n${index + 1}. ${disc.studentName} (${disc.studentSNumber})`);
        console.log(`   ${disc.issue}`);
        console.log(`   Database Hours: ${disc.dbVolunteering}V / ${disc.dbSocial}S / ${disc.dbTotal}T`);
        console.log(`   Expected (from requests): ${disc.expectedVolunteering}V / ${disc.expectedSocial}S / ${disc.expectedTotal}T`);
        console.log(`   Missing: ${disc.extraVolunteering.toFixed(1)}V / ${disc.extraSocial.toFixed(1)}S / ${disc.extraTotal.toFixed(1)}T`);
      });
  }

  if (totalDiscrepancies === 0) {
    console.log('\n✅ No discrepancies found! All students\' hours match their hour requests.');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Check Alice Sosa specifically
  console.log('\n🔍 Checking Alice Sosa specifically...');
  const alice = discrepancies.find(d => d.studentSNumber.toLowerCase() === 's127820' || d.studentSNumber === '127820');
  if (alice) {
    console.log(`\n📋 Alice Sosa Details:`);
    console.log(`   Database: ${alice.dbVolunteering}V / ${alice.dbSocial}S / ${alice.dbTotal}T`);
    console.log(`   From hour requests: ${alice.expectedVolunteering}V / ${alice.expectedSocial}S / ${alice.expectedTotal}T`);
    console.log(`   Extra: +${alice.extraTotal.toFixed(1)} hours`);
    console.log(`\n   All hour requests:`);
    alice.allRequests.forEach((req, i) => {
      const date = req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : 'Unknown';
      console.log(`     ${i + 1}. ${req.event_name} - ${req.hours_requested} ${req.type} (${date})`);
      if (req.description) {
        console.log(`        ${req.description.substring(0, 80)}${req.description.length > 80 ? '...' : ''}`);
      }
    });
  } else {
    console.log(`   ✅ Alice Sosa's hours match her hour requests`);
  }
}

// Run
verifyHourDiscrepancies()
  .then(() => {
    console.log('\n✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });




