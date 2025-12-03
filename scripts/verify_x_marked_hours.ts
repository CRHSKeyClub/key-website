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

interface VerificationResult {
  studentId: string;
  name: string;
  csvVolunteeringHours: number;
  csvSocialHours: number;
  csvTotalHours: number;
  dbVolunteeringHours: number;
  dbSocialHours: number;
  dbTotalHours: number;
  hasIssue: boolean;
  issueDescription?: string;
}

async function verifyHoursNotAdded() {
  console.log('🔍 Starting verification of hours marked with X in "Added to App" column...\n');

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'Master Sheet KC Hours 25-26 - Sheet1.csv');
  console.log(`📄 Reading CSV file: ${csvPath}`);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV (skip first row which is header)
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CSVRow[];

  console.log(`✅ Found ${records.length} rows in CSV\n`);

  // Filter rows with 'X' in "Added to App" column
  const xMarkedRows = records.filter(row => {
    const addedToApp = (row['Added to App'] || '').trim().toUpperCase();
    return addedToApp === 'X';
  });

  console.log(`📍 Found ${xMarkedRows.length} rows marked with X in "Added to App" column\n`);
  console.log('🔎 Verifying these hours were NOT added to Supabase...\n');

  const results: VerificationResult[] = [];
  let processed = 0;

  for (const row of xMarkedRows) {
    processed++;
    const studentId = (row['Student ID#'] || '').trim();
    const name = (row['Member Name'] || '').trim();
    
    if (!studentId || studentId === '') {
      console.log(`⚠️  Row ${processed}: Skipping - no Student ID# (Name: ${name})`);
      continue;
    }

    // Parse hours from CSV
    const csvVolunteering = parseFloat(row['Total Hours Volunteering'] || '0') || 0;
    const csvSocial = parseFloat(row['Total Hours Social'] || '0') || 0;
    const csvTotal = csvVolunteering + csvSocial;

    console.log(`\n[${processed}/${xMarkedRows.length}] Checking: ${name} (ID: ${studentId})`);
    console.log(`   CSV Hours - Volunteering: ${csvVolunteering}, Social: ${csvSocial}, Total: ${csvTotal}`);

    // Query Supabase for student (try both with and without 's' prefix)
    try {
      let student = null;
      let error = null;
      
      // Try with the student ID as-is (lowercase)
      let result = await supabase
        .from('students')
        .select('s_number, name, volunteering_hours, social_hours, total_hours')
        .eq('s_number', studentId.toLowerCase())
        .maybeSingle();
      
      student = result.data;
      error = result.error;
      
      // If not found, try with 's' prefix
      if (!student && !error) {
        result = await supabase
          .from('students')
          .select('s_number, name, volunteering_hours, social_hours, total_hours')
          .eq('s_number', `s${studentId.toLowerCase()}`)
          .maybeSingle();
        
        student = result.data;
        error = result.error;
      }

      if (error) {
        console.log(`   ❌ Error querying Supabase: ${error.message}`);
        results.push({
          studentId,
          name,
          csvVolunteeringHours: csvVolunteering,
          csvSocialHours: csvSocial,
          csvTotalHours: csvTotal,
          dbVolunteeringHours: 0,
          dbSocialHours: 0,
          dbTotalHours: 0,
          hasIssue: true,
          issueDescription: `Error querying: ${error.message}`
        });
        continue;
      }

      if (!student) {
        console.log(`   ✅ Student not found in database (expected - hours should not be added)`);
        results.push({
          studentId,
          name,
          csvVolunteeringHours: csvVolunteering,
          csvSocialHours: csvSocial,
          csvTotalHours: csvTotal,
          dbVolunteeringHours: 0,
          dbSocialHours: 0,
          dbTotalHours: 0,
          hasIssue: false
        });
        continue;
      }

      // Student exists, check hours
      const dbVolunteering = parseFloat(student.volunteering_hours || 0) || 0;
      const dbSocial = parseFloat(student.social_hours || 0) || 0;
      const dbTotal = parseFloat(student.total_hours || 0) || 0;

      console.log(`   DB Hours - Volunteering: ${dbVolunteering}, Social: ${dbSocial}, Total: ${dbTotal}`);

      // Check if hours match exactly (this would be a problem - means hours were added)
      const volunteeringMatch = Math.abs(dbVolunteering - csvVolunteering) < 0.01;
      const socialMatch = Math.abs(dbSocial - csvSocial) < 0.01;
      const totalMatch = Math.abs(dbTotal - csvTotal) < 0.01;

      let hasIssue = false;
      let issueDescription = '';

      // Flag if student exists with ANY hours when they shouldn't (marked with X)
      // The X means these hours should NOT have been added from this CSV
      if (dbTotal > 0) {
        // Check if hours match exactly or are very close (which suggests CSV hours were added)
        if (volunteeringMatch && csvVolunteering > 0) {
          hasIssue = true;
          issueDescription += `⚠️ Volunteering hours match CSV exactly (${csvVolunteering}), but should NOT be added. `;
        } else if (socialMatch && csvSocial > 0) {
          hasIssue = true;
          issueDescription += `⚠️ Social hours match CSV exactly (${csvSocial}), but should NOT be added. `;
        } else if (totalMatch && csvTotal > 0) {
          hasIssue = true;
          issueDescription += `⚠️ Total hours match CSV exactly (${csvTotal}), but should NOT be added. `;
        } else {
          // Check if DB hours could contain CSV hours (e.g., DB = existing + CSV)
          // If DB hours are >= CSV hours, there's a possibility the CSV hours were added
          if (dbVolunteering >= csvVolunteering && csvVolunteering > 0) {
            issueDescription += `⚠️ Student exists with ${dbVolunteering} volunteering hours (CSV: ${csvVolunteering}). May need manual verification. `;
          }
          if (dbSocial >= csvSocial && csvSocial > 0) {
            issueDescription += `⚠️ Student exists with ${dbSocial} social hours (CSV: ${csvSocial}). May need manual verification. `;
          }
          if (dbTotal >= csvTotal && csvTotal > 0 && !hasIssue) {
            // Flag as issue if DB total is >= CSV total (could mean CSV hours were added)
            // But only flag if it's suspiciously close
            const diff = Math.abs(dbTotal - csvTotal);
            if (diff < csvTotal * 2) { // If DB is within 2x of CSV, might be related
              hasIssue = true;
            }
          }
        }
      }

      // Also check if hours are very close (within 0.5 hours) which might indicate partial addition
      if (!hasIssue && csvTotal > 0 && dbTotal > 0) {
        const volunteeringDiff = Math.abs(dbVolunteering - csvVolunteering);
        const socialDiff = Math.abs(dbSocial - csvSocial);
        const totalDiff = Math.abs(dbTotal - csvTotal);

        if (volunteeringDiff < 0.5 && csvVolunteering > 0 && dbVolunteering > 0) {
          hasIssue = true;
          issueDescription += `Volunteering hours very close to CSV (diff: ${volunteeringDiff.toFixed(2)}), possible addition. `;
        }

        if (socialDiff < 0.5 && csvSocial > 0 && dbSocial > 0) {
          hasIssue = true;
          issueDescription += `Social hours very close to CSV (diff: ${socialDiff.toFixed(2)}), possible addition. `;
        }

        if (totalDiff < 0.5 && csvTotal > 0 && dbTotal > 0) {
          hasIssue = true;
          issueDescription += `Total hours very close to CSV (diff: ${totalDiff.toFixed(2)}), possible addition. `;
        }
      }

      if (hasIssue) {
        console.log(`   ⚠️  ISSUE DETECTED: ${issueDescription.trim()}`);
      } else if (dbTotal > 0) {
        console.log(`   ⚠️  NOTE: Student exists with ${dbTotal} hours in DB, but CSV hours (${csvTotal}) differ. May need manual verification to ensure CSV hours were not added.`);
        // Don't mark as hasIssue, but add note
        issueDescription = `Student exists in DB with ${dbTotal} hours (CSV: ${csvTotal}). Numbers differ, but manual verification recommended.`;
      } else {
        console.log(`   ✅ OK - Student not found or has 0 hours (expected for X-marked entries)`);
      }

      results.push({
        studentId,
        name,
        csvVolunteeringHours: csvVolunteering,
        csvSocialHours: csvSocial,
        csvTotalHours: csvTotal,
        dbVolunteeringHours: dbVolunteering,
        dbSocialHours: dbSocial,
        dbTotalHours: dbTotal,
        hasIssue,
        issueDescription: hasIssue ? issueDescription.trim() : undefined
      });

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error: any) {
      console.log(`   ❌ Exception: ${error.message}`);
      results.push({
        studentId,
        name,
        csvVolunteeringHours: csvVolunteering,
        csvSocialHours: csvSocial,
        csvTotalHours: csvTotal,
        dbVolunteeringHours: 0,
        dbSocialHours: 0,
        dbTotalHours: 0,
        hasIssue: true,
        issueDescription: `Exception: ${error.message}`
      });
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(80));

  const totalChecked = results.length;
  const withIssues = results.filter(r => r.hasIssue).length;
  const withoutIssues = totalChecked - withIssues;

  console.log(`\nTotal entries checked: ${totalChecked}`);
  console.log(`✅ Entries without issues: ${withoutIssues}`);
  console.log(`⚠️  Entries with issues: ${withIssues}`);

  if (withIssues > 0) {
    console.log('\n' + '⚠️ '.repeat(40));
    console.log('ISSUES FOUND - The following students have hours that may have been incorrectly added:');
    console.log('⚠️ '.repeat(40) + '\n');

    results
      .filter(r => r.hasIssue)
      .forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.name} (ID: ${result.studentId})`);
        console.log(`   CSV Hours: Volunteering=${result.csvVolunteeringHours}, Social=${result.csvSocialHours}, Total=${result.csvTotalHours}`);
        console.log(`   DB Hours:  Volunteering=${result.dbVolunteeringHours}, Social=${result.dbSocialHours}, Total=${result.dbTotalHours}`);
        console.log(`   Issue: ${result.issueDescription}`);
      });
  } else {
    console.log('\n✅ All entries verified! No hours were incorrectly added for X-marked entries.');
  }

  console.log('\n' + '='.repeat(80) + '\n');

  // Save detailed report to file
  const reportPath = path.join(__dirname, '..', 'verification_report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

// Run the verification
verifyHoursNotAdded()
  .then(() => {
    console.log('✅ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });

