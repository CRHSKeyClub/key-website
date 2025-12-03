import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CSVSocialRecord {
  id: string;
  student_s_number: string;
  student_name: string;
  hours_requested: number;
  type: string;
}

interface RemovalResult {
  studentSNumber: string;
  studentName: string;
  socialHoursRemoved: number;
  hoursBefore: { volunteering: number; social: number; total: number };
  hoursAfter: { volunteering: number; social: number; total: number };
  recordDeleted: boolean;
  success: boolean;
  error?: string;
}

async function removeCSVSocialHours() {
  console.log('🔍 Finding "Hours Added from CSV" records with social hours...\n');

  // Get all "Hours Added from CSV" records that are social hours
  const { data: csvSocialRecords, error: fetchError } = await supabase
    .from('hour_requests')
    .select('*')
    .ilike('event_name', '%Hours Added from CSV%')
    .eq('type', 'social')
    .eq('status', 'approved');

  if (fetchError) {
    console.error('❌ Error fetching records:', fetchError);
    throw fetchError;
  }

  if (!csvSocialRecords || csvSocialRecords.length === 0) {
    console.log('✅ No CSV social hour records found.');
    return;
  }

  console.log(`📊 Found ${csvSocialRecords.length} "Hours Added from CSV" social hour record(s)\n`);
  console.log('Removing these hours from students and deleting records...\n');

  const results: RemovalResult[] = [];

  for (const record of csvSocialRecords) {
    const studentSNumber = record.student_s_number;
    const socialHoursToRemove = parseFloat(record.hours_requested || 0) || 0;

    console.log(`Processing: ${record.student_name} (${studentSNumber})`);
    console.log(`   Social hours to remove: ${socialHoursToRemove}`);

    try {
      // Get current student hours
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('s_number, name, volunteering_hours, social_hours, total_hours')
        .eq('s_number', studentSNumber)
        .maybeSingle();

      if (studentError) {
        throw new Error(`Error fetching student: ${studentError.message}`);
      }

      if (!student) {
        console.log(`   ⚠️  Student not found in database`);
        results.push({
          studentSNumber,
          studentName: record.student_name || 'Unknown',
          socialHoursRemoved: socialHoursToRemove,
          hoursBefore: { volunteering: 0, social: 0, total: 0 },
          hoursAfter: { volunteering: 0, social: 0, total: 0 },
          recordDeleted: false,
          success: false,
          error: 'Student not found'
        });
        continue;
      }

      const currentVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
      const currentSocial = parseFloat(student.social_hours || 0) || 0;
      const currentTotal = parseFloat(student.total_hours || 0) || 0;

      console.log(`   Current hours: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);

      // Calculate new social hours (don't go below 0)
      const newSocial = Math.max(0, currentSocial - socialHoursToRemove);

      // Update student hours
      const { error: updateError } = await supabase
        .from('students')
        .update({
          social_hours: newSocial,
          last_hour_update: new Date().toISOString()
        })
        .eq('s_number', studentSNumber);

      if (updateError) {
        throw new Error(`Error updating student: ${updateError.message}`);
      }

      // Get updated hours (total_hours is auto-calculated by trigger)
      const { data: updatedStudent } = await supabase
        .from('students')
        .select('volunteering_hours, social_hours, total_hours')
        .eq('s_number', studentSNumber)
        .single();

      const newVolunteering = updatedStudent?.volunteering_hours || currentVolunteering;
      const newSocialFinal = updatedStudent?.social_hours || newSocial;
      const newTotal = updatedStudent?.total_hours || (newVolunteering + newSocialFinal);

      console.log(`   New hours: ${newVolunteering}V / ${newSocialFinal}S / ${newTotal}T`);

      // Delete the CSV social hour record
      const { error: deleteError } = await supabase
        .from('hour_requests')
        .delete()
        .eq('id', record.id);

      if (deleteError) {
        console.log(`   ⚠️  Failed to delete record: ${deleteError.message}`);
      } else {
        console.log(`   ✅ Deleted CSV social hour record`);
      }

      results.push({
        studentSNumber,
        studentName: record.student_name || 'Unknown',
        socialHoursRemoved: socialHoursToRemove,
        hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        hoursAfter: { volunteering: newVolunteering, social: newSocialFinal, total: newTotal },
        recordDeleted: !deleteError,
        success: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({
        studentSNumber,
        studentName: record.student_name || 'Unknown',
        socialHoursRemoved: socialHoursToRemove,
        hoursBefore: { volunteering: 0, social: 0, total: 0 },
        hoursAfter: { volunteering: 0, social: 0, total: 0 },
        recordDeleted: false,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 REMOVAL SUMMARY');
  console.log('='.repeat(80));

  const totalProcessed = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalSocialHoursRemoved = results.reduce((sum, r) => sum + (r.success ? r.socialHoursRemoved : 0), 0);
  const recordsDeleted = results.filter(r => r.recordDeleted).length;

  console.log(`\nTotal students processed: ${totalProcessed}`);
  console.log(`✅ Successfully processed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total social hours removed: ${totalSocialHoursRemoved}`);
  console.log(`🗑️  Records deleted: ${recordsDeleted}`);

  if (successful > 0) {
    console.log('\n\n✅ Successfully processed:');
    results
      .filter(r => r.success)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
        console.log(`   Social hours removed: ${result.socialHoursRemoved}`);
        console.log(`   Before: ${result.hoursBefore.volunteering}V / ${result.hoursBefore.social}S / ${result.hoursBefore.total}T`);
        console.log(`   After:  ${result.hoursAfter.volunteering}V / ${result.hoursAfter.social}S / ${result.hoursAfter.total}T`);
        console.log(`   Record deleted: ${result.recordDeleted ? 'Yes' : 'No'}`);
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

removeCSVSocialHours()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });


