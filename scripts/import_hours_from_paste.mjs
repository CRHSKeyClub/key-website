import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

// Supabase URL from the codebase
const SUPABASE_URL = 'https://zvoavkzruhnzzeqyihrc.supabase.co';

// Simple CSV parser (handles quoted fields and commas)
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
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY must be set in your environment.');
    console.error('   You can get it from: Supabase Dashboard → Settings → API → service_role key');
    console.error('\n   Run with: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/import_hours_from_paste.mjs');
    process.exit(1);
  }

  console.log('📋 Paste your CSV data below (press Ctrl+D or Ctrl+Z when done):\n');

  // Read from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  const lines = [];
  for await (const line of rl) {
    lines.push(line);
  }

  if (lines.length === 0) {
    console.error('❌ No CSV data provided.');
    process.exit(1);
  }

  const rawText = lines.join('\n');
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
    nameIdx: nameIdx !== -1 ? nameIdx : 'not found',
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

  if (missing.length > 0) {
    console.log('\n⚠️ The following s-numbers were NOT found in Supabase:');
    missing.forEach((m) => {
      console.log(`  - ${m.sNumber} (${m.name || 'no name'}, hours: ${m.hoursToAdd})`);
    });
  }

  if (updates.length === 0) {
    console.log('\n❌ No students to update. Exiting.');
    process.exit(1);
  }

  // Show preview
  console.log('\n📋 Preview of updates (first 10):');
  updates.slice(0, 10).forEach((u) => {
    console.log(
      `  ${u.sNumber} (${u.name || 'no name'}): ${u.currentHours} → ${u.newTotal} (+${u.hoursToAdd})`
    );
  });
  if (updates.length > 10) {
    console.log(`  ... and ${updates.length - 10} more`);
  }

  // Ask for confirmation
  console.log(`\n⚠️  This will add hours to ${updates.length} students.`);
  console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Apply updates sequentially (safe and simple)
  console.log('🚀 Applying hour updates (adding to existing total_hours)...');
  let successCount = 0;
  let errorCount = 0;

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
      errorCount++;
    } else {
      console.log(
        `✅ Updated ${u.sNumber} (${u.name || 'no name'}) from ${u.currentHours} to ${u.newTotal}`
      );
      successCount++;
    }
  }

  console.log('\n🎉 Done!');
  console.log(`   ✅ Successfully updated: ${successCount}`);
  if (errorCount > 0) {
    console.log(`   ❌ Errors: ${errorCount}`);
  }
  if (missing.length > 0) {
    console.log(`   ⚠️  Missing s-numbers: ${missing.length}`);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});

