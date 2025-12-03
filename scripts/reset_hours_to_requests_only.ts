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
  hours_requested: number;
  type: 'volunteering' | 'social';
  event_name: string;
}

interface Result {
  studentSNumber: string;
  studentName: string;
  hoursBefore: { volunteering: number; social: number; total: number };
  hoursAfter: { volunteering: number; social: number; total: number };
  realRequestsVolunteering: number;
  realRequestsSocial: number;
  csvRecordsDeleted: number;
  success: boolean;
  error?: string;
}

async function resetHoursToRequestsOnly() {
  console.log('🔍 Resetting all student hours to match approved hour requests only...\n');
  console.log('Removing all CSV hours and recalculating based on real requests\n');
  console.log('Note: Social credits will count toward total hours\n');

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

    if (error) throw error;

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

  const results: Result[] = [];
  let processed = 0;

  for (const student of allStudents) {
    processed++;
    const currentVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
    const currentSocial = parseFloat(student.social_hours || 0) || 0;
    const currentTotal = parseFloat(student.total_hours || 0) || 0;

    // Get all approved hour requests
    const { data: requests, error: requestsError } = await supabase
      .from('hour_requests')
      .select('id, hours_requested, type, event_name')
      .eq('student_s_number', student.s_number)
      .eq('status', 'approved');

    if (requestsError) {
      console.log(`   ⚠️  Error for ${student.name}: ${requestsError.message}`);
      continue;
    }

    // Separate real requests from CSV records
    let realRequestsVolunteering = 0;
    let realRequestsSocial = 0;
    const csvRecordIds: string[] = [];

    (requests || []).forEach((req: HourRequest) => {
      const eventName = (req.event_name || '').toLowerCase();
      
      // Identify CSV records
      if (eventName.includes('hours added from csv') || 
          eventName.includes('csv')) {
        csvRecordIds.push(req.id);
        return; // Skip CSV records
      }

      // Count real requests
      const hours = parseFloat(req.hours_requested || 0) || 0;
      const type = (req.type || 'volunteering').toLowerCase();
      
      if (type === 'volunteering') {
        realRequestsVolunteering += hours;
      } else if (type === 'social') {
        realRequestsSocial += hours;
      }
    });

    // Expected hours = real requests only (social credits count toward total)
    const expectedVolunteering = realRequestsVolunteering;
    const expectedSocial = realRequestsSocial;
    const expectedTotal = expectedVolunteering + expectedSocial;

    // Check if update is needed
    const needsUpdate = 
      Math.abs(currentVolunteering - expectedVolunteering) > 0.01 ||
      Math.abs(currentSocial - expectedSocial) > 0.01 ||
      csvRecordIds.length > 0;

    if (!needsUpdate) {
      continue;
    }

    console.log(`\n[${results.length + 1}] ${student.name} (${student.s_number})`);
    console.log(`   Current: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);
    console.log(`   Expected (from real requests): ${expectedVolunteering}V / ${expectedSocial}S / ${expectedTotal}T`);

    try {
      // Delete CSV records
      let deletedCount = 0;
      for (const recordId of csvRecordIds) {
        const { error: deleteError } = await supabase
          .from('hour_requests')
          .delete()
          .eq('id', recordId);

        if (!deleteError) {
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        console.log(`   🗑️  Deleted ${deletedCount} CSV record(s)`);
      }

      // Update student hours to match real requests
      const { error: updateError } = await supabase
        .from('students')
        .update({
          volunteering_hours: expectedVolunteering,
          social_hours: expectedSocial,
          last_hour_update: new Date().toISOString()
        })
        .eq('s_number', student.s_number);

      if (updateError) {
        throw new Error(`Error updating student: ${updateError.message}`);
      }

      // Get updated hours
      const { data: updatedStudent } = await supabase
        .from('students')
        .select('volunteering_hours, social_hours, total_hours')
        .eq('s_number', student.s_number)
        .single();

      const newVolunteering = updatedStudent?.volunteering_hours || expectedVolunteering;
      const newSocial = updatedStudent?.social_hours || expectedSocial;
      const newTotal = updatedStudent?.total_hours || expectedTotal;

      console.log(`   ✅ Updated to: ${newVolunteering}V / ${newSocial}S / ${newTotal}T`);

      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || 'Unknown',
        hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        hoursAfter: { volunteering: newVolunteering, social: newSocial, total: newTotal },
        realRequestsVolunteering,
        realRequestsSocial,
        csvRecordsDeleted: deletedCount,
        success: true
      });

      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || 'Unknown',
        hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        hoursAfter: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        realRequestsVolunteering,
        realRequestsSocial,
        csvRecordsDeleted: 0,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESET SUMMARY');
  console.log('='.repeat(80));

  const totalProcessed = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalCSVRecordsDeleted = results.reduce((sum, r) => sum + r.csvRecordsDeleted, 0);

  console.log(`\nTotal students updated: ${totalProcessed}`);
  console.log(`✅ Successfully updated: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🗑️  Total CSV records deleted: ${totalCSVRecordsDeleted}`);

  if (successful > 0) {
    console.log('\n\n✅ Successfully updated (showing first 30):');
    results
      .filter(r => r.success)
      .slice(0, 30)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
        console.log(`   Before: ${result.hoursBefore.volunteering}V / ${result.hoursBefore.social}S / ${result.hoursBefore.total}T`);
        console.log(`   After:  ${result.hoursAfter.volunteering}V / ${result.hoursAfter.social}S / ${result.hoursAfter.total}T`);
        console.log(`   From requests: ${result.realRequestsVolunteering}V / ${result.realRequestsSocial}S`);
        if (result.csvRecordsDeleted > 0) {
          console.log(`   CSV records deleted: ${result.csvRecordsDeleted}`);
        }
      });
    
    if (successful > 30) {
      console.log(`\n   ... and ${successful - 30} more students`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

resetHoursToRequestsOnly()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });


