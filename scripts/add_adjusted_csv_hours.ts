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
  'Added to App': string;
}

interface Result {
  studentSNumber: string;
  studentName: string;
  csvVolunteering: number;
  csvSocial: number;
  adjustedVolunteering: number;
  hoursBefore: { volunteering: number; social: number; total: number };
  hoursAfter: { volunteering: number; social: number; total: number };
  recordsCreated: number;
  skipped: boolean;
  skipReason?: string;
  success: boolean;
  error?: string;
}

async function addAdjustedCSVHours() {
  console.log('🔍 Adding CSV hours with adjusted logic...\n');
  console.log('Logic: Volunteering hours = CSV volunteering - CSV social\n');
  console.log('       Social credits = CSV social (as is)\n');
  console.log('       Processing ALL students (including those marked with X)\n');

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
    const addedToApp = (row['Added to App'] || '').trim().toUpperCase();
    const isMarkedX = addedToApp === 'X';

    // Skip if no hours or no student ID
    if ((csvVolunteering === 0 && csvSocial === 0) || !studentId) {
      continue;
    }

    // Note if marked with X (but still process)
    if (isMarkedX) {
      console.log(`⊗ Processing (marked with X): ${studentName} (ID: ${studentId})`);
    } else {
      console.log(`Processing: ${studentName} (ID: ${studentId})`);
    }

    // Calculate adjusted volunteering hours
    const adjustedVolunteering = Math.max(0, csvVolunteering - csvSocial);

    console.log(`   CSV: ${csvVolunteering}V / ${csvSocial}S`);
    console.log(`   Adjusted volunteering: ${adjustedVolunteering}V (${csvVolunteering} - ${csvSocial})`);
    console.log(`   Social credits: ${csvSocial}S`);

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
        console.log(`   ⚠️  Student not found in database, skipping\n`);
        results.push({
          studentSNumber: studentId,
          studentName,
          csvVolunteering,
          csvSocial,
          adjustedVolunteering,
          hoursBefore: { volunteering: 0, social: 0, total: 0 },
          hoursAfter: { volunteering: 0, social: 0, total: 0 },
          recordsCreated: 0,
          skipped: false,
          success: false,
          error: 'Student not found'
        });
        continue;
      }

      const currentVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
      const currentSocial = parseFloat(student.social_hours || 0) || 0;
      const currentTotal = parseFloat(student.total_hours || 0) || 0;

      console.log(`   Current: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);

      // Calculate new hours
      const newVolunteering = currentVolunteering + adjustedVolunteering;
      const newSocial = currentSocial + csvSocial;

      // Update student hours
      const { error: updateError } = await supabase
        .from('students')
        .update({
          volunteering_hours: newVolunteering,
          social_hours: newSocial,
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
      const newSocialFinal = updatedStudent?.social_hours || newSocial;
      const newTotal = updatedStudent?.total_hours || (newVolunteeringFinal + newSocialFinal);

      console.log(`   New hours: ${newVolunteeringFinal}V / ${newSocialFinal}S / ${newTotal}T`);

      // Create audit records
      let recordsCreated = 0;

      if (adjustedVolunteering > 0) {
        const { error: volError } = await supabase
          .from('hour_requests')
          .insert([{
            student_s_number: student.s_number.toLowerCase(),
            student_name: student.name || studentName,
            event_name: 'Previously Recorded Hours',
            event_date: new Date().toISOString().split('T')[0],
            hours_requested: adjustedVolunteering,
            description: `These ${adjustedVolunteering} volunteering hour${adjustedVolunteering === 1 ? '' : 's'} ${adjustedVolunteering === 1 ? 'was' : 'were'} previously recorded and added from historical records. Original CSV showed ${csvVolunteering} volunteering hours, adjusted by ${csvSocial} social credit${csvSocial === 1 ? '' : 's'} to avoid double-counting.`,
            type: 'volunteering',
            status: 'approved',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'System',
            admin_notes: 'Previously recorded hours from historical data'
          }]);

        if (!volError) {
          recordsCreated++;
          console.log(`   ✅ Created volunteering record: ${adjustedVolunteering} hours`);
        }
      }

      if (csvSocial > 0) {
        const { error: socialError } = await supabase
          .from('hour_requests')
          .insert([{
            student_s_number: student.s_number.toLowerCase(),
            student_name: student.name || studentName,
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

        if (!socialError) {
          recordsCreated++;
          console.log(`   ✅ Created social credit record: ${csvSocial} credits`);
        }
      }

      console.log('');

      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || studentName,
        csvVolunteering,
        csvSocial,
        adjustedVolunteering,
        hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        hoursAfter: { volunteering: newVolunteeringFinal, social: newSocialFinal, total: newTotal },
        recordsCreated,
        skipped: false,
        success: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      results.push({
        studentSNumber: studentId,
        studentName,
        csvVolunteering,
        csvSocial,
        adjustedVolunteering,
        hoursBefore: { volunteering: 0, social: 0, total: 0 },
        hoursAfter: { volunteering: 0, social: 0, total: 0 },
        recordsCreated: 0,
        skipped: false,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  const totalProcessed = results.filter(r => !r.skipped).length;
  const successful = results.filter(r => r.success && !r.skipped).length;
  const skipped = results.filter(r => r.skipped).length;
  const failed = results.filter(r => !r.success && !r.skipped).length;
  const totalRecordsCreated = results.reduce((sum, r) => sum + r.recordsCreated, 0);

  console.log(`\nTotal students in CSV with hours: ${results.length}`);
  console.log(`⊗ Skipped (marked with X): ${skipped}`);
  console.log(`📝 Processed: ${totalProcessed}`);
  console.log(`✅ Successfully processed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Audit records created: ${totalRecordsCreated}`);

  if (successful > 0) {
    console.log('\n\n✅ Successfully processed (showing first 30):');
    results
      .filter(r => r.success && !r.skipped)
      .slice(0, 30)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
        console.log(`   CSV: ${result.csvVolunteering}V / ${result.csvSocial}S`);
        console.log(`   Added: ${result.adjustedVolunteering}V (${result.csvVolunteering} - ${result.csvSocial}) + ${result.csvSocial}S`);
        console.log(`   Before: ${result.hoursBefore.volunteering}V / ${result.hoursBefore.social}S / ${result.hoursBefore.total}T`);
        console.log(`   After:  ${result.hoursAfter.volunteering}V / ${result.hoursAfter.social}S / ${result.hoursAfter.total}T`);
        console.log(`   Records created: ${result.recordsCreated}`);
      });
    
    if (successful > 30) {
      console.log(`\n   ... and ${successful - 30} more students`);
    }
  }

  if (skipped > 0) {
    console.log(`\n\n⊗ Skipped ${skipped} students marked with X (first 10):`);
    results
      .filter(r => r.skipped)
      .slice(0, 10)
      .forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.studentName} (${result.studentSNumber}) - CSV: ${result.csvVolunteering}V / ${result.csvSocial}S`);
      });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

addAdjustedCSVHours()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

