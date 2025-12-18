import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixDecember8Attendance() {
  console.log('🔧 Fixing December 8th attendance...\n');

  // Get the December 8th meeting
  const { data: dec8Meeting } = await supabase
    .from('meetings')
    .select('id, meeting_date')
    .eq('meeting_date', '2025-12-08')
    .single();

  if (!dec8Meeting) {
    console.log('❌ No meeting found for 2025-12-08');
    return;
  }

  // Get the December 9th meeting
  const { data: dec9Meeting } = await supabase
    .from('meetings')
    .select('id, meeting_date')
    .eq('meeting_date', '2025-12-09')
    .single();

  if (!dec9Meeting) {
    console.log('❌ No meeting found for 2025-12-09');
    return;
  }

  console.log(`✅ Found December 8th meeting (ID: ${dec8Meeting.id})`);
  console.log(`✅ Found December 9th meeting (ID: ${dec9Meeting.id})\n`);

  // Get attendance records for December 8th
  const { data: dec8Attendance, error: fetchError } = await supabase
    .from('meeting_attendance')
    .select('*')
    .eq('meeting_id', dec8Meeting.id);

  if (fetchError) {
    console.error('❌ Error fetching attendance:', fetchError);
    return;
  }

  if (!dec8Attendance || dec8Attendance.length === 0) {
    console.log('ℹ️  No attendance records found for December 8th');
    return;
  }

  console.log(`📋 Found ${dec8Attendance.length} attendance record(s) for December 8th:\n`);

  for (const record of dec8Attendance) {
    console.log(`   Moving ${record.student_s_number} from 12/8 to 12/9...`);

    // Check if this student already has attendance on 12/9
    const { data: existing } = await supabase
      .from('meeting_attendance')
      .select('id')
      .eq('meeting_id', dec9Meeting.id)
      .eq('student_s_number', record.student_s_number)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`   ⚠️  Student ${record.student_s_number} already has attendance on 12/9, skipping...`);
      // Delete the 12/8 record since they already have 12/9
      const { error: deleteError } = await supabase
        .from('meeting_attendance')
        .delete()
        .eq('id', record.id);
      
      if (deleteError) {
        console.error(`   ❌ Error deleting duplicate:`, deleteError);
      } else {
        console.log(`   ✅ Deleted duplicate 12/8 record`);
      }
    } else {
      // Update the attendance record to point to December 9th meeting
      const { error: updateError } = await supabase
        .from('meeting_attendance')
        .update({
          meeting_id: dec9Meeting.id
        })
        .eq('id', record.id);

      if (updateError) {
        console.error(`   ❌ Error updating attendance:`, updateError);
      } else {
        console.log(`   ✅ Moved attendance to December 9th`);
      }
    }
  }

  // Check if December 8th meeting now has no attendance
  const { data: remainingAttendance } = await supabase
    .from('meeting_attendance')
    .select('id')
    .eq('meeting_id', dec8Meeting.id)
    .limit(1);

  if (!remainingAttendance || remainingAttendance.length === 0) {
    console.log(`\n🗑️  December 8th meeting has no attendance, deleting meeting...`);
    const { error: deleteError } = await supabase
      .from('meetings')
      .delete()
      .eq('id', dec8Meeting.id);

    if (deleteError) {
      console.error(`❌ Error deleting meeting:`, deleteError);
    } else {
      console.log(`✅ Deleted December 8th meeting`);
    }
  }

  console.log('\n✅ Fix complete!');
}

fixDecember8Attendance()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });

