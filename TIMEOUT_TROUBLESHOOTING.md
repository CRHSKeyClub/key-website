# Timeout Troubleshooting Guide

If you're **still getting timeouts** after applying indexes, try these steps:

## Step 1: Verify Indexes Were Created

Run this in Supabase SQL Editor:

```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'hour_requests' 
  AND schemaname = 'public'
  AND indexname LIKE 'idx_%';
```

You should see at least:
- `idx_hour_requests_status`
- `idx_hour_requests_submitted_at`
- `idx_hour_requests_status_submitted_at`

**If you don't see these, the indexes weren't created. Run `scripts/add_performance_indexes.sql` again.**

## Step 2: Check How Many Records You Have

Run `scripts/check_hour_requests_count.sql` to see:
- How many total hour requests
- How many pending requests
- How many pending in last 6 months/3 months

**If you have thousands of pending requests even in the last 6 months, that's the problem.**

## Step 3: Try the Improved Indexes

Run `scripts/improved_indexes.sql` - this creates a **partial index** specifically for pending requests, which is much more efficient:

```sql
-- Partial index ONLY for pending requests (smaller, faster)
CREATE INDEX idx_hour_requests_pending_submitted_at
ON hour_requests(submitted_at DESC)
WHERE status = 'pending';
```

This index only indexes pending requests, making it smaller and faster.

## Step 4: Reduce Date Filter Even More

If you still have issues, reduce the date filter from 6 months to 3 months:

In `src/services/SupabaseService.ts` line ~920, change:
```typescript
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
```

To:
```typescript
const threeMonthsAgo = new Date();
threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
```

And update line ~936 from `sixMonthsAgo` to `threeMonthsAgo`.

## Step 5: Reduce Limit

In `getAllHourRequests()` (line ~940), reduce the limit:

```typescript
.limit(50); // Changed from 100
```

## Step 6: Check if Table Needs Vacuuming

Run this in Supabase SQL Editor:

```sql
SELECT 
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE tablename = 'hour_requests';
```

If `dead_rows` is high, the table needs vacuuming:

```sql
VACUUM ANALYZE hour_requests;
```

## Step 7: Archive Old Requests

If you have thousands of old approved/rejected requests, consider archiving them:

```sql
-- Create archive table
CREATE TABLE IF NOT EXISTS hour_requests_archive (
  LIKE hour_requests INCLUDING ALL
);

-- Archive old approved/rejected requests (older than 1 year)
INSERT INTO hour_requests_archive
SELECT * FROM hour_requests
WHERE status IN ('approved', 'rejected')
  AND reviewed_at < NOW() - INTERVAL '1 year';

-- Delete archived records
DELETE FROM hour_requests
WHERE id IN (SELECT id FROM hour_requests_archive);
```

This will make the `hour_requests` table smaller and faster.

## Step 8: Use Supabase Query Performance Dashboard

1. Go to Supabase Dashboard → Database → Query Performance
2. Look for slow queries
3. Check if your query is listed there
4. See what the execution time is

## Step 9: Check Supabase Plan Limits

If you're on the free tier, you might be hitting:
- Connection limits
- Query timeout limits
- Compute limits

Consider upgrading your Supabase plan if you have a large dataset.

## Quick Fix: Disable Date Filter Temporarily

If you need it working NOW, you can temporarily remove the date filter:

In `src/services/SupabaseService.ts`, comment out lines ~920-936:

```typescript
// Temporarily disabled date filter to test
// const sixMonthsAgo = new Date();
// sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const { data, error } = await supabase
  .from('hour_requests')
  .select('...')
  .eq('status', 'pending')
  // .gte('submitted_at', sixMonthsAgo.toISOString()) // Commented out
  .order('submitted_at', { ascending: false })
  .limit(50); // Reduced limit
```

**Note**: This will be slower, but should at least work. Once working, you can add filters back gradually.

---

## Expected Results After Each Step

| Step | Expected Result |
|------|----------------|
| Verify indexes | Should see all indexes listed |
| Check counts | Know how many records you have |
| Improved indexes | Partial index created (smaller, faster) |
| Reduce date filter | Fewer records loaded |
| Reduce limit | Less data transferred |
| Vacuum | Table cleaned up, faster queries |
| Archive | Smaller table, faster queries |
| Check dashboard | See actual query performance |

---

## If Nothing Works

1. **Check Supabase status**: Is Supabase having issues?
2. **Try a simpler query**: Query just by status, no date filter
3. **Contact Supabase support**: If you're on a paid plan, they can help
4. **Consider pagination**: Load 20-50 at a time instead of 100
