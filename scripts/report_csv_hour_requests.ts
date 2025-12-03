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
  reviewed_by?: string;
}

interface ReportResult {
  studentId: string;
  studentName: string;
  csvVolunteering: number;
  csvSocial: number;
  csvTotal: number;
  dbVolunteering: number;
  dbSocial: number;
  dbTotal: number;
  matchingRequests: Array<{
    id: string;
    eventName: string;
    hours: number;
    type: string;
    reviewedAt?: string;
    reviewedBy?: string;
    description: string;
  }>;
  totalHoursFromMatchingRequests: { volunteering: number; social: number; total: number };
  wouldRemoveHours: { volunteering: number; social: number; total: number };
  wouldResultInHours: { volunteering: number; social: number; total: number };
  hasMatches: boolean;
  studentExists: boolean;
}

async function reportCSVHourRequests() {
  console.log('🔍 Generating report on hour requests matching CSV hours for X-marked students...\n');
  console.log('ℹ️  This is a READ-ONLY report - no changes will be made.\n');

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
  console.log('🔎 Analyzing hour requests...\n');

  const results: ReportResult[] = [];

  for (const [studentId, csvData] of xMarkedStudents.entries()) {
    const searchSNumber = studentId.toLowerCase();
    const searchSNumberWithPrefix = `s${searchSNumber}`;

    console.log(`[${results.length + 1}/${xMarkedStudents.size}] ${csvData.name} (ID: ${studentId})`);

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

      const student = studentResult.data;
      const studentExists = !!student;

      const dbVolunteering = student ? (parseFloat(student.volunteering_hours || 0) || 0) : 0;
      const dbSocial = student ? (parseFloat(student.social_hours || 0) || 0) : 0;
      const dbTotal = student ? (parseFloat(student.total_hours || 0) || 0) : 0;

      // Get all approved hour requests
      const searchNumber = student?.s_number || searchSNumber;
      const { data: allRequests, error: requestsError } = await supabase
        .from('hour_requests')
        .select('*')
        .or(`student_s_number.eq.${searchSNumber},student_s_number.eq.${searchSNumberWithPrefix}`)
        .eq('status', 'approved')
        .order('reviewed_at', { ascending: false });

      if (requestsError) {
        console.log(`   ❌ Error: ${requestsError.message}\n`);
        results.push({
          studentId,
          studentName: csvData.name,
          csvVolunteering: csvData.volunteering,
          csvSocial: csvData.social,
          csvTotal: csvData.volunteering + csvData.social,
          dbVolunteering: 0,
          dbSocial: 0,
          dbTotal: 0,
          matchingRequests: [],
          totalHoursFromMatchingRequests: { volunteering: 0, social: 0, total: 0 },
          wouldRemoveHours: { volunteering: 0, social: 0, total: 0 },
          wouldResultInHours: { volunteering: 0, social: 0, total: 0 },
          hasMatches: false,
          studentExists: false
        });
        continue;
      }

      const requests = (allRequests || []) as HourRequest[];

      // Find requests that match CSV hours
      const matchingRequests: Array<{
        id: string;
        eventName: string;
        hours: number;
        type: string;
        reviewedAt?: string;
        reviewedBy?: string;
        description: string;
      }> = [];

      requests.forEach(req => {
        const hours = parseFloat(req.hours_requested || 0) || 0;
        const type = (req.type || 'volunteering').toLowerCase();
        
        // Match volunteering hours
        if (type === 'volunteering' && Math.abs(hours - csvData.volunteering) < 0.01 && csvData.volunteering > 0) {
          matchingRequests.push({
            id: req.id,
            eventName: req.event_name || 'Unknown',
            hours,
            type: 'volunteering',
            reviewedAt: req.reviewed_at || undefined,
            reviewedBy: req.reviewed_by || undefined,
            description: req.description || ''
          });
        }
        // Match social hours
        else if (type === 'social' && Math.abs(hours - csvData.social) < 0.01 && csvData.social > 0) {
          matchingRequests.push({
            id: req.id,
            eventName: req.event_name || 'Unknown',
            hours,
            type: 'social',
            reviewedAt: req.reviewed_at || undefined,
            reviewedBy: req.reviewed_by || undefined,
            description: req.description || ''
          });
        }
      });

      // Calculate totals from matching requests
      const totalFromMatching = {
        volunteering: matchingRequests.filter(r => r.type === 'volunteering').reduce((sum, r) => sum + r.hours, 0),
        social: matchingRequests.filter(r => r.type === 'social').reduce((sum, r) => sum + r.hours, 0),
        total: matchingRequests.reduce((sum, r) => sum + r.hours, 0)
      };

      // Calculate what hours would be removed
      const wouldRemoveHours = { ...totalFromMatching };

      // Calculate what the hours would be after removal
      const wouldResultInHours = {
        volunteering: Math.max(0, dbVolunteering - wouldRemoveHours.volunteering),
        social: Math.max(0, dbSocial - wouldRemoveHours.social),
        total: Math.max(0, dbTotal - wouldRemoveHours.total)
      };

      const hasMatches = matchingRequests.length > 0;

      if (hasMatches) {
        console.log(`   ⚠️  FOUND ${matchingRequests.length} matching request(s):`);
        matchingRequests.forEach(req => {
          const date = req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : 'Unknown date';
          console.log(`      - ${req.eventName}: ${req.hours} ${req.type} (reviewed: ${date})`);
        });
        console.log(`   CSV: ${csvData.volunteering}V / ${csvData.social}S | DB: ${dbVolunteering}V / ${dbSocial}S`);
        console.log(`   Would remove: ${wouldRemoveHours.volunteering}V / ${wouldRemoveHours.social}S`);
        console.log(`   Would result in: ${wouldResultInHours.volunteering}V / ${wouldResultInHours.social}S / ${wouldResultInHours.total}T\n`);
      } else {
        console.log(`   ✅ No matching requests found\n`);
      }

      results.push({
        studentId,
        studentName: csvData.name,
        csvVolunteering: csvData.volunteering,
        csvSocial: csvData.social,
        csvTotal: csvData.volunteering + csvData.social,
        dbVolunteering,
        dbSocial,
        dbTotal,
        matchingRequests,
        totalHoursFromMatchingRequests: totalFromMatching,
        wouldRemoveHours,
        wouldResultInHours,
        hasMatches,
        studentExists
      });

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 50));

    } catch (error: any) {
      console.log(`   ❌ Exception: ${error.message}\n`);
      results.push({
        studentId,
        studentName: csvData.name,
        csvVolunteering: csvData.volunteering,
        csvSocial: csvData.social,
        csvTotal: csvData.volunteering + csvData.social,
        dbVolunteering: 0,
        dbSocial: 0,
        dbTotal: 0,
        matchingRequests: [],
        totalHoursFromMatchingRequests: { volunteering: 0, social: 0, total: 0 },
        wouldRemoveHours: { volunteering: 0, social: 0, total: 0 },
        wouldResultInHours: { volunteering: 0, social: 0, total: 0 },
        hasMatches: false,
        studentExists: false
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 REPORT SUMMARY');
  console.log('='.repeat(80));

  const total = results.length;
  const withMatches = results.filter(r => r.hasMatches).length;
  const studentsInDB = results.filter(r => r.studentExists).length;
  const totalMatchingRequests = results.reduce((sum, r) => sum + r.matchingRequests.length, 0);
  const totalHoursToRemove = results.reduce((sum, r) => {
    return {
      volunteering: sum.volunteering + r.wouldRemoveHours.volunteering,
      social: sum.social + r.wouldRemoveHours.social,
      total: sum.total + r.wouldRemoveHours.total
    };
  }, { volunteering: 0, social: 0, total: 0 });

  console.log(`\nTotal X-marked students: ${total}`);
  console.log(`Students in database: ${studentsInDB}`);
  console.log(`Students with matching requests: ${withMatches}`);
  console.log(`Total matching requests found: ${totalMatchingRequests}`);
  console.log(`\nTotal hours that would be removed:`);
  console.log(`   Volunteering: ${totalHoursToRemove.volunteering}`);
  console.log(`   Social: ${totalHoursToRemove.social}`);
  console.log(`   Total: ${totalHoursToRemove.total}`);

  if (withMatches > 0) {
    console.log('\n\n' + '⚠️ '.repeat(40));
    console.log('STUDENTS WITH MATCHING REQUESTS (would be removed):');
    console.log('⚠️ '.repeat(40) + '\n');

    results
      .filter(r => r.hasMatches)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.studentName} (ID: ${result.studentId})`);
        console.log(`   CSV Hours: ${result.csvVolunteering}V / ${result.csvSocial}S / ${result.csvTotal}T`);
        console.log(`   Current DB Hours: ${result.dbVolunteering}V / ${result.dbSocial}S / ${result.dbTotal}T`);
        console.log(`   Matching Requests (${result.matchingRequests.length}):`);
        result.matchingRequests.forEach((req, i) => {
          const date = req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : 'Unknown';
          console.log(`     ${i + 1}. ${req.eventName}`);
          console.log(`        Hours: ${req.hours} ${req.type}`);
          console.log(`        Reviewed: ${date} by ${req.reviewedBy || 'Unknown'}`);
        });
        console.log(`   Would Remove: ${result.wouldRemoveHours.volunteering}V / ${result.wouldRemoveHours.social}S / ${result.wouldRemoveHours.total}T`);
        console.log(`   Would Result In: ${result.wouldResultInHours.volunteering}V / ${result.wouldResultInHours.social}S / ${result.wouldResultInHours.total}T`);
      });
  } else {
    console.log('\n✅ No matching requests found - all X-marked students are clean!');
  }

  // Students in DB but no matches
  const studentsInDBNoMatches = results.filter(r => r.studentExists && !r.hasMatches && r.dbTotal > 0);
  if (studentsInDBNoMatches.length > 0) {
    console.log('\n\n' + 'ℹ️ '.repeat(40));
    console.log('STUDENTS IN DB WITH HOURS (but no matching CSV requests):');
    console.log('ℹ️ '.repeat(40) + '\n');
    
    studentsInDBNoMatches.forEach((result, index) => {
      console.log(`${index + 1}. ${result.studentName} (ID: ${result.studentId})`);
      console.log(`   CSV: ${result.csvVolunteering}V / ${result.csvSocial}S | DB: ${result.dbVolunteering}V / ${result.dbSocial}S / ${result.dbTotal}T`);
    });
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save report
  const reportPath = path.join(__dirname, '..', 'csv_requests_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Run
reportCSVHourRequests()
  .then(() => {
    console.log('✅ Report complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Report failed:', error);
    process.exit(1);
  });




