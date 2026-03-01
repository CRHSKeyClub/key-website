/**
 * Prepare database backup for a separate GitHub repo
 * - Splits hour_requests_archive.json into chunks < 50 MB each
 * - Copies all files to database_backups_repo/
 */

import * as fs from 'fs';
import * as path from 'path';

const BACKUP_SOURCE = path.join(process.cwd(), 'database_backup/2026-02-23T23-33-58');
const REPO_DIR = path.join(process.cwd(), 'database_backups_repo');
const MAX_CHUNK_SIZE_MB = 45;

async function main() {
  fs.mkdirSync(REPO_DIR, { recursive: true });

  const files = fs.readdirSync(BACKUP_SOURCE);
  for (const f of files) {
    const src = path.join(BACKUP_SOURCE, f);
    const dest = path.join(REPO_DIR, f);
    if (f === 'hour_requests_archive.json') {
      const data = JSON.parse(fs.readFileSync(src, 'utf-8'));
      const maxBytes = MAX_CHUNK_SIZE_MB * 1024 * 1024;
      let chunk: any[] = [];
      let size = 0;
      let part = 1;
      for (const row of data) {
        const rowStr = JSON.stringify(row);
        if (size + rowStr.length + 2 > maxBytes && chunk.length > 0) {
          fs.writeFileSync(
            path.join(REPO_DIR, `hour_requests_archive_part${part}.json`),
            JSON.stringify(chunk, null, 2)
          );
          part++;
          chunk = [];
          size = 0;
        }
        chunk.push(row);
        size += rowStr.length + 2;
      }
      if (chunk.length > 0) {
        fs.writeFileSync(
          path.join(REPO_DIR, `hour_requests_archive_part${part}.json`),
          JSON.stringify(chunk, null, 2)
        );
      }
      fs.writeFileSync(
        path.join(REPO_DIR, 'hour_requests_archive_manifest.json'),
        JSON.stringify({
          total_parts: part,
          total_records: data.length,
          note: 'Combine all hour_requests_archive_partN.json files to reconstruct full archive',
        }, null, 2)
      );
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  const readme = `# Key Club Database Backups

JSON exports of the Supabase database. Exported on ${new Date().toISOString().split('T')[0]}.

## Files

| File | Description |
|------|-------------|
| students.json | Student records |
| auth_users.json | Login accounts |
| meetings.json | Meeting definitions |
| meeting_attendance.json | Attendance records |
| hour_requests.json | Pending hour requests |
| hour_requests_archive_partN.json | Approved/rejected hour requests (split into parts) |
| hour_requests_archive_manifest.json | Info for reconstructing the archive |
| events.json | Events |
| event_attendees.json | Event attendance |
| _metadata.json | Export metadata |

## Reconstructing hour_requests_archive

The archive was split because it exceeds GitHub's 100 MB file limit. To combine:

\`\`\`javascript
const parts = [1,2,3,4,5,6].map(n => 
  require(\`./hour_requests_archive_part\${n}.json\`));
const full = parts.flat();
\`\`\`
`;
  fs.writeFileSync(path.join(REPO_DIR, 'README.md'), readme);

  const gitignore = `# OS
.DS_Store
`;
  fs.writeFileSync(path.join(REPO_DIR, '.gitignore'), gitignore);

  console.log('✅ Prepared', REPO_DIR);
  const sizes = fs.readdirSync(REPO_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => ({ f, sz: (fs.statSync(path.join(REPO_DIR, f)).size / 1024 / 1024).toFixed(1) + ' MB' }));
  sizes.forEach(s => console.log('   ', s.f, s.sz));
}

main().catch(console.error);
