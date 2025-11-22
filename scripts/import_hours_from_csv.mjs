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
  - Detects S-number and hours columns
  - Connects to Supabase "students" table
  - Adds the sheet hours to each student's existing total_hours
  - Prints any s-numbers that do not exist in Supabase

Required environment variables:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY   (or a key with permission to update "students")

You can run with:
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import_hours_from_csv.mjs /path/to/file.csv
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

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment.');
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
    's-number',
    's number',
    's_number',
    's#',
    'id',
  ]);
  const hoursIdx = findColumnIndex(headers, [
    'hours',
    'total hours',
    'service hours',
    'volunteer hours',
  ]);
  const nameIdx = findColumnIndex(headers, ['name', 'student name', 'full name']);

  if (sNumberIdx === -1 || hoursIdx === -1) {
    console.error(
      '❌ Could not find S-number / Student ID and Hours columns. Please check your sheet header row.'
    );
    console.error('   Detected headers:', headers);
    process.exit(1);
  }

  console.log('✅ Using column indexes:', {
    sNumberIdx,
    hoursIdx,
    nameIdx,
  });

  // Normalize rows from CSV
  const parsedRows = [];
  for (const row of rows) {
    if (!row || row.length === 0) continue;

    const rawS = row[sNumberIdx];
    const rawHours = row[hoursIdx];
    const rawName = nameIdx !== -1 ? row[nameIdx] : '';

    let sNumber = (rawS || '').toString().trim().toLowerCase();
    if (!sNumber) continue;

    // Normalize to s123456 format
    if (!sNumber.startsWith('s')) {
      sNumber = 's' + sNumber.replace(/[^0-9]/g, '');
    }

    const hoursVal = parseFloat(
      (rawHours || '')
        .toString()
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
    );
    if (Number.isNaN(hoursVal)) {
      continue;
    }

    parsedRows.push({
      sNumber,
      hoursToAdd: hoursVal,
      name: (rawName || '').toString().trim(),
      originalSNumber: (rawS || '').toString().trim(),
      rawHours,
    });
  }

  if (!parsedRows.length) {
    console.error('❌ No valid rows with S-number and hours found in CSV.');
    process.exit(1);
  }

  // Collapse duplicates by sNumber, keeping the last occurrence
  const bySNumber = {};
  for (const row of parsedRows) {
    bySNumber[row.sNumber] = row;
  }

  const importRows = Object.values(bySNumber);
  console.log(`📊 Parsed ${parsedRows.length} valid rows, ${importRows.length} unique students.`);

  // Connect to Supabase
  console.log('🔐 Connecting to Supabase...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const sNumbers = importRows.map((r) => r.sNumber.toLowerCase());

  console.log('📥 Fetching matching students from Supabase (students table)...');
  const { data: students, error } = await supabase
    .from('students')
    .select('id, s_number, total_hours, name, account_status')
    .in('s_number', sNumbers);

  if (error) {
    console.error('❌ Error fetching students from Supabase:', error.message);
    process.exit(1);
  }

  const studentBySNumber = {};
  for (const s of students || []) {
    if (!s || !s.s_number) continue;
    studentBySNumber[s.s_number.toLowerCase()] = s;
  }

  const missing = [];
  const updates = [];

  for (const row of importRows) {
    const key = row.sNumber.toLowerCase();
    const student = studentBySNumber[key];
    if (!student) {
      missing.push(row);
      continue;
    }

    const current = parseFloat(student.total_hours || 0);
    const toAdd = row.hoursToAdd;
    const newTotal = current + toAdd;

    updates.push({
      id: student.id,
      sNumber: student.s_number,
      name: student.name,
      account_status: student.account_status,
      currentHours: current,
      hoursToAdd: toAdd,
      newTotal,
    });
  }

  console.log(`✅ Found ${updates.length} matching students in Supabase.`);
  console.log(`⚠️ ${missing.length} s-numbers from the sheet do NOT exist in Supabase.`);

  // Apply updates sequentially (safe and simple)
  console.log('🚀 Applying hour updates (adding to existing total_hours)...');
  for (const u of updates) {
    const { error: updateError } = await supabase
      .from('students')
      .update({ total_hours: u.newTotal })
      .eq('id', u.id);

    if (updateError) {
      console.error(
        `❌ Failed to update ${u.sNumber} (${u.name || 'no name'}) -> ${u.newTotal}:`,
        updateError.message
      );
    } else {
      console.log(
        `✅ Updated ${u.sNumber} (${u.name || 'no name'}) from ${u.currentHours} to ${u.newTotal}`
      );
    }
  }

  if (missing.length > 0) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outPath = path.join(__dirname, 'missing_snumbers.json');

    fs.writeFileSync(
      outPath,
      JSON.stringify(
        missing.map((m) => ({
          sNumber: m.sNumber,
          originalSNumber: m.originalSNumber,
          hours: m.hoursToAdd,
          name: m.name,
        })),
        null,
        2
      ),
      'utf8'
    );

    console.log('\n⚠️ The following s-numbers were NOT found in Supabase:');
    missing.forEach((m) => {
      console.log(`  - ${m.sNumber} (${m.name || 'no name'}, hours: ${m.hoursToAdd})`);
    });
    console.log(`\n📁 Full details saved to: ${outPath}`);
  }

  console.log('\n🎉 Done!');
  console.log(
    `   Students updated: ${updates.length}, missing s-numbers: ${missing.length}`
  );
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});



