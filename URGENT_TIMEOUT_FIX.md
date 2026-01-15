# URGENT: Timeout Still Happening After Indexes

If you've applied indexes but still getting timeouts, try these **immediate fixes**:

## Quick Fix #1: Disable Date Filter Temporarily

Edit `src/services/SupabaseService.ts` line ~928, comment out the date filter:

```typescript
const { data, error } = await supabase
  .from('hour_requests')
  .select('id, student_s_number, student_name, event_name, event_date, hours_requested, description, type, status, submitted_at, reviewed_at, reviewed_by, admin_notes, image_name')
  .eq('status', 'pending')
  // .gte('submitted_at', sixMonthsAgo.toISOString()) // COMMENTED OUT - remove if causing issues
  .order('submitted_at', { ascending: false })
  .limit(50); // Reduced to 50
```

This will be slower but should work. Once working, add filters back.

## Quick Fix #2: Reduce Limit Significantly

Change line ~940 from `.limit(100)` to `.limit(20)` or `.limit(50)`

## Quick Fix #3: Try the Improved Partial Index

Run `scripts/improved_indexes.sql` - this creates a partial index that's much faster:

```sql
-- This creates an index ONLY for pending requests (smaller, faster)
CREATE INDEX idx_hour_requests_pending_submitted_at
ON hour_requests(submitted_at DESC)
WHERE status = 'pending';
```

## Quick Fix #4: Check How Many Pending Requests You Have

Run this in Supabase SQL Editor:

```sql
SELECT COUNT(*) FROM hour_requests WHERE status = 'pending';
```

**If you have thousands of pending requests, that's the problem.** You might need to:
1. Process/approve old pending requests
2. Archive old requests
3. Reduce the limit significantly (to 20-50)

## Quick Fix #5: Remove Description Column from Query

The `description` column might be very large (contains images). Try removing it:

In `getAllHourRequests()`, change the select to:
```typescript
.select('id, student_s_number, student_name, event_name, event_date, hours_requested, type, status, submitted_at, reviewed_at, reviewed_by, admin_notes, image_name')
```

Remove `description` from the select list - this can significantly speed up the query if descriptions are large.

## Most Likely Issue

If you have **thousands of pending requests**, even with indexes, the query is still slow because:
1. It has to scan many rows to find the first 100
2. Ordering by `submitted_at` requires sorting
3. The date filter still has to check many records

**Solution**: Reduce the limit to 20-50, or archive/process old pending requests.

## Immediate Action Plan

1. ✅ Run `scripts/check_hour_requests_count.sql` to see how many pending requests you have
2. ✅ Run `scripts/improved_indexes.sql` for the partial index
3. ✅ Reduce limit to 50 in `getAllHourRequests()`
4. ✅ Remove `description` from select if it's large
5. ✅ If still failing, temporarily disable date filter

See `TIMEOUT_TROUBLESHOOTING.md` for more detailed steps.
