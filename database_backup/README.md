# Database Backup

This folder contains JSON exports of the Supabase database tables.

## Contents

Each backup is in a timestamped folder (e.g., `2026-02-23T23-33-58/`) containing:

| File | Description |
|------|-------------|
| `students.json` | Student records (name, s_number, hours, etc.) |
| `auth_users.json` | Login accounts |
| `meetings.json` | Meeting definitions |
| `meeting_attendance.json` | Attendance records |
| `hour_requests.json` | Pending hour requests |
| `hour_requests_archive_partN.json` | Approved/rejected hour requests (split into parts) |
| `hour_requests_archive_manifest.json` | Info for reconstructing the archive |
| `events.json` | Events |
| `event_attendees.json` | Event attendance |
| `_metadata.json` | Export timestamp and row counts |

## Creating a New Backup

Run from the project root:

```bash
npx tsx scripts/export_database.ts
```

## Note

- `hour_requests_archive` is large and may be partially exported if the query times out
- Sensitive data (passwords, etc.) may be in `auth_users` — don't commit if that's a concern
- Consider adding `database_backup/` to `.gitignore` if backups contain sensitive data
