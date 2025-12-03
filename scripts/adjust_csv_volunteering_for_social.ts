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
  volunteeringSubtracted: number;
  hoursBefore: { volunteering: number; social: number; total: number };
  hoursAfter: { volunteering: number; social: number; total: number };
  csvVolunteeringRecordUpdated: boolean;
  success: boolean;
  error?: string;
}

async function adjustCSVVolunteeringForSocial() {
  console.log('🔍 Adjusting CSV volunteering hours to account for social credits...\n');
  console.log('For each student: Subtracting CSV social credits from CSV volunteering hours\n');

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

    console.log(`Processing: ${studentName} (ID: ${studentId}) - ${csvSocialCredits} CSV social credits`);

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
          csvSocialCredits,
          volunteeringSubtracted: 0,
          hoursBefore: { volunteering: 0, social: 0, total: 0 },
          hoursAfter: { volunteering: 0, social: 0, total: 0 },
          csvVolunteeringRecordUpdated: false,
          success: false,
          error: 'Student not found'
        });
        continue;
      }

      const currentVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
      const currentSocial = parseFloat(student.social_hours || 0) || 0;
      const currentTotal = parseFloat(student.total_hours || 0) || 0;

      console.log(`   Current: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);

      // Subtract social credits from volunteering hours
      const newVolunteering = Math.max(0, currentVolunteering - csvSocialCredits);

      // Update student hours
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

      console.log(`   Subtracted ${csvSocialCredits} from volunteering hours`);
      console.log(`   New hours: ${newVolunteeringFinal}V / ${newSocial}S / ${newTotal}T`);

      // Update the "Hours Added from CSV" volunteering record to reflect the reduced amount
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
        const currentRecordHours = parseFloat(csvRecord.hours_requested || 0) || 0;
        const newRecordHours = Math.max(0, currentRecordHours - csvSocialCredits);

        if (newRecordHours > 0) {
          const { error: updateRecordError } = await supabase
            .from('hour_requests')
            .update({
              hours_requested: newRecordHours,
              description: `These ${newRecordHours} volunteering hour${newRecordHours === 1 ? '' : 's'} ${newRecordHours === 1 ? 'was' : 'were'} added from the master CSV sheet. This record was automatically created to maintain an accurate audit trail. Note: ${csvSocialCredits} hour${csvSocialCredits === 1 ? '' : 's'} from the CSV ${csvSocialCredits === 1 ? 'was' : 'were'} converted to social credits.`
            })
            .eq('id', csvRecord.id);

          if (!updateRecordError) {
            recordUpdated = true;
            console.log(`   ✅ Updated CSV volunteering record: ${currentRecordHours} → ${newRecordHours} hours`);
          }
        } else {
          // If the record would be 0 hours, delete it
          const { error: deleteError } = await supabase
            .from('hour_requests')
            .delete()
            .eq('id', csvRecord.id);

          if (!deleteError) {
            recordUpdated = true;
            console.log(`   ✅ Deleted CSV volunteering record (would be 0 hours)`);
          }
        }
      }

      console.log('');

      results.push({
        studentSNumber: student.s_number,
        studentName: student.name || studentName,
        csvSocialCredits,
        volunteeringSubtracted: csvSocialCredits,
        hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        hoursAfter: { volunteering: newVolunteeringFinal, social: newSocial, total: newTotal },
        csvVolunteeringRecordUpdated: recordUpdated,
        success: true
      });

      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}\n`);
      results.push({
        studentSNumber: studentId,
        studentName,
        csvSocialCredits,
        volunteeringSubtracted: 0,
        hoursBefore: { volunteering: 0, social: 0, total: 0 },
        hoursAfter: { volunteering: 0, social: 0, total: 0 },
        csvVolunteeringRecordUpdated: false,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 ADJUSTMENT SUMMARY');
  console.log('='.repeat(80));

  const totalProcessed = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalVolunteeringSubtracted = results.reduce((sum, r) => sum + (r.success ? r.volunteeringSubtracted : 0), 0);
  const recordsUpdated = results.filter(r => r.csvVolunteeringRecordUpdated).length;

  console.log(`\nTotal students processed: ${totalProcessed}`);
  console.log(`✅ Successfully processed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total volunteering hours subtracted: ${totalVolunteeringSubtracted}`);
  console.log(`📋 CSV volunteering records updated: ${recordsUpdated}`);

  if (successful > 0) {
    console.log('\n\n✅ Successfully processed (showing first 20):');
    results
      .filter(r => r.success)
      .slice(0, 20)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
        console.log(`   CSV Social Credits: ${result.csvSocialCredits}`);
        console.log(`   Volunteering subtracted: ${result.volunteeringSubtracted}`);
        console.log(`   Before: ${result.hoursBefore.volunteering}V / ${result.hoursBefore.social}S / ${result.hoursBefore.total}T`);
        console.log(`   After:  ${result.hoursAfter.volunteering}V / ${result.hoursAfter.social}S / ${result.hoursAfter.total}T`);
        console.log(`   CSV record updated: ${result.csvVolunteeringRecordUpdated ? 'Yes' : 'No'}`);
      });
    
    if (successful > 20) {
      console.log(`\n   ... and ${successful - 20} more students`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

adjustCSVVolunteeringForSocial()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });


