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
  'Timestamp': string;
  'First Name': string;
  'Last Name': string;
  'S Number (No s)': string;
  'Meeting Time': string;
  'What Was Discussed In The Meeting?': string;
}

interface AttendanceRecord {
  student_s_number: string;
  meeting_date: string;
  attendance_code: string;
  session_type: string;
}

function normalizeSNumber(rawS: string): string | null {
  if (!rawS) return null;
  
  // Normalize to lowercase and remove any existing 's' prefix
  let sNumber = rawS.toString().trim().toLowerCase();
  sNumber = sNumber.replace(/^s/, '');
  
  // Extract only digits
  const digits = sNumber.replace(/[^0-9]/g, '');
  if (!digits) return null;
  
  return 's' + digits;
}

function parseDate(timestamp: string): string | null {
  if (!timestamp) return null;
  
  // Handle timestamp format: "12/8/2025 17:41:37" or "12/9/2025 14:35:11"
  // Extract just the date part
  const datePart = timestamp.toString().split(' ')[0];
  
  // Try MM/DD/YYYY format
  const parts = datePart.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      // Format as YYYY-MM-DD
      const monthStr = month.toString().padStart(2, '0');
      const dayStr = day.toString().padStart(2, '0');
      return `${year}-${monthStr}-${dayStr}`;
    }
  }
  
  return null;
}

function determineSessionType(meetingTime: string): string {
  if (!meetingTime) return 'both';
  
  const timeStr = meetingTime.toString().trim().toLowerCase();
  if (timeStr.includes('morning')) {
    return 'morning';
  } else if (timeStr.includes('afternoon')) {
    return 'afternoon';
  }
  
  return 'both';
}

async function importDecemberAttendance() {
  console.log('📋 Importing December Attendance from CSV...\n');

  // Read CSV
  const csvPath = path.join(__dirname, '..', 'December 9th Meeting Attendance Form (Responses) - Form Responses 1.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  console.log(`✅ Loaded ${records.length} attendance records from CSV\n`);

  // Process records
  const attendanceRecords: AttendanceRecord[] = [];
  const errors: Array<{ row: number; error: string; data: any }> = [];

  records.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because index is 0-based and header is row 1
    
    const rawS = row['S Number (No s)'];
    const timestamp = row['Timestamp'];
    const meetingTime = row['Meeting Time'];
    const firstName = row['First Name'];
    const lastName = row['Last Name'];

    // Normalize S number
    const sNumber = normalizeSNumber(rawS);
    if (!sNumber) {
      errors.push({
        row: rowNumber,
        error: 'Invalid or missing S number',
        data: { rawS, firstName, lastName }
      });
      return;
    }

    // Parse date
    const meetingDate = parseDate(timestamp);
    if (!meetingDate) {
      errors.push({
        row: rowNumber,
        error: 'Could not parse date from timestamp',
        data: { timestamp, firstName, lastName, sNumber }
      });
      return;
    }

    // Determine session type
    const sessionType = determineSessionType(meetingTime);

    attendanceRecords.push({
      student_s_number: sNumber,
      meeting_date: meetingDate,
      attendance_code: 'IMPORTED',
      session_type: sessionType
    });
  });

  console.log(`✅ Processed ${attendanceRecords.length} valid attendance records`);
  if (errors.length > 0) {
    console.log(`⚠️  ${errors.length} records had errors:\n`);
    errors.forEach(err => {
      console.log(`   Row ${err.row}: ${err.error}`);
      console.log(`   Data:`, err.data);
    });
    console.log();
  }

  // Get unique dates to create/get meetings
  const uniqueDates = [...new Set(attendanceRecords.map(a => a.meeting_date))];
  const meetingMap: Record<string, string> = {};

  console.log(`📅 Creating/getting meetings for ${uniqueDates.length} unique dates...\n`);

  // Create or get meetings for each date
  for (const date of uniqueDates) {
    const { data: existingMeetings } = await supabase
      .from('meetings')
      .select('id')
      .eq('meeting_date', date)
      .limit(1);
    
    let meetingId: string;
    
    if (existingMeetings && existingMeetings.length > 0) {
      meetingId = existingMeetings[0].id;
      console.log(`✅ Meeting for ${date} already exists: ${meetingId}`);
    } else {
      // Create new meeting
      const { data: newMeeting, error: meetingError } = await supabase
        .from('meetings')
        .insert([{
          meeting_date: date,
          meeting_type: 'both', // Valid values appear to be session types: 'both', 'morning', 'afternoon'
          attendance_code: 'ATTEND',
          is_open: false,
          created_by: 'admin',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (meetingError) {
        console.error(`❌ Error creating meeting for ${date}:`, meetingError);
        throw meetingError;
      }
      
      meetingId = newMeeting.id;
      console.log(`✅ Created meeting for ${date}: ${meetingId}`);
    }
    
    meetingMap[date] = meetingId;
  }

  console.log(`\n📝 Inserting attendance records...\n`);

  // Insert attendance records
  const results = {
    success: 0,
    errors: 0,
    skipped: 0,
    errorDetails: [] as Array<{ student: string; date: string; error: string }>
  };

  for (const record of attendanceRecords) {
    const meetingId = meetingMap[record.meeting_date];
    if (!meetingId) {
      results.errors++;
      results.errorDetails.push({
        student: record.student_s_number,
        date: record.meeting_date,
        error: 'No meeting ID found for date'
      });
      continue;
    }
    
    // Check if attendance already exists
    const { data: existing } = await supabase
      .from('meeting_attendance')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('student_s_number', record.student_s_number.toLowerCase())
      .limit(1);
    
    if (existing && existing.length > 0) {
      results.skipped++;
      continue;
    }
    
    const { error } = await supabase
      .from('meeting_attendance')
      .insert([{
        meeting_id: meetingId,
        student_s_number: record.student_s_number.toLowerCase(),
        attendance_code: record.attendance_code || 'IMPORTED',
        session_type: record.session_type || 'both',
        submitted_at: new Date().toISOString()
      }]);
    
    if (error) {
      results.errors++;
      results.errorDetails.push({
        student: record.student_s_number,
        date: record.meeting_date,
        error: error.message
      });
      console.error(`❌ Error inserting attendance for ${record.student_s_number} on ${record.meeting_date}:`, error.message);
    } else {
      results.success++;
      if (results.success % 50 === 0) {
        console.log(`   Processed ${results.success} records...`);
      }
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Success: ${results.success}`);
  console.log(`   Skipped (already exists): ${results.skipped}`);
  console.log(`   Errors: ${results.errors}`);
  
  if (results.errorDetails.length > 0) {
    console.log(`\n⚠️  Error details:`);
    results.errorDetails.forEach(err => {
      console.log(`   ${err.student} on ${err.date}: ${err.error}`);
    });
  }

  // Summary by date
  const dateCounts: Record<string, number> = {};
  attendanceRecords.forEach(record => {
    dateCounts[record.meeting_date] = (dateCounts[record.meeting_date] || 0) + 1;
  });

  console.log(`\n📊 Summary by date:`);
  Object.entries(dateCounts).sort().forEach(([date, count]) => {
    console.log(`   ${date}: ${count} attendance records`);
  });
}

// Run the import
importDecemberAttendance()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

