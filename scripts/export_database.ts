/**
 * Export all database tables to JSON files in database_backup/
 * Run with: npx tsx scripts/export_database.ts
 *
 * Uses service_role key - do not expose in client code.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://zvoavkzruhnzzeqyihrc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b2F2a3pydWhuenplcXlpaHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTAxMTQ5NywiZXhwIjoyMDY0NTg3NDk3fQ.1zbQ5OTxKzARie0zwsyoc1Y8NTOMinpJBWytijywEYs';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TABLES = [
  'students',
  'auth_users',
  'meetings',
  'meeting_attendance',
  'hour_requests',
  'events',
  'event_attendees',
];

async function main() {
  const backupDir = path.join(process.cwd(), 'database_backup');
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dateDir = path.join(backupDir, timestamp);
  fs.mkdirSync(dateDir, { recursive: true });

  console.log('📦 Exporting database to', dateDir);
  console.log('');

  let totalRows = 0;

  for (const table of TABLES) {
    const all: any[] = [];
    let offset = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.log(`   ⚠️  ${table}: ${error.message} (table may not exist)`);
        break;
      }
      if (!data?.length) break;

      all.push(...data);
      if (data.length < pageSize) break;
      offset += pageSize;
    }

    const count = all.length;
    totalRows += count;

    const filePath = path.join(dateDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(all, null, 2), 'utf-8');
    console.log(`   ✅ ${table}: ${count} rows`);
  }

  // hour_requests_archive - export in chunks (large table, may timeout)
  console.log('   📦 Exporting hour_requests_archive (chunked)...');
  const archiveAll: any[] = [];
  let offset = 0;
  const pageSize = 100;
  while (true) {
    const { data, error } = await supabase
      .from('hour_requests_archive')
      .select('*')
      .range(offset, offset + pageSize - 1);
    if (error) {
      console.log(`   ⚠️  hour_requests_archive: ${error.message}`);
      break;
    }
    if (!data?.length) break;
    archiveAll.push(...data);
    if (data.length < pageSize) break;
    offset += pageSize;
  }
  if (archiveAll.length > 0) {
    fs.writeFileSync(path.join(dateDir, 'hour_requests_archive.json'), JSON.stringify(archiveAll, null, 2), 'utf-8');
    totalRows += archiveAll.length;
    console.log(`   ✅ hour_requests_archive: ${archiveAll.length} rows`);
  }

  const meta = {
    exported_at: new Date().toISOString(),
    tables: [...TABLES, 'hour_requests_archive'],
    total_rows: totalRows,
  };
  fs.writeFileSync(path.join(dateDir, '_metadata.json'), JSON.stringify(meta, null, 2));

  console.log('');
  console.log(`✅ Export complete: ${totalRows} total rows`);
  console.log(`   Location: database_backup/${timestamp}/`);
}

main().catch(console.error);
