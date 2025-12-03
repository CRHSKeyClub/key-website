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
}

interface RemovalResult {
  studentId: string;
  studentName: string;
  csvVolunteering: number;
  csvSocial: number;
  requestsRemoved: Array<{
    id: string;
    eventName: string;
    hours: number;
    type: string;
  }>;
  hoursBefore: { volunteering: number; social: number; total: number };
  hoursAfter: { volunteering: number; social: number; total: number };
  success: boolean;
  error?: string;
}

async function removeCSVHourRequests() {
  console.log('🔍 Starting removal of hour requests matching CSV hours for X-marked students...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  console.log(`📄 Reading CSV file...`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  // Get all X-marked students with their CSV hours
  const xMarkedStudents = new Map<string, { name: string; volunteering: number; social: number }>();
  
  records.forEach(row => {
    const addedToApp = (row['Added to App'] || '').trim().toUpperCase();
    if (addedToApp === 'X') {
      const studentId = (row['Student ID#'] || '').trim();
      if (studentId) {
        const volunteering = parseFloat(row['Total Hours Volunteering'] || '0') || 0;
        const social = parseFloat(row['Total Hours Social'] || '0') || 0;
        xMarkedStudents.set(studentId.toLowerCase(), {
          name: (row['Member Name'] || '').trim(),
          volunteering,
          social
        });
      }
    }
  });

  console.log(`📍 Found ${xMarkedStudents.size} X-marked students in CSV\n`);
  console.log('🔎 Finding and removing matching hour requests...\n');

  const results: RemovalResult[] = [];

  for (const [studentId, csvData] of xMarkedStudents.entries()) {
    const searchSNumber = studentId.toLowerCase();
    const searchSNumberWithPrefix = `s${searchSNumber}`;

    console.log(`\n[${results.length + 1}/${xMarkedStudents.size}] Processing: ${csvData.name} (ID: ${studentId})`);
    console.log(`   CSV Hours: ${csvData.volunteering}V / ${csvData.social}S`);

    try {
      // Get student
      let studentResult = await supabase
        .from('students')
        .select('s_number, name, volunteering_hours, social_hours, total_hours')
        .eq('s_number', searchSNumber)
        .maybeSingle();

      if (!studentResult.data && !studentResult.error) {
        studentResult = await supabase
          .from('students')
          .select('s_number, name, volunteering_hours, social_hours, total_hours')
          .eq('s_number', searchSNumberWithPrefix)
          .maybeSingle();
      }

      if (studentResult.error) {
        console.log(`   ❌ Error fetching student: ${studentResult.error.message}`);
        results.push({
          studentId,
          studentName: csvData.name,
          csvVolunteering: csvData.volunteering,
          csvSocial: csvData.social,
          requestsRemoved: [],
          hoursBefore: { volunteering: 0, social: 0, total: 0 },
          hoursAfter: { volunteering: 0, social: 0, total: 0 },
          success: false,
          error: studentResult.error.message
        });
        continue;
      }

      const student = studentResult.data;
      if (!student) {
        console.log(`   ✅ Student not in database, checking for hour requests...`);
        
        // Still check for hour requests
        const { data: requests } = await supabase
          .from('hour_requests')
          .select('*')
          .or(`student_s_number.eq.${searchSNumber},student_s_number.eq.${searchSNumberWithPrefix}`)
          .eq('status', 'approved');

        if (requests && requests.length > 0) {
          // Remove requests that match CSV hours
          const matchingRequests = requests.filter(req => {
            const hours = parseFloat(req.hours_requested || 0) || 0;
            const type = (req.type || 'volunteering').toLowerCase();
            
            if (type === 'volunteering' && Math.abs(hours - csvData.volunteering) < 0.01 && csvData.volunteering > 0) {
              return true;
            }
            if (type === 'social' && Math.abs(hours - csvData.social) < 0.01 && csvData.social > 0) {
              return true;
            }
            return false;
          });

          if (matchingRequests.length > 0) {
            console.log(`   ⚠️  Found ${matchingRequests.length} matching request(s) - removing...`);
            for (const req of matchingRequests) {
              await supabase.from('hour_requests').delete().eq('id', req.id);
              console.log(`      ✓ Removed: ${req.event_name} (${req.hours_requested} ${req.type})`);
            }
          }
        }
        
        results.push({
          studentId,
          studentName: csvData.name,
          csvVolunteering: csvData.volunteering,
          csvSocial: csvData.social,
          requestsRemoved: [],
          hoursBefore: { volunteering: 0, social: 0, total: 0 },
          hoursAfter: { volunteering: 0, social: 0, total: 0 },
          success: true
        });
        continue;
      }

      const hoursBefore = {
        volunteering: parseFloat(student.volunteering_hours || 0) || 0,
        social: parseFloat(student.social_hours || 0) || 0,
        total: parseFloat(student.total_hours || 0) || 0
      };

      console.log(`   Current DB Hours: ${hoursBefore.volunteering}V / ${hoursBefore.social}S / ${hoursBefore.total}T`);

      // Get all approved hour requests
      const { data: allRequests, error: requestsError } = await supabase
        .from('hour_requests')
        .select('*')
        .eq('student_s_number', student.s_number)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });

      if (requestsError) {
        console.log(`   ❌ Error fetching requests: ${requestsError.message}`);
        results.push({
          studentId,
          studentName: csvData.name,
          csvVolunteering: csvData.volunteering,
          csvSocial: csvData.social,
          requestsRemoved: [],
          hoursBefore,
          hoursAfter: hoursBefore,
          success: false,
          error: requestsError.message
        });
        continue;
      }

      const requests = (allRequests || []) as HourRequest[];
      console.log(`   📋 Found ${requests.length} approved hour request(s)`);

      // Find requests that match CSV hours
      const requestsToRemove: HourRequest[] = [];
      
      // Check for exact matches
      requests.forEach(req => {
        const hours = parseFloat(req.hours_requested || 0) || 0;
        const type = (req.type || 'volunteering').toLowerCase();
        
        // Match volunteering hours
        if (type === 'volunteering' && Math.abs(hours - csvData.volunteering) < 0.01 && csvData.volunteering > 0) {
          requestsToRemove.push(req);
        }
        // Match social hours
        else if (type === 'social' && Math.abs(hours - csvData.social) < 0.01 && csvData.social > 0) {
          requestsToRemove.push(req);
        }
      });

      if (requestsToRemove.length === 0) {
        console.log(`   ✅ No matching requests found`);
        results.push({
          studentId,
          studentName: csvData.name,
          csvVolunteering: csvData.volunteering,
          csvSocial: csvData.social,
          requestsRemoved: [],
          hoursBefore,
          hoursAfter: hoursBefore,
          success: true
        });
        continue;
      }

      console.log(`   🎯 Found ${requestsToRemove.length} matching request(s) to remove:`);

      // Calculate hours to subtract
      let hoursToSubtract = { volunteering: 0, social: 0 };

      // Remove requests and subtract hours
      const removedRequests: Array<{ id: string; eventName: string; hours: number; type: string }> = [];

      for (const req of requestsToRemove) {
        const hours = parseFloat(req.hours_requested || 0) || 0;
        const type = (req.type || 'volunteering').toLowerCase();
        
        console.log(`      - ${req.event_name}: ${hours} ${type}`);
        
        // Delete the request
        const deleteResult = await supabase
          .from('hour_requests')
          .delete()
          .eq('id', req.id);

        if (deleteResult.error) {
          console.log(`        ❌ Error deleting: ${deleteResult.error.message}`);
          continue;
        }

        removedRequests.push({
          id: req.id,
          eventName: req.event_name || 'Unknown',
          hours,
          type
        });

        // Track hours to subtract
        if (type === 'volunteering') {
          hoursToSubtract.volunteering += hours;
        } else if (type === 'social') {
          hoursToSubtract.social += hours;
        }
      }

      // Update student hours
      const newVolunteering = Math.max(0, hoursBefore.volunteering - hoursToSubtract.volunteering);
      const newSocial = Math.max(0, hoursBefore.social - hoursToSubtract.social);

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
        console.log(`   ❌ Error updating hours: ${updateResult.error.message}`);
        results.push({
          studentId,
          studentName: csvData.name,
          csvVolunteering: csvData.volunteering,
          csvSocial: csvData.social,
          requestsRemoved: removedRequests,
          hoursBefore,
          hoursAfter: hoursBefore,
          success: false,
          error: updateResult.error.message
        });
        continue;
      }

      const updatedStudent = updateResult.data?.[0];
      const hoursAfter = {
        volunteering: newVolunteering,
        social: newSocial,
        total: parseFloat(updatedStudent?.total_hours || 0) || (newVolunteering + newSocial)
      };

      console.log(`   ✅ Removed ${removedRequests.length} request(s)`);
      console.log(`   New hours: ${hoursAfter.volunteering}V / ${hoursAfter.social}S / ${hoursAfter.total}T`);

      results.push({
        studentId,
        studentName: csvData.name,
        csvVolunteering: csvData.volunteering,
        csvSocial: csvData.social,
        requestsRemoved: removedRequests,
        hoursBefore,
        hoursAfter,
        success: true
      });

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ Exception: ${error.message}`);
      results.push({
        studentId,
        studentName: csvData.name,
        csvVolunteering: csvData.volunteering,
        csvSocial: csvData.social,
        requestsRemoved: [],
        hoursBefore: { volunteering: 0, social: 0, total: 0 },
        hoursAfter: { volunteering: 0, social: 0, total: 0 },
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 REMOVAL SUMMARY');
  console.log('='.repeat(80));

  const total = results.length;
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const withRemovals = results.filter(r => r.requestsRemoved.length > 0).length;
  const totalRequestsRemoved = results.reduce((sum, r) => sum + r.requestsRemoved.length, 0);

  console.log(`\nTotal students processed: ${total}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📋 Students with requests removed: ${withRemovals}`);
  console.log(`🗑️  Total requests removed: ${totalRequestsRemoved}`);

  if (withRemovals > 0) {
    console.log('\n' + '📋 '.repeat(40));
    console.log('REQUESTS REMOVED:');
    console.log('📋 '.repeat(40) + '\n');

    results
      .filter(r => r.requestsRemoved.length > 0)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (ID: ${result.studentId})`);
        console.log(`   CSV Hours: ${result.csvVolunteering}V / ${result.csvSocial}S`);
        console.log(`   Before: ${result.hoursBefore.volunteering}V / ${result.hoursBefore.social}S / ${result.hoursBefore.total}T`);
        console.log(`   After:  ${result.hoursAfter.volunteering}V / ${result.hoursAfter.social}S / ${result.hoursAfter.total}T`);
        console.log(`   Removed ${result.requestsRemoved.length} request(s):`);
        result.requestsRemoved.forEach(req => {
          console.log(`     - ${req.eventName}: ${req.hours} ${req.type}`);
        });
      });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save report
  const reportPath = path.join(__dirname, '..', 'csv_requests_removal_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Run
removeCSVHourRequests()
  .then(() => {
    console.log('✅ Removal complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Removal failed:', error);
    process.exit(1);
  });



