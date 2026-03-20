/**
 * Import attendance records from a CSV export into:
 * - `meetings` (created if missing, one per meeting_date)
 * - `meeting_attendance` (one per student per meeting)
 *
 * Designed for Google Form exports like:
 * Timestamp,First Name,Last Name,S Number (No s),What did we talk about?
 *
 * Run:
 *   npx tsx scripts/import_attendance_from_csv.ts "<csv_file_path>"
 *
 * Example:
 *   npx tsx scripts/import_attendance_from_csv.ts "March 17th Meeting Attendance Form (Responses) - Form Responses 1.csv"
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  'https://zvoavkzruhnzzeqyihrc.supabase.co';

const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  // NOTE: This repo already uses a service role key in other scripts.
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

type CsvRow = Record<string, string>;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toMeetingDateFromTimestamp(timestamp: string): string {
  // Expected: "3/17/2026 7:25:58" (or similar)
  const trimmed = (timestamp || '').trim();
  if (!trimmed) throw new Error('Missing Timestamp');

  const [datePart, timePart = '00:00:00'] = trimmed.split(' ');
  const [m, d, y] = datePart.split('/').map((x) => x.trim());
  if (!m || !d || !y) throw new Error(`Unrecognized timestamp date format: ${timestamp}`);

  const mm = Number(m);
  const dd = Number(d);
  const yyyy = Number(y);
  if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) {
    throw new Error(`Unrecognized timestamp date format: ${timestamp}`);
  }

  // meeting_date is just YYYY-MM-DD
  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
}

function toStudentSNumber(raw: string): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if (s.toLowerCase().startsWith('s')) return s.toLowerCase();
  // CSV is "S Number (No s)" so add leading s
  return `s${s}`.toLowerCase();
}

async function getOrCreateMeeting(meetingDate: string) {
  const { data: existing, error: existingError } = await supabase
    .from('meetings')
    .select('id')
    .eq('meeting_date', meetingDate)
    .limit(1);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) return existing[0].id as string;

  const { data: created, error: createdError } = await supabase
    .from('meetings')
    .insert([
      {
        meeting_date: meetingDate,
        // Your DB check constraint expects values like 'both' (see existing attendance SQL scripts).
        meeting_type: 'both',
        attendance_code: 'ATTEND',
        is_open: false,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      },
    ])
    .select('id')
    .single();

  if (createdError) throw createdError;
  return created.id as string;
}

async function main() {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.error('Usage: npx tsx scripts/import_attendance_from_csv.ts "<csv_file_path>"');
    process.exit(1);
  }

  const absoluteCsvPath = path.isAbsolute(csvFile)
    ? csvFile
    : path.join(process.cwd(), csvFile);

  const csvText = fs.readFileSync(absoluteCsvPath, 'utf8');
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  if (!records.length) {
    console.error('CSV had no rows:', absoluteCsvPath);
    process.exit(1);
  }

  // Google Form headers in your CSV:
  // Timestamp, First Name, Last Name, S Number (No s), What did we talk about?
  const firstNameKey = Object.keys(records[0]).find((k) => k.trim().toLowerCase() === 'first name');
  const lastNameKey = Object.keys(records[0]).find((k) => k.trim().toLowerCase() === 'last name');
  const timestampKey = Object.keys(records[0]).find((k) => k.trim().toLowerCase() === 'timestamp');
  const sNumberKey = Object.keys(records[0]).find(
    (k) => k.trim().toLowerCase() === 's number (no s)' || k.trim().toLowerCase() === 's number (no s)'
  );

  if (!timestampKey || !sNumberKey || !firstNameKey || !lastNameKey) {
    console.error('Could not detect required CSV headers. Found headers:', Object.keys(records[0]));
    process.exit(1);
  }

  const results = {
    total: records.length,
    success: 0,
    skipped: 0,
    errors: 0,
  };

  const meetingCache = new Map<string, string>(); // meeting_date -> meeting_id

  for (const row of records) {
    const meetingDate = toMeetingDateFromTimestamp(row[timestampKey] || '');
    const meetingId = meetingCache.get(meetingDate) || (await getOrCreateMeeting(meetingDate));
    if (!meetingCache.has(meetingDate)) meetingCache.set(meetingDate, meetingId);

    const studentSNumber = toStudentSNumber(row[sNumberKey] || '');
    if (!studentSNumber) {
      results.errors++;
      continue;
    }

    // Skip if already exists (avoid duplicate rows)
    const { data: existing, error: existingError } = await supabase
      .from('meeting_attendance')
      .select('id')
      .eq('meeting_id', meetingId)
      .eq('student_s_number', studentSNumber.toLowerCase())
      .limit(1);

    if (existingError) {
      results.errors++;
      continue;
    }
    if (existing && existing.length > 0) {
      results.skipped++;
      continue;
    }

    const firstName = (row[firstNameKey] || '').trim();
    const lastName = (row[lastNameKey] || '').trim();
    const studentNameForDebug = `${firstName} ${lastName}`.trim();

    const { error: insertError } = await supabase.from('meeting_attendance').insert([
      {
        meeting_id: meetingId,
        student_s_number: studentSNumber.toLowerCase(),
        attendance_code: 'IMPORTED',
        // Your DB constraint expects 'morning' or 'afternoon' (not 'both').
        // Since the CSV doesn't separate sessions, import into the morning session.
        session_type: 'morning',
        submitted_at: new Date().toISOString(),
      },
    ]);

    if (insertError) {
      console.error('Insert error for', studentNameForDebug, studentSNumber, insertError);
      results.errors++;
      continue;
    }

    results.success++;
  }

  console.log('✅ Attendance import complete:', {
    ...results,
    csv: path.basename(absoluteCsvPath),
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

