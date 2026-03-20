/**
 * Fast bulk import attendance from a Google Form CSV into:
 * - `meetings` (one per meeting_date, created if missing)
 * - `meeting_attendance` (one row per student per meeting)
 *
 * Optimized to avoid doing a DB SELECT for every CSV row.
 *
 * Run:
 *   npx tsx scripts/import_attendance_from_csv_fast.ts "<csv_file_path>"
 *
 * Assumes the CSV headers match your existing export:
 * Timestamp, First Name, Last Name, S Number (No s), ...
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
  // NOTE: this repo already uses a hardcoded service role key in other scripts.
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

type CsvRow = Record<string, string>;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toMeetingDateFromTimestamp(timestamp: string): string {
  // Expected: "3/17/2026 7:25:58"
  const trimmed = (timestamp || '').trim();
  if (!trimmed) throw new Error('Missing Timestamp');

  const [datePart] = trimmed.split(' ');
  const [m, d, y] = datePart.split('/').map((x) => x.trim());
  const mm = Number(m);
  const dd = Number(d);
  const yyyy = Number(y);
  if (!Number.isFinite(mm) || !Number.isFinite(dd) || !Number.isFinite(yyyy)) {
    throw new Error(`Unrecognized timestamp date format: ${timestamp}`);
  }

  return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
}

function toStudentSNumber(raw: string): string | null {
  const s = (raw || '').trim();
  if (!s) return null;
  if (s.toLowerCase().startsWith('s')) return s.toLowerCase();
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
        // Your DB check constraint expects values like 'both'
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

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const csvFile = process.argv[2];
  if (!csvFile) {
    console.error(
      'Usage: npx tsx scripts/import_attendance_from_csv_fast.ts "<csv_file_path>"'
    );
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

  // Your export headers (from the CSV file in repo root)
  const TIMESTAMP_KEY = 'Timestamp';
  const FIRST_KEY = 'First Name';
  const LAST_KEY = 'Last Name';
  const SNUMBER_KEY = 'S Number (No s)';

  // Validate headers exist
  const headerKeys = Object.keys(records[0]);
  const missingHeaders = [TIMESTAMP_KEY, FIRST_KEY, LAST_KEY, SNUMBER_KEY].filter(
    (k) => !headerKeys.includes(k)
  );
  if (missingHeaders.length > 0) {
    console.error('Could not detect required CSV headers:', missingHeaders);
    console.error('Found headers:', headerKeys);
    process.exit(1);
  }

  // Build import entries
  type Entry = { meetingDate: string; meetingId: string; studentSNumber: string };
  const entries: Array<{ meetingDate: string; studentSNumber: string }> = [];

  for (const row of records) {
    const meetingDate = toMeetingDateFromTimestamp(row[TIMESTAMP_KEY] || '');
    const studentSNumber = toStudentSNumber(row[SNUMBER_KEY] || '');
    if (!studentSNumber) continue;
    entries.push({ meetingDate, studentSNumber });
  }

  const meetingDates = [...new Set(entries.map((e) => e.meetingDate))];
  const meetingCache = new Map<string, string>();
  for (const d of meetingDates) {
    meetingCache.set(d, await getOrCreateMeeting(d));
  }

  // Fetch existing attendance for those meetings
  const meetingIds = [...new Set(meetingCache.values())];
  const { data: existingRows, error: existingError } = await supabase
    .from('meeting_attendance')
    .select('meeting_id, student_s_number')
    .in('meeting_id', meetingIds);

  if (existingError) throw existingError;

  const existingByMeeting = new Map<string, Set<string>>();
  for (const mId of meetingIds) existingByMeeting.set(String(mId), new Set());
  for (const r of existingRows || []) {
    const mId = String(r.meeting_id);
    const set = existingByMeeting.get(mId);
    if (set) set.add(String(r.student_s_number).toLowerCase());
  }

  // Prepare inserts (skip duplicates in both DB and current CSV batch)
  const nowIso = new Date().toISOString();
  const toInsertByMeeting = new Map<string, Array<any>>();
  const pendingByMeeting = new Map<string, Set<string>>();
  for (const mId of meetingIds) pendingByMeeting.set(String(mId), new Set());

  let skippedDuplicates = 0;
  let prepared = 0;

  for (const e of entries) {
    const meetingId = meetingCache.get(e.meetingDate)!;
    const mId = meetingId;
    const student = e.studentSNumber.toLowerCase();

    const existingSet = existingByMeeting.get(String(mId)) || new Set<string>();
    const pendingSet = pendingByMeeting.get(String(mId)) || new Set<string>();

    if (existingSet.has(student) || pendingSet.has(student)) {
      skippedDuplicates++;
      continue;
    }

    pendingSet.add(student);
    if (!toInsertByMeeting.has(String(mId))) toInsertByMeeting.set(String(mId), []);
    toInsertByMeeting.get(String(mId))!.push({
      meeting_id: mId,
      student_s_number: student,
      attendance_code: 'IMPORTED',
      // DB constraint expects 'morning' or 'afternoon'
      session_type: 'morning',
      submitted_at: nowIso,
    });
    prepared++;
  }

  const meetingIdsForInserts = [...toInsertByMeeting.keys()];
  let inserted = 0;
  const batchSize = 200;

  for (const mId of meetingIdsForInserts) {
    const rows = toInsertByMeeting.get(mId) || [];
    for (const batch of chunk(rows, batchSize)) {
      const { error } = await supabase.from('meeting_attendance').insert(batch);
      if (error) throw error;
      inserted += batch.length;
    }
  }

  console.log('✅ Attendance import complete:', {
    csv: path.basename(absoluteCsvPath),
    totalCsvRows: records.length,
    preparedInserts: prepared,
    inserted,
    skippedDuplicates,
    meetings: meetingDates,
  });
}

main().catch((e) => {
  console.error('Import failed:', e);
  process.exit(1);
});

