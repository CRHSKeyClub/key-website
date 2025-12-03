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
  'Total Hours Social': string;
}

interface Result {
  studentSNumber: string;
  studentName: string;
  csvSocialCredits: number;
  hoursBefore: { volunteering: number; social: number; total: number };
  hoursAfter: { volunteering: number; social: number; total: number };
  recordCreated: boolean;
  success: boolean;
  error?: string;
}

async function addCSVSocialCredits() {
  console.log('🔍 Adding CSV social credits back to students...\n');

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
    const csvSocialCredits = parseFloat(row['Total Hours Social'] || '0') || 0;

    // Skip if no social credits in CSV
    if (csvSocialCredits === 0 || !studentId) {
      continue;
    }

    console.log(`Processing: ${studentName} (ID: ${studentId}) - ${csvSocialCredits} social credits from CSV`);

    try {
      // Find student in database (try with and without 's' prefix)
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
          csvSocialCredits,
          hoursBefore: { volunteering: 0, social: 0, total: 0 },
          hoursAfter: { volunteering: 0, social: 0, total: 0 },
          recordCreated: false,
          success: false,
          error: 'Student not found'
        });
        continue;
      }

      const currentVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
      const currentSocial = parseFloat(student.social_hours || 0) || 0;
      const currentTotal = parseFloat(student.total_hours || 0) || 0;

      console.log(`   Current: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);

      // Check if CSV social credit record already exists
      const { data: existingRecords } = await supabase
        .from('hour_requests')
        .select('id')
        .eq('student_s_number', student.s_number)
        .eq('type', 'social')
        .ilike('event_name', '%Hours Added from CSV%')
        .eq('status', 'approved');

      if (existingRecords && existingRecords.length > 0) {
        console.log(`   ℹ️  CSV social credit record already exists, skipping\n`);
        results.push({
          studentSNumber: student.s_number,
          studentName: student.name || studentName,
          csvSocialCredits,
          hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
          hoursAfter: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
          recordCreated: false,
          success: true
        });
        continue;
      }

      // Add social credits (only update social_hours, not volunteering_hours)
      const newSocial = currentSocial + csvSocialCredits;

      const { error: updateError } = await supabase
        .from('students')
        .update({
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

      const newVolunteering = updatedStudent?.volunteering_hours || currentVolunteering;
      const newSocialFinal = updatedStudent?.social_hours || newSocial;
      const newTotal = updatedStudent?.total_hours || (newVolunteering + newSocialFinal);

      // Create audit record
      const { error: recordError } = await supabase
        .from('hour_requests')
        .insert([{
          student_s_number: student.s_number.toLowerCase(),
          student_name: student.name || studentName,
          event_name: 'Hours Added from CSV',
          event_date: new Date().toISOString().split('T')[0],
          hours_requested: csvSocialCredits,
          description: `These ${csvSocialCredits} social credit${csvSocialCredits === 1 ? '' : 's'} ${csvSocialCredits === 1 ? 'was' : 'were'} added from the master CSV sheet. This record was automatically created to maintain an accurate audit trail.`,
          type: 'social',
          status: 'approved',
          submitted_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: 'System',
          admin_notes: 'Automatically created audit record for CSV social credits'
        }]);

      if (recordError) {
        console.log(`   ⚠️  Failed to create audit record: ${recordError.message}`);
      } else {
        console.log(`   ✅ Created audit record for ${csvSocialCredits} social credits`);
      }

      console.log(`   New hours: ${newVolunteering}V / ${newSocialFinal}S / ${newTotal}T\n`);

      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || studentName,
        csvSocialCredits,
        hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        hoursAfter: { volunteering: newVolunteering, social: newSocialFinal, total: newTotal },
        recordCreated: !recordError,
        success: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      results.push({
        studentSNumber: studentId,
        studentName,
        csvSocialCredits,
        hoursBefore: { volunteering: 0, social: 0, total: 0 },
        hoursAfter: { volunteering: 0, social: 0, total: 0 },
        recordCreated: false,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  const totalProcessed = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalCreditsAdded = results.reduce((sum, r) => sum + (r.success ? r.csvSocialCredits : 0), 0);
  const recordsCreated = results.filter(r => r.recordCreated).length;

  console.log(`\nTotal students processed: ${totalProcessed}`);
  console.log(`✅ Successfully processed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total social credits added: ${totalCreditsAdded}`);
  console.log(`📋 Audit records created: ${recordsCreated}`);

  if (successful > 0) {
    console.log('\n\n✅ Successfully processed (showing first 20):');
    results
      .filter(r => r.success)
      .slice(0, 20)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
        console.log(`   CSV Social Credits: ${result.csvSocialCredits}`);
        console.log(`   Before: ${result.hoursBefore.volunteering}V / ${result.hoursBefore.social}S / ${result.hoursBefore.total}T`);
        console.log(`   After:  ${result.hoursAfter.volunteering}V / ${result.hoursAfter.social}S / ${result.hoursAfter.total}T`);
        console.log(`   Record created: ${result.recordCreated ? 'Yes' : 'No'}`);
      });
    
    if (successful > 20) {
      console.log(`\n   ... and ${successful - 20} more students`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

addCSVSocialCredits()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });



