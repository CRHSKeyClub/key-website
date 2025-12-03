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

interface Result {
  studentSNumber: string;
  studentName: string;
  csvVolunteering: number;
  csvSocial: number;
  hoursAdded: number;
  hoursBefore: { volunteering: number; social: number; total: number };
  hoursAfter: { volunteering: number; social: number; total: number };
  recordUpdated: boolean;
  success: boolean;
  error?: string;
}

async function fixDoubleSubtraction() {
  console.log('🔍 Fixing double subtraction issue...\n');
  console.log('Adding back CSV social credits to volunteering hours\n');

  // Read CSV
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  console.log(`✅ Loaded ${records.length} students from CSV\n`);

  const results: Result[] = [];

  for (const row of records) {
    const studentId = (row['Student ID#'] || '').trim();
    const studentName = (row['Member Name'] || '').trim();
    const csvVolunteering = parseFloat(row['Total Hours Volunteering'] || '0') || 0;
    const csvSocial = parseFloat(row['Total Hours Social'] || '0') || 0;

    // Skip if no social credits in CSV (no issue to fix)
    if (csvSocial === 0 || !studentId) {
      continue;
    }

    try {
      // Find student in database
      let studentResult = await supabase
        .from('students')
        .select('s_number, name, volunteering_hours, social_hours, total_hours')
        .eq('s_number', studentId.toLowerCase())
        .maybeSingle();

      if (!studentResult.data && !studentResult.error) {
        studentResult = await supabase
          .from('students')
          .select('s_number, name, volunteering_hours, social_hours, total_hours')
          .eq('s_number', `s${studentId.toLowerCase()}`)
          .maybeSingle();
      }

      if (studentResult.error) {
        throw new Error(`Error fetching student: ${studentResult.error.message}`);
      }

      const student = studentResult.data;
      if (!student) {
        continue;
      }

      const currentVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
      const currentSocial = parseFloat(student.social_hours || 0) || 0;
      const currentTotal = parseFloat(student.total_hours || 0) || 0;

      // Expected: CSV volunteering hours should be the full amount from CSV
      // (not reduced by social credits)
      const expectedVolunteering = csvVolunteering;
      const diff = expectedVolunteering - currentVolunteering;

      // Only fix if there's a meaningful difference
      if (Math.abs(diff) < 0.1) {
        continue;
      }

      console.log(`\n[${results.length + 1}] ${studentName} (${student.s_number})`);
      console.log(`   CSV: ${csvVolunteering}V + ${csvSocial}S`);
      console.log(`   Current: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);
      console.log(`   Expected volunteering: ${expectedVolunteering}V`);
      console.log(`   Need to add back: ${diff.toFixed(1)} hours`);

      // Add back the social credits to volunteering hours
      const newVolunteering = currentVolunteering + csvSocial;

      const { error: updateError } = await supabase
        .from('students')
        .update({
          volunteering_hours: newVolunteering,
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

      const newVolunteeringFinal = updatedStudent?.volunteering_hours || newVolunteering;
      const newSocial = updatedStudent?.social_hours || currentSocial;
      const newTotal = updatedStudent?.total_hours || (newVolunteeringFinal + newSocial);

      console.log(`   Updated to: ${newVolunteeringFinal}V / ${newSocial}S / ${newTotal}T`);

      // Update the "Hours Added from CSV" volunteering record
      const { data: csvVolunteeringRecords } = await supabase
        .from('hour_requests')
        .select('id, hours_requested')
        .eq('student_s_number', student.s_number)
        .eq('type', 'volunteering')
        .ilike('event_name', '%Hours Added from CSV%')
        .eq('status', 'approved');

      let recordUpdated = false;
      if (csvVolunteeringRecords && csvVolunteeringRecords.length > 0) {
        const csvRecord = csvVolunteeringRecords[0];
        const newRecordHours = csvVolunteering; // Should be the full CSV amount

        const { error: updateRecordError } = await supabase
          .from('hour_requests')
          .update({
            hours_requested: newRecordHours,
            description: `These ${newRecordHours} volunteering hour${newRecordHours === 1 ? '' : 's'} ${newRecordHours === 1 ? 'was' : 'were'} added from the master CSV sheet. This record was automatically created to maintain an accurate audit trail.`
          })
          .eq('id', csvRecord.id);

        if (!updateRecordError) {
          recordUpdated = true;
          console.log(`   ✅ Updated CSV volunteering record to ${newRecordHours} hours`);
        }
      }

      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || studentName,
        csvVolunteering,
        csvSocial,
        hoursAdded: csvSocial,
        hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        hoursAfter: { volunteering: newVolunteeringFinal, social: newSocial, total: newTotal },
        recordUpdated,
        success: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      results.push({
        studentSNumber: studentId,
        studentName,
        csvVolunteering: 0,
        csvSocial: 0,
        hoursAdded: 0,
        hoursBefore: { volunteering: 0, social: 0, total: 0 },
        hoursAfter: { volunteering: 0, social: 0, total: 0 },
        recordUpdated: false,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(80));

  const totalFixed = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalHoursAdded = results.reduce((sum, r) => sum + (r.success ? r.hoursAdded : 0), 0);
  const recordsUpdated = results.filter(r => r.recordUpdated).length;

  console.log(`\nTotal students fixed: ${totalFixed}`);
  console.log(`✅ Successfully fixed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total volunteering hours added back: ${totalHoursAdded}`);
  console.log(`📋 CSV volunteering records updated: ${recordsUpdated}`);

  if (successful > 0) {
    console.log('\n\n✅ Successfully fixed (showing first 20):');
    results
      .filter(r => r.success)
      .slice(0, 20)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
        console.log(`   CSV: ${result.csvVolunteering}V + ${result.csvSocial}S`);
        console.log(`   Hours added back: ${result.hoursAdded}`);
        console.log(`   Before: ${result.hoursBefore.volunteering}V / ${result.hoursBefore.social}S / ${result.hoursBefore.total}T`);
        console.log(`   After:  ${result.hoursAfter.volunteering}V / ${result.hoursAfter.social}S / ${result.hoursAfter.total}T`);
      });
    
    if (successful > 20) {
      console.log(`\n   ... and ${successful - 20} more students`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

fixDoubleSubtraction()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

