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
  'Member Name': string;
  'Total Hours Volunteering': string;
  'Total Hours Social': string;
}

async function finalCleanupAndVerify() {
  console.log('🔍 Final cleanup: Ensuring hours match requests exactly...\n');

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

  // Get all students
  let allStudents: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('students')
      .select('id, s_number, name, volunteering_hours, social_hours, total_hours')
      .range(offset, offset + limit - 1);

    if (error) throw error;

    if (batch && batch.length > 0) {
      allStudents = allStudents.concat(batch);
      offset += limit;
      hasMore = batch.length === limit;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allStudents.length} students\n`);

  let fixed = 0;

  for (const student of allStudents) {
    // Get all approved requests (excluding "Previously Recorded Hours")
    const { data: allRequests } = await supabase
      .from('hour_requests')
      .select('id, hours_requested, type, event_name')
      .eq('student_s_number', student.s_number)
      .eq('status', 'approved');

    // Separate real requests from "Previously Recorded Hours"
    let realVolunteering = 0;
    let realSocial = 0;
    const previouslyRecordedIds: string[] = [];

    (allRequests || []).forEach((req: any) => {
      const eventName = (req.event_name || '').toLowerCase();
      if (eventName.includes('previously recorded hours')) {
        previouslyRecordedIds.push(req.id);
        return;
      }

      const hours = parseFloat(req.hours_requested || 0) || 0;
      const type = (req.type || 'volunteering').toLowerCase();
      
      if (type === 'volunteering') {
        realVolunteering += hours;
      } else {
        realSocial += hours;
      }
    });

    // Get CSV data
    const studentIdForCSV = student.s_number.toLowerCase().replace(/^s/, '');
    const csvData = csvDataMap.get(studentIdForCSV);
    const csvVolunteering = csvData?.volunteering || 0;
    const csvSocial = csvData?.social || 0;
    const adjustedCSVVolunteering = Math.max(0, csvVolunteering - csvSocial);

    // Expected hours = real requests + adjusted CSV
    const expectedVolunteering = realVolunteering + adjustedCSVVolunteering;
    const expectedSocial = realSocial + csvSocial;
    const expectedTotal = expectedVolunteering + expectedSocial;

    const currentVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
    const currentSocial = parseFloat(student.social_hours || 0) || 0;
    const currentTotal = parseFloat(student.total_hours || 0) || 0;

    // Check if correction needed
    const needsCorrection = 
      Math.abs(currentVolunteering - expectedVolunteering) > 0.01 ||
      Math.abs(currentSocial - expectedSocial) > 0.01;

    if (needsCorrection) {
      console.log(`Fixing: ${student.name} (${student.s_number})`);
      console.log(`   Current: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);
      console.log(`   Expected: ${expectedVolunteering}V / ${expectedSocial}S / ${expectedTotal}T`);

      // Delete all "Previously Recorded Hours" records
      for (const id of previouslyRecordedIds) {
        await supabase.from('hour_requests').delete().eq('id', id);
      }

      // Update student hours
      await supabase
        .from('students')
        .update({
          volunteering_hours: expectedVolunteering,
          social_hours: expectedSocial,
          last_hour_update: new Date().toISOString()
        })
        .eq('s_number', student.s_number);

      // Create single "Previously Recorded Hours" records if CSV hours exist
      if (adjustedCSVVolunteering > 0) {
        await supabase
          .from('hour_requests')
          .insert([{
            student_s_number: student.s_number.toLowerCase(),
            student_name: student.name || 'Unknown',
            event_name: 'Previously Recorded Hours',
            event_date: new Date().toISOString().split('T')[0],
            hours_requested: adjustedCSVVolunteering,
            description: `These ${adjustedCSVVolunteering} volunteering hour${adjustedCSVVolunteering === 1 ? '' : 's'} ${adjustedCSVVolunteering === 1 ? 'was' : 'were'} previously recorded and added from historical records. Original CSV showed ${csvVolunteering} volunteering hours, adjusted by ${csvSocial} social credit${csvSocial === 1 ? '' : 's'} to avoid double-counting.`,
            type: 'volunteering',
            status: 'approved',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'System',
            admin_notes: 'Previously recorded hours from historical data'
          }]);
      }

      if (csvSocial > 0) {
        await supabase
          .from('hour_requests')
          .insert([{
            student_s_number: student.s_number.toLowerCase(),
            student_name: student.name || 'Unknown',
            event_name: 'Previously Recorded Hours',
            event_date: new Date().toISOString().split('T')[0],
            hours_requested: csvSocial,
            description: `These ${csvSocial} social credit${csvSocial === 1 ? '' : 's'} ${csvSocial === 1 ? 'was' : 'were'} previously recorded and added from historical records.`,
            type: 'social',
            status: 'approved',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'System',
            admin_notes: 'Previously recorded social credits from historical data'
          }]);
      }

      console.log(`   ✅ Fixed to: ${expectedVolunteering}V / ${expectedSocial}S / ${expectedTotal}T\n`);
      fixed++;

      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`\nTotal students fixed: ${fixed}`);
  console.log('\n' + '='.repeat(80) + '\n');
}

finalCleanupAndVerify()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

