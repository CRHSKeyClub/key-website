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
  hours_requested: number;
  type: 'volunteering' | 'social';
}

interface Result {
  studentSNumber: string;
  studentName: string;
  dbVolunteering: number;
  dbSocial: number;
  dbTotal: number;
  requestsVolunteering: number;
  requestsSocial: number;
  requestsTotal: number;
  missingVolunteering: number;
  missingSocial: number;
  recordsCreated: number;
  success: boolean;
  error?: string;
}

async function addMissingHourRequests() {
  console.log('🔍 Finding students with hours not accounted for in hour requests...\n');

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
      console.log(`  Fetched ${allStudents.length} students so far...`);
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allStudents.length} students\n`);
  console.log('🔎 Analyzing hour requests for each student...\n');

  const results: Result[] = [];
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
      .select('hours_requested, type')
      .eq('student_s_number', student.s_number)
      .eq('status', 'approved');

    if (requestsError) {
      console.log(`   ❌ Error for ${student.name}: ${requestsError.message}`);
      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || 'Unknown',
        dbVolunteering,
        dbSocial,
        dbTotal,
        requestsVolunteering: 0,
        requestsSocial: 0,
        requestsTotal: 0,
        missingVolunteering: 0,
        missingSocial: 0,
        recordsCreated: 0,
        success: false,
        error: requestsError.message
      });
      continue;
    }

    // Calculate total hours from requests
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

    // Calculate missing hours
    const missingVolunteering = Math.max(0, dbVolunteering - requestsVolunteering);
    const missingSocial = Math.max(0, dbSocial - requestsSocial);

    // Only process if there are missing hours
    if (missingVolunteering === 0 && missingSocial === 0) {
      continue;
    }

    console.log(`[${processed}/${allStudents.length}] ${student.name} (${student.s_number})`);
    console.log(`   DB: ${dbVolunteering}V / ${dbSocial}S / ${dbTotal}T`);
    console.log(`   Requests: ${requestsVolunteering}V / ${requestsSocial}S / ${requestsTotal}T`);
    console.log(`   Missing: ${missingVolunteering}V / ${missingSocial}S`);

    let recordsCreated = 0;

    try {
      // Create record for missing volunteering hours
      if (missingVolunteering > 0) {
        const { error: volError } = await supabase
          .from('hour_requests')
          .insert([{
            student_s_number: student.s_number.toLowerCase(),
            student_name: student.name || 'Unknown',
            event_name: 'Hours Added from Other Events',
            event_date: new Date().toISOString().split('T')[0],
            hours_requested: missingVolunteering,
            description: `These ${missingVolunteering} volunteering hour${missingVolunteering === 1 ? '' : 's'} ${missingVolunteering === 1 ? 'was' : 'were'} added from other events or sources that were not tracked through the hour request system. This record was automatically created to maintain an accurate audit trail.`,
            type: 'volunteering',
            status: 'approved',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'System',
            admin_notes: 'Automatically created audit record for hours from other events'
          }]);

        if (volError) {
          console.log(`      ❌ Error creating volunteering record: ${volError.message}`);
        } else {
          console.log(`      ✅ Created record for ${missingVolunteering} volunteering hours`);
          recordsCreated++;
        }
      }

      // Create record for missing social hours
      if (missingSocial > 0) {
        const { error: socialError } = await supabase
          .from('hour_requests')
          .insert([{
            student_s_number: student.s_number.toLowerCase(),
            student_name: student.name || 'Unknown',
            event_name: 'Hours Added from Other Events',
            event_date: new Date().toISOString().split('T')[0],
            hours_requested: missingSocial,
            description: `These ${missingSocial} social hour${missingSocial === 1 ? '' : 's'} ${missingSocial === 1 ? 'was' : 'were'} added from other events or sources that were not tracked through the hour request system. This record was automatically created to maintain an accurate audit trail.`,
            type: 'social',
            status: 'approved',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'System',
            admin_notes: 'Automatically created audit record for hours from other events'
          }]);

        if (socialError) {
          console.log(`      ❌ Error creating social record: ${socialError.message}`);
        } else {
          console.log(`      ✅ Created record for ${missingSocial} social hours`);
          recordsCreated++;
        }
      }

      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || 'Unknown',
        dbVolunteering,
        dbSocial,
        dbTotal,
        requestsVolunteering,
        requestsSocial,
        requestsTotal,
        missingVolunteering,
        missingSocial,
        recordsCreated,
        success: true
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`      ❌ Exception: ${error.message}`);
      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || 'Unknown',
        dbVolunteering,
        dbSocial,
        dbTotal,
        requestsVolunteering,
        requestsSocial,
        requestsTotal,
        missingVolunteering,
        missingSocial,
        recordsCreated: 0,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  const totalWithMissingHours = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalRecordsCreated = results.reduce((sum, r) => sum + r.recordsCreated, 0);
  const totalMissingVolunteering = results.reduce((sum, r) => sum + r.missingVolunteering, 0);
  const totalMissingSocial = results.reduce((sum, r) => sum + r.missingSocial, 0);

  console.log(`\nTotal students with missing hours: ${totalWithMissingHours}`);
  console.log(`✅ Successfully processed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Total records created: ${totalRecordsCreated}`);
  console.log(`📊 Total missing hours:`);
  console.log(`   Volunteering: ${totalMissingVolunteering}`);
  console.log(`   Social: ${totalMissingSocial}`);
  console.log(`   Total: ${totalMissingVolunteering + totalMissingSocial}`);

  if (successful > 0) {
    console.log('\n\n✅ Successfully created records:');
    results
      .filter(r => r.success && r.recordsCreated > 0)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
        console.log(`   Missing: ${result.missingVolunteering}V / ${result.missingSocial}S`);
        console.log(`   Records created: ${result.recordsCreated}`);
      });
  }

  if (failed > 0) {
    console.log('\n\n❌ Failed:');
    results
      .filter(r => !r.success)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
        console.log(`   Error: ${result.error}`);
      });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

// Run
addMissingHourRequests()
  .then(() => {
    console.log('✅ Process complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Process failed:', error);
    process.exit(1);
  });




