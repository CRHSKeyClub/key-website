import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// Simple CLI usage info
function printUsage() {
  console.log(`
Usage:
  node scripts/import_hours_from_csv.mjs /absolute/path/to/hours.csv

Description:
  - Reads your exported Google Sheets CSV of member hours
  - Skips rows with "X" in any column (already processed)
  - Detects S-number, volunteering hours, and social hours columns
  - Connects to Supabase "students" table
  - Sets volunteering_hours and social_hours from CSV
  - Preserves existing hours for students not in CSV (puts them in volunteering_hours)
  - Updates total_hours = volunteering_hours + social_hours

Required environment variables:
  SUPABASE_URL (optional, uses default)
  SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY (optional, uses default)

You can run with:
  SUPABASE_SERVICE_ROLE_KEY=... node scripts/import_hours_from_csv.mjs /path/to/file.csv
`.trim());
}

// Very simple CSV parser (assumes no embedded newlines and minimal quoting)
function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells.map((c) => c.trim());
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function findColumnIndex(headers, candidates) {
  const normalized = headers.map((h) => (h || '').toString().trim().toLowerCase());
  for (const cand of candidates) {
    const idx = normalized.findIndex((h) => h.includes(cand));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Check if row has "X" in the "Added to App" column
function hasXMarker(row, addedToAppIdx) {
  if (addedToAppIdx === -1) return false;
  const val = (row[addedToAppIdx] || '').toString().trim().toUpperCase();
  return val === 'X';
}

async function main() {
  const [, , csvPathArg] = process.argv;

  if (!csvPathArg) {
    printUsage();
    process.exit(1);
  }

  const csvPath = path.isAbsolute(csvPathArg)
    ? csvPathArg
    : path.join(process.cwd(), csvPathArg);

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV file not found at: ${csvPath}`);
    process.exit(1);
  }

  // Try to get from environment, or use defaults from .env.example
  const SUPABASE_URL = process.env.SUPABASE_URL || 
                       process.env.VITE_SUPABASE_URL || 
                       'https://zvoavkzruhnzzeqyihrc.supabase.co';
  
  // Try service role key first, then anon key (which works if RLS allows it)
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
                       process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                       process.env.SUPABASE_ANON_KEY ||
                       process.env.VITE_SUPABASE_ANON_KEY ||
                       'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMTE0OTcsImV4cCI6MjA2NDU4NzQ5N30.YOi2Cu6C7IwlNVpq3WXuhk_euHNg2n8V4BWSAwRleyM';

  if (!SUPABASE_KEY) {
    console.error('❌ Supabase key must be set in your environment.');
    console.error('   You can use VITE_SUPABASE_ANON_KEY (from .env.example) or SUPABASE_SERVICE_ROLE_KEY');
    printUsage();
    process.exit(1);
  }

  console.log('📄 Reading CSV file:', csvPath);
  const rawText = fs.readFileSync(csvPath, 'utf8');
  const { headers, rows } = parseCsv(rawText);

  if (!headers.length || !rows.length) {
    console.error('❌ CSV appears to be empty or malformed.');
    process.exit(1);
  }

  console.log('🔎 Detecting columns from header row:', headers);

  const sNumberIdx = findColumnIndex(headers, [
    'student id',
    'studentid',
    'student id#',
    's-number',
    's number',
    's_number',
    's#',
    'id',
  ]);
  const volunteeringHoursIdx = findColumnIndex(headers, [
    'total hours volunteering',
    'volunteering',
    'volunteer hours',
    'volunteering hours',
    'volunteer',
  ]);
  const socialHoursIdx = findColumnIndex(headers, [
    'total hours social',
    'social',
    'social hours',
  ]);
  const addedToAppIdx = findColumnIndex(headers, [
    'added to app',
    'added',
  ]);
  const nameIdx = findColumnIndex(headers, ['member name', 'name', 'student name', 'full name']);

  if (sNumberIdx === -1) {
    console.error('❌ Could not find S-number / Student ID column. Please check your sheet header row.');
    console.error('   Detected headers:', headers);
    process.exit(1);
  }

  if (volunteeringHoursIdx === -1 && socialHoursIdx === -1) {
    console.error('❌ Could not find Volunteering or Social hours columns.');
    console.error('   Looking for columns like: "volunteering", "volunteer hours", "social", "social hours"');
    console.error('   Detected headers:', headers);
    process.exit(1);
  }

  console.log('✅ Using column indexes:', {
    sNumberIdx,
    volunteeringHoursIdx: volunteeringHoursIdx !== -1 ? volunteeringHoursIdx : 'not found',
    socialHoursIdx: socialHoursIdx !== -1 ? socialHoursIdx : 'not found',
    addedToAppIdx: addedToAppIdx !== -1 ? addedToAppIdx : 'not found',
    nameIdx: nameIdx !== -1 ? nameIdx : 'not found',
  });

  // Normalize rows from CSV, skipping rows with "X" in "Added to App" column
  const parsedRows = [];
  let skippedWithX = 0;
  
  for (const row of rows) {
    if (!row || row.length === 0) continue;

    // Skip rows with "X" in "Added to App" column
    if (hasXMarker(row, addedToAppIdx)) {
      skippedWithX++;
      continue;
    }

    const rawS = row[sNumberIdx];
    const rawVolunteering = volunteeringHoursIdx !== -1 ? row[volunteeringHoursIdx] : '';
    const rawSocial = socialHoursIdx !== -1 ? row[socialHoursIdx] : '';
    const rawName = nameIdx !== -1 ? row[nameIdx] : '';

    let sNumber = (rawS || '').toString().trim().toLowerCase();
    if (!sNumber) continue;

    // Normalize to s123456 format
    if (!sNumber.startsWith('s')) {
      sNumber = 's' + sNumber.replace(/[^0-9]/g, '');
    }

    const parseHours = (val) => {
      if (!val) return 0;
      const parsed = parseFloat(
        val.toString()
          .replace(',', '.')
          .replace(/[^0-9.]/g, '')
      );
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const volunteeringHours = parseHours(rawVolunteering);
    const socialHours = parseHours(rawSocial);

    // Skip if both are 0 (no hours to import)
    if (volunteeringHours === 0 && socialHours === 0) {
      continue;
    }

    parsedRows.push({
      sNumber,
      volunteeringHours,
      socialHours,
      name: (rawName || '').toString().trim(),
      originalSNumber: (rawS || '').toString().trim(),
    });
  }

  if (!parsedRows.length) {
    console.error('❌ No valid rows with S-number and hours found in CSV.');
    console.error(`   Skipped ${skippedWithX} rows with "X" marker.`);
    process.exit(1);
  }

  console.log(`📊 Parsed ${parsedRows.length} valid rows (skipped ${skippedWithX} rows with "X" marker).`);

  // Collapse duplicates by sNumber, keeping the last occurrence
  const bySNumber = {};
  for (const row of parsedRows) {
    bySNumber[row.sNumber] = row;
  }

  const importRows = Object.values(bySNumber);
  console.log(`📊 ${importRows.length} unique students to import from CSV.`);

  // Connect to Supabase
  console.log('🔐 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Fetch ALL students (not just those in CSV) to preserve hours for students not in CSV
  console.log('📥 Fetching ALL students from Supabase (students table)...');
  const { data: allStudents, error: fetchError } = await supabase
    .from('students')
    .select('id, s_number, volunteering_hours, social_hours, name, account_status');

  if (fetchError) {
    console.error('❌ Error fetching students from Supabase:', fetchError.message);
    process.exit(1);
  }

  if (!allStudents || allStudents.length === 0) {
    console.error('❌ No students found in database.');
    process.exit(1);
  }

  console.log(`✅ Found ${allStudents.length} total students in database.`);

  const studentBySNumber = {};
  for (const s of allStudents) {
    if (!s || !s.s_number) continue;
    studentBySNumber[s.s_number.toLowerCase()] = s;
  }

  const missing = [];
  const updates = [];
  const preserved = []; // Students not in CSV, preserving their hours

  // Process students from CSV
  for (const row of importRows) {
    const key = row.sNumber.toLowerCase();
    const student = studentBySNumber[key];
    if (!student) {
      missing.push(row);
      continue;
    }

    const currentVolunteering = parseFloat(student.volunteering_hours || 0);
    const currentSocial = parseFloat(student.social_hours || 0);

    // Use CSV values for volunteering and social hours
    const newVolunteering = row.volunteeringHours;
    const newSocial = row.socialHours;

    updates.push({
      id: student.id,
      sNumber: student.s_number,
      name: student.name,
      account_status: student.account_status,
      currentVolunteering,
      currentSocial,
      newVolunteering,
      newSocial,
    });
  }

  // Process students NOT in CSV - preserve their existing hours (no changes needed)
  const csvSNumbers = new Set(importRows.map((r) => r.sNumber.toLowerCase()));
  for (const [key, student] of Object.entries(studentBySNumber)) {
    if (csvSNumbers.has(key)) continue; // Already processed above

    const currentVolunteering = parseFloat(student.volunteering_hours || 0);
    const currentSocial = parseFloat(student.social_hours || 0);

    // Students not in CSV keep their existing hours (no update needed)
    // We just track them for reporting
    if (currentVolunteering > 0 || currentSocial > 0) {
      preserved.push({
        id: student.id,
        sNumber: student.s_number,
        name: student.name,
        currentVolunteering,
        currentSocial,
      });
    }
  }

  console.log(`✅ Found ${updates.length} matching students in CSV to update.`);
  console.log(`📋 Will preserve hours for ${preserved.length} students not in CSV.`);
  console.log(`⚠️ ${missing.length} s-numbers from the sheet do NOT exist in Supabase.`);

  if (missing.length > 0) {
    console.log('\n⚠️ The following s-numbers were NOT found in Supabase:');
    missing.forEach((m) => {
      console.log(`  - ${m.sNumber} (${m.name || 'no name'})`);
    });
  }

  // Show preview
  if (updates.length > 0) {
    console.log('\n📋 Preview of CSV updates (first 5):');
    updates.slice(0, 5).forEach((u) => {
      console.log(
        `  ${u.sNumber} (${u.name || 'no name'}): Volunteering ${u.currentVolunteering}→${u.newVolunteering}, Social ${u.currentSocial}→${u.newSocial}`
      );
    });
    if (updates.length > 5) {
      console.log(`  ... and ${updates.length - 5} more`);
    }
  }

  if (preserved.length > 0) {
    console.log(`\n📋 Will preserve ${preserved.length} students not in CSV (keeping existing hours)`);
  }

  // Apply updates sequentially
  console.log('\n🚀 Applying hour updates...');
  let successCount = 0;
  let errorCount = 0;

  // Update students from CSV
  for (const u of updates) {
    const updateData = {
      volunteering_hours: u.newVolunteering,
      social_hours: u.newSocial,
    };

    const { error: updateError } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', u.id);

    if (updateError) {
      console.error(
        `❌ Failed to update ${u.sNumber} (${u.name || 'no name'}):`,
        updateError.message
      );
      errorCount++;
    } else {
      console.log(
        `✅ Updated ${u.sNumber} (${u.name || 'no name'}): Volunteering ${u.newVolunteering}, Social ${u.newSocial}`
      );
      successCount++;
    }
  }

  // Students not in CSV keep their existing hours (no update needed)
  // We just report them

  console.log('\n🎉 Done!');
  console.log(`   ✅ Successfully updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount}`);
  }
  if (missing.length > 0) {
    console.log(`   ⚠️  Missing s-numbers: ${missing.length}`);
  }
  console.log(`   📊 CSV students updated: ${updates.length}`);
  console.log(`   📋 Students preserved (not in CSV): ${preserved.length}`);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
