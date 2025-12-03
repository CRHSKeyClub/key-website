import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeDuplicatePreviouslyRecorded() {
  console.log('🔍 Finding duplicate "Previously Recorded Hours" records...\n');

  // Get all students
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('s_number, name');

  if (studentsError) {
    console.error('❌ Error fetching students:', studentsError);
    throw studentsError;
  }

  console.log(`✅ Found ${students?.length || 0} students\n`);

  let totalDuplicatesRemoved = 0;

  for (const student of students || []) {
    // Get all "Previously Recorded Hours" records for this student
    const { data: records, error: recordsError } = await supabase
      .from('hour_requests')
      .select('id, hours_requested, type, reviewed_at')
      .eq('student_s_number', student.s_number)
      .ilike('event_name', '%Previously Recorded Hours%')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: true });

    if (recordsError || !records || records.length === 0) {
      continue;
    }

    // Group by type
    const volunteeringRecords = records.filter(r => r.type === 'volunteering');
    const socialRecords = records.filter(r => r.type === 'social');

    let duplicatesForStudent = 0;

    // Keep only the most recent of each type, delete the rest
    if (volunteeringRecords.length > 1) {
      const toDelete = volunteeringRecords.slice(0, -1); // All but the last one
      for (const record of toDelete) {
        const { error: deleteError } = await supabase
          .from('hour_requests')
          .delete()
          .eq('id', record.id);

        if (!deleteError) {
          duplicatesForStudent++;
          totalDuplicatesRemoved++;
        }
      }
    }

    if (socialRecords.length > 1) {
      const toDelete = socialRecords.slice(0, -1); // All but the last one
      for (const record of toDelete) {
        const { error: deleteError } = await supabase
          .from('hour_requests')
          .delete()
          .eq('id', record.id);

        if (!deleteError) {
          duplicatesForStudent++;
          totalDuplicatesRemoved++;
        }
      }
    }

    if (duplicatesForStudent > 0) {
      console.log(`✓ ${student.name} (${student.s_number}): Removed ${duplicatesForStudent} duplicate(s)`);
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal duplicate records removed: ${totalDuplicatesRemoved}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

removeDuplicatePreviouslyRecorded()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });


