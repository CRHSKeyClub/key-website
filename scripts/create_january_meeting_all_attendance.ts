import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createJanuaryMeetingAndMarkAllAttendance() {
  console.log('📅 Creating January Meeting and Marking All Members as Attended...\n');

  // Set the January meeting date (adjust as needed - format: YYYY-MM-DD)
  // Change this to your actual January meeting date
  const meetingDate = '2025-01-15'; // Example: January 15, 2025
  const meetingType = 'General Meeting'; // or 'both', 'morning', 'afternoon'
  const sessionType = 'both'; // 'both', 'morning', or 'afternoon'

  console.log(`📅 Meeting Date: ${meetingDate}`);
  console.log(`📝 Meeting Type: ${meetingType}`);
  console.log(`⏰ Session Type: ${sessionType}\n`);

  // Step 1: Check if meeting already exists
  console.log('🔍 Checking if meeting already exists...');
  const { data: existingMeetings, error: checkError } = await supabase
    .from('meetings')
    .select('id, meeting_date')
    .eq('meeting_date', meetingDate)
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking for existing meeting:', checkError);
    throw checkError;
  }

  let meetingId: string;

  if (existingMeetings && existingMeetings.length > 0) {
    meetingId = existingMeetings[0].id;
    console.log(`✅ Meeting for ${meetingDate} already exists: ${meetingId}`);
    console.log(`⚠️  Will add attendance records to existing meeting\n`);
  } else {
    // Step 2: Create the meeting
    console.log('➕ Creating new meeting...');
    const { data: newMeeting, error: meetingError } = await supabase
      .from('meetings')
      .insert([{
        meeting_date: meetingDate,
        meeting_type: meetingType,
        attendance_code: 'ATTEND',
        is_open: false, // Set to false since we're marking everyone manually
        created_by: 'admin',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (meetingError) {
      console.error('❌ Error creating meeting:', meetingError);
      throw meetingError;
    }

    meetingId = newMeeting.id;
    console.log(`✅ Created meeting: ${meetingId}\n`);
  }

  // Step 3: Get all students
  console.log('👥 Fetching all students...');
  let allStudents: Array<{ s_number: string; name: string }> = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: studentsError } = await supabase
      .from('students')
      .select('s_number, name')
      .range(offset, offset + limit - 1)
      .order('s_number', { ascending: true });

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      throw studentsError;
    }

    if (batch && batch.length > 0) {
      allStudents = allStudents.concat(batch);
      offset += limit;
      hasMore = batch.length === limit;
      if (batch.length === limit) {
        console.log(`   Fetched ${allStudents.length} students so far...`);
      }
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allStudents.length} students\n`);

  if (allStudents.length === 0) {
    console.log('⚠️  No students found. Nothing to do.');
    return;
  }

  // Step 4: Check existing attendance records
  console.log('🔍 Checking for existing attendance records...');
  const { data: existingAttendance, error: attendanceCheckError } = await supabase
    .from('meeting_attendance')
    .select('student_s_number')
    .eq('meeting_id', meetingId);

  if (attendanceCheckError) {
    console.error('❌ Error checking existing attendance:', attendanceCheckError);
    throw attendanceCheckError;
  }

  const existingStudentNumbers = new Set(
    (existingAttendance || []).map((a: any) => (a.student_s_number || '').toLowerCase())
  );

  console.log(`📊 Found ${existingStudentNumbers.size} existing attendance records\n`);

  // Step 5: Create attendance records for all students
  console.log('📝 Creating attendance records...\n');
  const results = {
    success: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [] as Array<{ student: string; error: string }>
  };

  // Process in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < allStudents.length; i += batchSize) {
    const batch = allStudents.slice(i, i + batchSize);
    const attendanceRecords = batch
      .filter(student => {
        const sNumber = (student.s_number || '').toLowerCase();
        return !existingStudentNumbers.has(sNumber);
      })
      .map(student => ({
        meeting_id: meetingId,
        student_s_number: (student.s_number || '').toLowerCase(),
        attendance_code: 'ATTEND',
        session_type: sessionType,
        submitted_at: new Date().toISOString()
      }));

    if (attendanceRecords.length === 0) {
      results.skipped += batch.length;
      continue;
    }

    const { error: insertError } = await supabase
      .from('meeting_attendance')
      .insert(attendanceRecords);

    if (insertError) {
      console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, insertError.message);
      results.errors += attendanceRecords.length;
      batch.forEach(student => {
        const sNumber = (student.s_number || '').toLowerCase();
        if (!existingStudentNumbers.has(sNumber)) {
          results.errorDetails.push({
            student: student.name || student.s_number || 'Unknown',
            error: insertError.message
          });
        }
      });
    } else {
      results.success += attendanceRecords.length;
      results.skipped += (batch.length - attendanceRecords.length);
      console.log(`   ✅ Processed ${i + attendanceRecords.length}/${allStudents.length} students...`);
    }
  }

  // Final summary
  console.log(`\n✅ Complete!`);
  console.log(`   📊 Total Students: ${allStudents.length}`);
  console.log(`   ✅ New Attendance Records: ${results.success}`);
  console.log(`   ⏭️  Skipped (already exists): ${results.skipped}`);
  console.log(`   ❌ Errors: ${results.errors}`);

  if (results.errorDetails.length > 0) {
    console.log(`\n⚠️  Error details:`);
    results.errorDetails.slice(0, 10).forEach(err => {
      console.log(`   ${err.student}: ${err.error}`);
    });
    if (results.errorDetails.length > 10) {
      console.log(`   ... and ${results.errorDetails.length - 10} more errors`);
    }
  }

  console.log(`\n📅 Meeting ID: ${meetingId}`);
  console.log(`📅 Meeting Date: ${meetingDate}`);
  console.log(`👥 Total attendance records: ${existingStudentNumbers.size + results.success}`);
}

// Run the script
createJanuaryMeetingAndMarkAllAttendance()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
