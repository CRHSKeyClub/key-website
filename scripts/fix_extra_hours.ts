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

interface Student {
  id: string;
  s_number: string;
  name: string;
  volunteering_hours: number;
  social_hours: number;
  total_hours: number;
}

interface HourRequest {
  id: string;
  hours_requested: number;
  type: 'volunteering' | 'social';
  event_name: string;
}

interface FixResult {
  studentSNumber: string;
  studentName: string;
  hoursBefore: { volunteering: number; social: number; total: number };
  hoursAfter: { volunteering: number; social: number; total: number };
  expectedHours: { volunteering: number; social: number; total: number };
  autoCreatedRequestsDeleted: number;
  success: boolean;
  error?: string;
}

async function fixExtraHours() {
  console.log('🔍 Finding and fixing students with extra hours...\n');

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

  console.log(`✅ Loaded ${csvDataMap.size} students from CSV\n`);

  // Get all students
  let allStudents: Student[] = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const { data: batch, error } = await supabase
      .from('students')
      .select('id, s_number, name, volunteering_hours, social_hours, total_hours')
      .range(offset, offset + limit - 1)
      .order('name', { ascending: true });

    if (error) throw error;

    if (batch && batch.length > 0) {
      allStudents = allStudents.concat(batch as Student[]);
      offset += limit;
      hasMore = batch.length === limit;
    } else {
      hasMore = false;
    }
  }

  console.log(`✅ Found ${allStudents.length} students in database\n`);

  const fixes: FixResult[] = [];
  let processed = 0;

  for (const student of allStudents) {
    processed++;
    const dbVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
    const dbSocial = parseFloat(student.social_hours || 0) || 0;
    const dbTotal = parseFloat(student.total_hours || 0) || 0;

    const studentIdForCSV = student.s_number.toLowerCase().replace(/^s/, '');
    const csvData = csvDataMap.get(studentIdForCSV);
    const csvVolunteering = csvData?.volunteering || 0;
    const csvSocial = csvData?.social || 0;

    // Get all approved requests
    const { data: requests, error: requestsError } = await supabase
      .from('hour_requests')
      .select('id, hours_requested, type, event_name')
      .eq('student_s_number', student.s_number)
      .eq('status', 'approved');

    if (requestsError) {
      console.log(`   ⚠️  Error for ${student.name}: ${requestsError.message}`);
      continue;
    }

    // Calculate real requests (excluding auto-created)
    let realRequestsVolunteering = 0;
    let realRequestsSocial = 0;
    const autoCreatedRequestIds: string[] = [];

    (requests || []).forEach((req: HourRequest) => {
      const eventName = (req.event_name || '').toLowerCase();
      if (eventName.includes('hours added from other events')) {
        autoCreatedRequestIds.push(req.id);
        return; // Skip auto-created records
      }

      const hours = parseFloat(req.hours_requested || 0) || 0;
      const type = (req.type || 'volunteering').toLowerCase();
      if (type === 'volunteering') {
        realRequestsVolunteering += hours;
      } else {
        realRequestsSocial += hours;
      }
    });

    // Calculate expected hours: Always include CSV hours
    // Expected = Real approved requests + CSV hours
    const expectedVolunteering = realRequestsVolunteering + csvVolunteering;
    const expectedSocial = realRequestsSocial + csvSocial;

    const expectedTotal = expectedVolunteering + expectedSocial;

    // Check if hours need to be fixed
    const volunteeringDiff = Math.abs(dbVolunteering - expectedVolunteering);
    const socialDiff = Math.abs(dbSocial - expectedSocial);
    const totalDiff = Math.abs(dbTotal - expectedTotal);

    if (volunteeringDiff > 0.1 || socialDiff > 0.1 || totalDiff > 0.1) {
      console.log(`\n[${fixes.length + 1}] Fixing: ${student.name} (${student.s_number})`);
      console.log(`   DB: ${dbVolunteering}V / ${dbSocial}S / ${dbTotal}T`);
      console.log(`   Expected: ${expectedVolunteering}V / ${expectedSocial}S / ${expectedTotal}T`);

      try {
        // Delete auto-created requests
        let deletedCount = 0;
        for (const reqId of autoCreatedRequestIds) {
          const { error: deleteError } = await supabase
            .from('hour_requests')
            .delete()
            .eq('id', reqId);

          if (!deleteError) {
            deletedCount++;
          }
        }

        if (deletedCount > 0) {
          console.log(`   ✅ Deleted ${deletedCount} auto-created request(s)`);
        }

        // Calculate hours to add/subtract
        const volunteeringDiff = expectedVolunteering - dbVolunteering;
        const socialDiff = expectedSocial - dbSocial;

        // Update student hours using the service method that creates audit records
        // For adding hours, we'll use updateStudentHours with audit info
        // First, update volunteering hours if needed
        if (Math.abs(volunteeringDiff) > 0.1) {
          await supabase
            .from('students')
            .update({
              volunteering_hours: expectedVolunteering,
              last_hour_update: new Date().toISOString()
            })
            .eq('s_number', student.s_number);

          // Create audit record if hours were added
          if (volunteeringDiff > 0.1) {
            await supabase
              .from('hour_requests')
              .insert([{
                student_s_number: student.s_number.toLowerCase(),
                student_name: student.name || 'Unknown',
                event_name: 'Hours Adjustment - Added from CSV/Other Events',
                event_date: new Date().toISOString().split('T')[0],
                hours_requested: volunteeringDiff,
                description: `Admin adjustment to correct hours. Added ${volunteeringDiff} volunteering hours to match expected total (approved requests + CSV hours). Original: ${dbVolunteering}V, New: ${expectedVolunteering}V.`,
                type: 'volunteering',
                status: 'approved',
                submitted_at: new Date().toISOString(),
                reviewed_at: new Date().toISOString(),
                reviewed_by: 'System',
                admin_notes: 'Automatically adjusted to match expected hours (approved requests + CSV)'
              }]);
          }
        }

        // Update social hours if needed
        if (Math.abs(socialDiff) > 0.1) {
          await supabase
            .from('students')
            .update({
              social_hours: expectedSocial,
              last_hour_update: new Date().toISOString()
            })
            .eq('s_number', student.s_number);

          // Create audit record if hours were added
          if (socialDiff > 0.1) {
            await supabase
              .from('hour_requests')
              .insert([{
                student_s_number: student.s_number.toLowerCase(),
                student_name: student.name || 'Unknown',
                event_name: 'Hours Adjustment - Added from CSV/Other Events',
                event_date: new Date().toISOString().split('T')[0],
                hours_requested: socialDiff,
                description: `Admin adjustment to correct hours. Added ${socialDiff} social hours to match expected total (approved requests + CSV hours). Original: ${dbSocial}S, New: ${expectedSocial}S.`,
                type: 'social',
                status: 'approved',
                submitted_at: new Date().toISOString(),
                reviewed_at: new Date().toISOString(),
                reviewed_by: 'System',
                admin_notes: 'Automatically adjusted to match expected hours (approved requests + CSV)'
              }]);
          }
        }

        // Get updated hours (total_hours is auto-calculated)
        const { data: updatedStudent } = await supabase
          .from('students')
          .select('volunteering_hours, social_hours, total_hours')
          .eq('s_number', student.s_number)
          .single();

        const newVolunteering = updatedStudent?.volunteering_hours || expectedVolunteering;
        const newSocial = updatedStudent?.social_hours || expectedSocial;
        const newTotal = updatedStudent?.total_hours || expectedTotal;

        console.log(`   ✅ Updated to: ${newVolunteering}V / ${newSocial}S / ${newTotal}T`);

        fixes.push({
          studentSNumber: student.s_number,
          studentName: student.name || 'Unknown',
          hoursBefore: { volunteering: dbVolunteering, social: dbSocial, total: dbTotal },
          hoursAfter: { volunteering: newVolunteering, social: newSocial, total: newTotal },
          expectedHours: { volunteering: expectedVolunteering, social: expectedSocial, total: expectedTotal },
          autoCreatedRequestsDeleted: deletedCount,
          success: true
        });

        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: any) {
        console.log(`   ❌ Error: ${error.message}`);
        fixes.push({
          studentSNumber: student.s_number,
          studentName: student.name || 'Unknown',
          hoursBefore: { volunteering: dbVolunteering, social: dbSocial, total: dbTotal },
          hoursAfter: { volunteering: dbVolunteering, social: dbSocial, total: dbTotal },
          expectedHours: { volunteering: expectedVolunteering, social: expectedSocial, total: expectedTotal },
          autoCreatedRequestsDeleted: 0,
          success: false,
          error: error.message
        });
      }
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 FIX SUMMARY');
  console.log('='.repeat(80));

  const totalFixed = fixes.length;
  const successful = fixes.filter(f => f.success).length;
  const failed = fixes.filter(f => !f.success).length;
  const totalRequestsDeleted = fixes.reduce((sum, f) => sum + f.autoCreatedRequestsDeleted, 0);

  console.log(`\nTotal students fixed: ${totalFixed}`);
  console.log(`✅ Successfully fixed: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🗑️  Auto-created requests deleted: ${totalRequestsDeleted}`);

  if (successful > 0) {
    console.log('\n\n✅ Successfully fixed:');
    fixes
      .filter(f => f.success)
      .forEach((fix, index) => {
        console.log(`\n${index + 1}. ${fix.studentName} (${fix.studentSNumber})`);
        console.log(`   Before: ${fix.hoursBefore.volunteering}V / ${fix.hoursBefore.social}S / ${fix.hoursBefore.total}T`);
        console.log(`   After:  ${fix.hoursAfter.volunteering}V / ${fix.hoursAfter.social}S / ${fix.hoursAfter.total}T`);
        console.log(`   Expected: ${fix.expectedHours.volunteering}V / ${fix.expectedHours.social}S / ${fix.expectedHours.total}T`);
        if (fix.autoCreatedRequestsDeleted > 0) {
          console.log(`   Deleted ${fix.autoCreatedRequestsDeleted} auto-created request(s)`);
        }
      });
  }

  if (failed > 0) {
    console.log('\n\n❌ Failed fixes:');
    fixes
      .filter(f => !f.success)
      .forEach((fix, index) => {
        console.log(`\n${index + 1}. ${fix.studentName} (${fix.studentSNumber})`);
        console.log(`   Error: ${fix.error}`);
      });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

fixExtraHours()
  .then(() => {
    console.log('✅ Fix complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fix failed:', error);
    process.exit(1);
  });

