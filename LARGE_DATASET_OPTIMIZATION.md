# Large Dataset Optimization Guide

If you have **thousands or tens of thousands** of entries in Supabase, even with indexes, queries can still be slow. Here's how to optimize:

## 📊 Current Limits

- **Hour Requests**: Loading 100 records (but scans ALL pending records)
- **Students**: Loading up to **5,000 records** (very high!)
- **Events**: Loading **ALL events** (no limit)

## 🔧 Optimizations to Apply

### 1. Reduce Query Limits (Most Important!)

If you have thousands of records, reduce these limits:

#### For Hour Requests:
- Currently: 100
- Recommended: 50-100 (keep this, but add date filtering)

#### For Students:
- Currently: 5,000
- Recommended: 200-500 (most admin screens don't need all 5,000 at once)

#### For Events:
- Currently: No limit (loads ALL events)
- Recommended: Last 50-100 events, or filter by year

### 2. Add Date-Based Filtering

Only load **recent data** instead of everything:

```typescript
// Only load hour requests from the last 6 months
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const { data } = await supabase
  .from('hour_requests')
  .select('...')
  .eq('status', 'pending')
  .gte('submitted_at', sixMonthsAgo.toISOString())
  .order('submitted_at', { ascending: true })
  .limit(100);
```

### 3. Add Pagination

Instead of loading everything at once, use pagination:

```typescript
// Load first page
const { data } = await supabase
  .from('hour_requests')
  .select('...')
  .eq('status', 'pending')
  .range(0, 49) // First 50 records
  .order('submitted_at', { ascending: true });

// Load next page
const { data: nextPage } = await supabase
  .from('hour_requests')
  .select('...')
  .eq('status', 'pending')
  .range(50, 99) // Next 50 records
  .order('submitted_at', { ascending: true });
```

### 4. Archive Old Data

Move old records to an archive table:

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

### 5. Filter at Database Level

Only query what you need:

```typescript
// Instead of loading all students, filter by account status
const { data } = await supabase
  .from('students')
  .select('...')
  .eq('account_status', 'active') // Only active accounts
  .order('name', { ascending: true })
  .limit(500);
```

## 🚀 Quick Fixes to Apply Now

### Fix 1: Reduce Student Limit

Change `getAllStudents()` limit from 5000 to 500:

```typescript
.limit(500); // Changed from 5000
```

### Fix 2: Add Date Filtering for Hour Requests

Only load recent hour requests (last 6 months):

```typescript
// Add date filter
const sixMonthsAgo = new Date();
sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

const { data, error } = await supabase
  .from('hour_requests')
  .select('...')
  .eq('status', 'pending')
  .gte('submitted_at', sixMonthsAgo.toISOString()) // ADD THIS
  .order('submitted_at', { ascending: true })
  .limit(100);
```

### Fix 3: Add Limit to Events

Only load recent events:

```typescript
// Only load events from the last year
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

const { data: eventsData, error: eventsError } = await supabase
  .from('events')
  .select('*')
  .gte('event_date', oneYearAgo.toISOString()) // ADD THIS
  .order('event_date');
```

## 📈 Expected Impact

| Change | Before | After | Impact |
|--------|--------|-------|--------|
| Students limit | 5,000 | 500 | 90% less data |
| Hour requests | All pending | Last 6 months | 70-90% less data |
| Events | All | Last year | 60-80% less data |

## ⚠️ Important Notes

1. **Indexes still matter**: Even with these optimizations, indexes are critical
2. **User experience**: Reducing limits might mean users need to use search/filters more
3. **Old data**: Consider adding an "Archive" view for old records
4. **Pagination**: For admin screens with many records, pagination is better than large limits

## 🔍 How to Check Your Dataset Size

Run this in Supabase SQL Editor:

```sql
-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('hour_requests', 'students', 'events', 'auth_users')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check record counts
SELECT 
  'hour_requests' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_records,
  COUNT(*) FILTER (WHERE submitted_at > NOW() - INTERVAL '6 months') AS recent_records
FROM hour_requests
UNION ALL
SELECT 
  'students' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE account_status = 'active') AS active_records,
  NULL AS recent_records
FROM students
UNION ALL
SELECT 
  'events' AS table_name,
  COUNT(*) AS total_records,
  COUNT(*) FILTER (WHERE event_date > NOW() - INTERVAL '1 year') AS recent_records,
  NULL AS pending_records
FROM events;
```

This will show you exactly how many records you have and help decide on limits.
