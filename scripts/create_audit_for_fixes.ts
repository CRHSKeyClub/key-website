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

async function createAuditRecords() {
  console.log('🔍 Creating audit records for students whose hours were adjusted...\n');

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

  console.log(`✅ Found ${allStudents.length} students\n`);

  const results: Array<{
    studentName: string;
    studentSNumber: string;
    recordsCreated: number;
    success: boolean;
    error?: string;
  }> = [];

  for (const student of allStudents) {
    const dbVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
    const dbSocial = parseFloat(student.social_hours || 0) || 0;
    const dbTotal = parseFloat(student.total_hours || 0) || 0;

    if (dbTotal === 0) continue;

    const studentIdForCSV = student.s_number.toLowerCase().replace(/^s/, '');
    const csvData = csvDataMap.get(studentIdForCSV);
    const csvVolunteering = csvData?.volunteering || 0;
    const csvSocial = csvData?.social || 0;

    // Get all approved requests (excluding auto-created)
    const { data: requests, error: requestsError } = await supabase
      .from('hour_requests')
      .select('id, hours_requested, type, event_name')
      .eq('student_s_number', student.s_number)
      .eq('status', 'approved');

    if (requestsError) continue;

    // Calculate real requests
    let realRequestsVolunteering = 0;
    let realRequestsSocial = 0;

    (requests || []).forEach((req: HourRequest) => {
      const eventName = (req.event_name || '').toLowerCase();
      if (eventName.includes('hours added from other events') || 
          eventName.includes('hours adjustment - added from csv')) {
        return; // Skip these
      }

      const hours = parseFloat(req.hours_requested || 0) || 0;
      const type = (req.type || 'volunteering').toLowerCase();
      if (type === 'volunteering') {
        realRequestsVolunteering += hours;
      } else {
        realRequestsSocial += hours;
      }
    });

    // Expected = real requests + CSV
    const expectedVolunteering = realRequestsVolunteering + csvVolunteering;
    const expectedSocial = realRequestsSocial + csvSocial;

    // Calculate what needs to be added
    const volunteeringToAdd = expectedVolunteering - dbVolunteering;
    const socialToAdd = expectedSocial - dbSocial;

    let recordsCreated = 0;

    // Check if we need to create audit records for CSV hours that aren't in requests
    // Check if there's already a record for CSV hours
    const hasCSVVolunteeringRecord = (requests || []).some((req: HourRequest) => {
      const eventName = (req.event_name || '').toLowerCase();
      return ((eventName.includes('csv') || eventName.includes('from csv') || 
               eventName.includes('hours adjustment - added from csv')) &&
              (req.type || 'volunteering').toLowerCase() === 'volunteering');
    });

    const hasCSVSocialRecord = (requests || []).some((req: HourRequest) => {
      const eventName = (req.event_name || '').toLowerCase();
      return ((eventName.includes('csv') || eventName.includes('from csv') || 
               eventName.includes('hours adjustment - added from csv')) &&
              (req.type || 'volunteering').toLowerCase() === 'social');
    });

    // Create records for CSV hours if they don't exist
    try {
      if (csvVolunteering > 0 && !hasCSVVolunteeringRecord) {
        const { error } = await supabase
          .from('hour_requests')
          .insert([{
            student_s_number: student.s_number.toLowerCase(),
            student_name: student.name || 'Unknown',
            event_name: 'Hours Added from CSV',
            event_date: new Date().toISOString().split('T')[0],
            hours_requested: csvVolunteering,
            description: `These ${csvVolunteering} volunteering hour${csvVolunteering === 1 ? '' : 's'} ${csvVolunteering === 1 ? 'was' : 'were'} added from the master CSV sheet. This record was automatically created to maintain an accurate audit trail.`,
            type: 'volunteering',
            status: 'approved',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'System',
            admin_notes: 'Automatically created audit record for CSV hours'
          }]);

        if (!error) {
          recordsCreated++;
          console.log(`✓ ${student.name} (${student.s_number}): Created CSV record for ${csvVolunteering} volunteering hours`);
        }
      }

      if (csvSocial > 0 && !hasCSVSocialRecord) {
        const { error } = await supabase
          .from('hour_requests')
          .insert([{
            student_s_number: student.s_number.toLowerCase(),
            student_name: student.name || 'Unknown',
            event_name: 'Hours Added from CSV',
            event_date: new Date().toISOString().split('T')[0],
            hours_requested: csvSocial,
            description: `These ${csvSocial} social hour${csvSocial === 1 ? '' : 's'} ${csvSocial === 1 ? 'was' : 'were'} added from the master CSV sheet. This record was automatically created to maintain an accurate audit trail.`,
            type: 'social',
            status: 'approved',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'System',
            admin_notes: 'Automatically created audit record for CSV hours'
          }]);

        if (!error) {
          recordsCreated++;
          console.log(`✓ ${student.name} (${student.s_number}): Created CSV record for ${csvSocial} social hours`);
        }
      }
    } catch (error: any) {
      console.log(`  ❌ Error for ${student.name}: ${error.message}`);
    }

    if (recordsCreated > 0) {
      results.push({
        studentName: student.name || 'Unknown',
        studentSNumber: student.s_number,
        recordsCreated,
        success: true
      });
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 AUDIT RECORDS CREATED');
  console.log('='.repeat(80));

  const totalCreated = results.reduce((sum, r) => sum + r.recordsCreated, 0);

  console.log(`\nTotal students with new audit records: ${results.length}`);
  console.log(`Total audit records created: ${totalCreated}`);

  if (results.length > 0) {
    console.log('\n\n✅ Audit records created:');
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.studentName} (${result.studentSNumber}): ${result.recordsCreated} record(s)`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

createAuditRecords()
  .then(() => {
    console.log('✅ Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });

