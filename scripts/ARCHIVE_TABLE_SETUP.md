# Hour Requests Archive Table Setup

## Why Archive Approved/Rejected Requests?

The `hour_requests` table can grow very large over time. When you query for pending requests, Postgres has to scan through **all** approved and rejected records too, making queries slow and causing timeouts.

By moving approved/rejected requests to a separate `hour_requests_archive` table:
- ✅ `hour_requests` only contains **pending** requests (much smaller!)
- ✅ Queries for pending requests are **10-100x faster**
- ✅ No more timeouts when loading the admin hour management screen
- ✅ Historical data is still accessible via `hour_requests_archive`

## Setup Instructions

### Step 1: Create the Archive Table

1. Open **Supabase SQL Editor**
2. Copy and paste the entire contents of `scripts/create_hour_requests_archive.sql`
3. Click **Run**
4. Verify you see:
   - Table `hour_requests_archive` created
   - Indexes created
   - Trigger created (auto-archives when status changes)
   - View `hour_requests_all` created

### Step 2: Migrate Existing Approved/Rejected Records

1. In **Supabase SQL Editor**
2. Copy and paste the entire contents of `scripts/migrate_hour_requests_to_archive.sql`
3. Click **Run**
4. Verify the counts:
   - `hour_requests` should now only show pending requests
   - `hour_requests_archive` should show all approved/rejected requests

### Step 3: Test the Auto-Archive

The trigger is already set up! When you approve or reject a request in the admin panel, it will **automatically move** from `hour_requests` to `hour_requests_archive`.

Test it:
1. Go to Admin Hour Management screen
2. Approve a pending request
3. Check Supabase: The request should now be in `hour_requests_archive`, not `hour_requests`

## How It Works

### Auto-Archive Trigger

When you update a request's status to `'approved'` or `'rejected'`:
1. The trigger function `archive_hour_request()` fires
2. It copies the record to `hour_requests_archive`
3. It deletes the record from `hour_requests`
4. The main table stays small with only pending requests

### Backwards Compatibility

- **Existing code still works**: The `hour_requests` table still exists and works the same way
- **Pending queries are faster**: `getAllHourRequests()` now only scans pending requests
- **Historical queries**: Use `hour_requests_archive` or the `hour_requests_all` view for approved/rejected records

## Querying Both Tables

If you need to query both tables (e.g., for student history), you can:

### Option 1: Use the View (Easiest)

```typescript
const { data } = await supabase
  .from('hour_requests_all')  // View that combines both tables
  .select('*')
  .eq('student_s_number', 's123456');
```

### Option 2: Query Both Tables Separately

```typescript
// Pending requests
const { data: pending } = await supabase
  .from('hour_requests')
  .select('*')
  .eq('student_s_number', 's123456');

// Approved/Rejected requests
const { data: archived } = await supabase
  .from('hour_requests_archive')
  .select('*')
  .eq('student_s_number', 's123456');

const all = [...pending, ...archived];
```

## Performance Benefits

**Before:**
- `hour_requests` table: 10,000 rows (8,000 approved, 1,000 rejected, 1,000 pending)
- Query for pending: Scans all 10,000 rows → **Slow, times out**

**After:**
- `hour_requests` table: 1,000 rows (only pending)
- `hour_requests_archive` table: 9,000 rows (approved + rejected)
- Query for pending: Scans only 1,000 rows → **10x faster, no timeouts!**

## Rollback (If Needed)

If you need to undo this:

```sql
-- Disable the trigger
DROP TRIGGER IF EXISTS trigger_archive_hour_request ON hour_requests;

-- Move archived records back to main table
INSERT INTO hour_requests
SELECT id, student_s_number, student_name, event_name, event_date,
       hours_requested, description, type, status, submitted_at,
       reviewed_at, reviewed_by, admin_notes, image_name
FROM hour_requests_archive;

-- Delete archive table (optional)
DROP TABLE IF EXISTS hour_requests_archive CASCADE;
```

## Next Steps

After setting this up:
1. ✅ Test approving/rejecting a request (should auto-archive)
2. ✅ Test the admin hour management screen (should load much faster)
3. ✅ Monitor Supabase logs to confirm no more timeouts
