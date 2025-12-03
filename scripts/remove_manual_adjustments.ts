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
  'Strikes: Reds/Yellows': string;
  'Member Name': string;
  'Email': string;
  'Phone #': string;
  'Grade': string;
  'Student ID#': string;
  'Total Hours Volunteering': string;
  'Total Hours Social': string;
  'Added to App': string;
}

interface HourRequest {
  id: string;
  student_s_number: string;
  student_name: string;
  event_name: string;
  hours_requested: number;
  description: string;
  type: 'volunteering' | 'social';
  status: string;
  reviewed_at?: string;
}

async function removeManualAdjustments() {
  console.log('🔍 Starting removal of manual admin adjustments...\n');

  // Read CSV to get list of X-marked students
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  console.log(`📄 Reading CSV file to identify X-marked students...`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  // Get all X-marked student IDs
  const xMarkedStudentIds = new Set<string>();
  records.forEach(row => {
    const addedToApp = (row['Added to App'] || '').trim().toUpperCase();
    if (addedToApp === 'X') {
      const studentId = (row['Student ID#'] || '').trim();
      if (studentId) {
        xMarkedStudentIds.add(studentId.toLowerCase());
        // Also add with 's' prefix
        xMarkedStudentIds.add(`s${studentId.toLowerCase()}`);
      }
    }
  });

  console.log(`📍 Found ${xMarkedStudentIds.size / 2} X-marked students in CSV\n`);

  // Get all manual adjustment hour requests (fetch in batches to avoid timeout)
  console.log('🔍 Fetching all manual adjustment hour requests from database...');
  
  let allAdjustments: any[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error: fetchError } = await supabase
      .from('hour_requests')
      .select('*')
      .or('description.ilike.%Manual Adjustment%,description.ilike.%Manual hour adjustment%')
      .eq('status', 'approved')
      .range(offset, offset + limit - 1)
      .order('reviewed_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching adjustments:', fetchError);
      throw fetchError;
    }

    if (batch && batch.length > 0) {
      allAdjustments = allAdjustments.concat(batch);
      offset += limit;
      hasMore = batch.length === limit;
      console.log(`  Fetched ${allAdjustments.length} records so far...`);
    } else {
      hasMore = false;
    }
  }

  if (allAdjustments.length === 0) {
    console.log('✅ No manual adjustments found in the database.');
    return;
  }

  console.log(`📊 Found ${allAdjustments.length} manual adjustment records\n`);

  // Filter to only X-marked students
  const adjustmentsToRemove = allAdjustments.filter((adj: any) => {
    const sNumber = (adj.student_s_number || '').toLowerCase().trim();
    return xMarkedStudentIds.has(sNumber);
  });

  console.log(`🎯 Found ${adjustmentsToRemove.length} manual adjustments for X-marked students\n`);

  if (adjustmentsToRemove.length === 0) {
    console.log('✅ No manual adjustments found for X-marked students.');
    return;
  }

  // Process each adjustment - reverse the hours and delete the record
  console.log('🔄 Reversing hours adjustments and removing records...\n');

  const results: Array<{
    id: string;
    studentName: string;
    studentSNumber: string;
    hoursRequested: number;
    type: string;
    eventName: string;
    success: boolean;
    error?: string;
    hoursBefore: { volunteering: number; social: number; total: number };
    hoursAfter: { volunteering: number; social: number; total: number };
  }> = [];

  for (const adjustment of adjustmentsToRemove) {
    const sNumber = (adjustment.student_s_number || '').toLowerCase().trim();
    const hoursRequested = parseFloat(adjustment.hours_requested || 0);
    const type = (adjustment.type || 'volunteering').toLowerCase();
    const eventName = adjustment.event_name || '';
    
    console.log(`\nProcessing: ${adjustment.student_name} (${sNumber})`);
    console.log(`  Event: ${eventName}`);
    console.log(`  Hours: ${hoursRequested} (${type})`);

    try {
      // Get current student hours
      let studentResult = await supabase
        .from('students')
        .select('s_number, name, volunteering_hours, social_hours, total_hours')
        .eq('s_number', sNumber)
        .maybeSingle();

      // Try with 's' prefix if not found
      if (!studentResult.data && !sNumber.startsWith('s')) {
        studentResult = await supabase
          .from('students')
          .select('s_number, name, volunteering_hours, social_hours, total_hours')
          .eq('s_number', `s${sNumber}`)
          .maybeSingle();
      }

      if (studentResult.error) {
        throw new Error(`Error fetching student: ${studentResult.error.message}`);
      }

      const student = studentResult.data;
      if (!student) {
        console.log(`  ⚠️  Student not found in database, skipping hour reversal`);
        results.push({
          id: adjustment.id,
          studentName: adjustment.student_name || 'Unknown',
          studentSNumber: sNumber,
          hoursRequested,
          type,
          eventName,
          success: false,
          error: 'Student not found',
          hoursBefore: { volunteering: 0, social: 0, total: 0 },
          hoursAfter: { volunteering: 0, social: 0, total: 0 }
        });
        
        // Still delete the hour request record
        await supabase
          .from('hour_requests')
          .delete()
          .eq('id', adjustment.id);
        
        continue;
      }

      const currentVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
      const currentSocial = parseFloat(student.social_hours || 0) || 0;
      const currentTotal = parseFloat(student.total_hours || 0) || 0;

      console.log(`  Current hours: ${currentVolunteering}V / ${currentSocial}S / ${currentTotal}T`);

      // Parse the description to determine if hours were added or removed
      const description = (adjustment.description || '').toLowerCase();
      const isAdded = description.includes('added') || description.includes('+');
      const isRemoved = description.includes('removed') || description.includes('-');

      let newVolunteering = currentVolunteering;
      let newSocial = currentSocial;

      // Reverse the adjustment
      if (type === 'volunteering') {
        if (isAdded) {
          newVolunteering = Math.max(0, currentVolunteering - hoursRequested);
          console.log(`  Reversing: Subtracting ${hoursRequested} volunteering hours`);
        } else if (isRemoved) {
          newVolunteering = currentVolunteering + hoursRequested;
          console.log(`  Reversing: Adding back ${hoursRequested} volunteering hours`);
        } else {
          // If unclear, subtract (more likely they were added)
          newVolunteering = Math.max(0, currentVolunteering - hoursRequested);
          console.log(`  Reversing: Subtracting ${hoursRequested} volunteering hours (assumed added)`);
        }
      } else if (type === 'social') {
        if (isAdded) {
          newSocial = Math.max(0, currentSocial - hoursRequested);
          console.log(`  Reversing: Subtracting ${hoursRequested} social hours`);
        } else if (isRemoved) {
          newSocial = currentSocial + hoursRequested;
          console.log(`  Reversing: Adding back ${hoursRequested} social hours`);
        } else {
          newSocial = Math.max(0, currentSocial - hoursRequested);
          console.log(`  Reversing: Subtracting ${hoursRequested} social hours (assumed added)`);
        }
      }

      // Update student hours
      const updateResult = await supabase
        .from('students')
        .update({
          volunteering_hours: newVolunteering,
          social_hours: newSocial,
          last_hour_update: new Date().toISOString()
        })
        .eq('s_number', student.s_number)
        .select();

      if (updateResult.error) {
        throw new Error(`Error updating student hours: ${updateResult.error.message}`);
      }

      // Get updated hours (total_hours is auto-calculated by trigger)
      const updatedStudent = updateResult.data?.[0];
      const newTotal = parseFloat(updatedStudent?.total_hours || 0) || (newVolunteering + newSocial);

      console.log(`  New hours: ${newVolunteering}V / ${newSocial}S / ${newTotal}T`);
      console.log(`  ✅ Hours reversed successfully`);

      // Delete the hour request record
      const deleteResult = await supabase
        .from('hour_requests')
        .delete()
        .eq('id', adjustment.id);

      if (deleteResult.error) {
        throw new Error(`Error deleting hour request: ${deleteResult.error.message}`);
      }

      console.log(`  ✅ Hour request record deleted`);

      results.push({
        id: adjustment.id,
        studentName: adjustment.student_name || 'Unknown',
        studentSNumber: sNumber,
        hoursRequested,
        type,
        eventName,
        success: true,
        hoursBefore: { volunteering: currentVolunteering, social: currentSocial, total: currentTotal },
        hoursAfter: { volunteering: newVolunteering, social: newSocial, total: newTotal }
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
      results.push({
        id: adjustment.id,
        studentName: adjustment.student_name || 'Unknown',
        studentSNumber: sNumber,
        hoursRequested,
        type,
        eventName,
        success: false,
        error: error.message,
        hoursBefore: { volunteering: 0, social: 0, total: 0 },
        hoursAfter: { volunteering: 0, social: 0, total: 0 }
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 REMOVAL SUMMARY');
  console.log('='.repeat(80));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal adjustments processed: ${results.length}`);
  console.log(`✅ Successfully reversed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (successful > 0) {
    console.log('\n✅ Successfully reversed adjustments:');
    results.filter(r => r.success).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
      console.log(`   ${result.eventName}`);
      console.log(`   Hours: ${result.hoursRequested} ${result.type}`);
      console.log(`   Before: ${result.hoursBefore.volunteering}V / ${result.hoursBefore.social}S / ${result.hoursBefore.total}T`);
      console.log(`   After:  ${result.hoursAfter.volunteering}V / ${result.hoursAfter.social}S / ${result.hoursAfter.total}T`);
    });
  }

  if (failed > 0) {
    console.log('\n❌ Failed reversals:');
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.studentName} (${result.studentSNumber})`);
      console.log(`   Error: ${result.error}`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save detailed report
  const reportPath = path.join(__dirname, '..', 'removal_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Run the removal
removeManualAdjustments()
  .then(() => {
    console.log('✅ Removal complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Removal failed:', error);
    process.exit(1);
  });

