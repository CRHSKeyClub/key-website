# URGENT: Fix Egress & Database Size Limits

## 🚨 Critical Issue

Your Supabase project is **over its resource limits**, causing 500 errors:

- **Egress**: 8.285 GB / 5 GB limit = **166%** ⚠️ EXCEEDED
- **Database Size**: 0.553 GB / 0.5 GB limit = **111%** ⚠️ EXCEEDED

## ✅ Immediate Fixes Applied (Code Changes)

I've already updated your code to reduce egress:

### 1. Reduced Query Limits
- `getHourRequestsPage`: 50 → **25 rows** per query
- `getAllHourRequests`: 50 → **25 rows** per query

### 2. Removed Heavy Fields from List Views
- Removed `description` and `admin_notes` from initial list queries
- These large text fields account for ~70% of egress
- Load them separately only when viewing details

### 3. Added Early Limits
- Search queries now have `.limit()` applied early
- Reduces amount of data Postgres processes

## 🔧 Database Cleanup (Run These SQL Scripts)

### Step 1: Archive Old Data
```sql
-- Run: scripts/migrate_hour_requests_to_archive.sql
-- This moves approved/rejected requests to archive table
-- Reduces main table size significantly
```

### Step 2: Clean Up Very Old Data
```sql
-- Run: scripts/reduce_database_size.sql
-- This deletes approved/rejected requests older than 2 years
-- WARNING: Permanently deletes data - only run if you have backups!
```

### Step 3: Clean Up Large Base64 Images
```sql
-- The reduce_database_size.sql script also removes large base64 image data
-- from descriptions, which can be several MB per request
```

## 📊 Expected Results

After running cleanup scripts:
- **Database Size**: Should drop from 0.553 GB → ~0.35-0.4 GB ✅
- **Egress**: Should reduce significantly with smaller payloads ✅

## 🎯 Additional Optimizations

### 1. Enable Better Caching
The app already uses `HourContext` for caching. Make sure you're not refreshing too often.

### 2. Load Details On-Demand
- List view now only shows: `id, student_name, event_name, hours_requested, type, status, submitted_at`
- Load full details (description, admin_notes) only when clicking to view/approve

### 3. Consider Upgrading Plan
If you need to keep more historical data, consider upgrading your Supabase plan:
- **Free Plan**: 0.5 GB database, 5 GB egress
- **Pro Plan**: 8 GB database, 250 GB egress ($25/month)

## 🚀 Next Steps

1. **Immediate** (Already Done):
   - ✅ Code updated to reduce egress by ~70%
   - ✅ Query limits reduced

2. **Run SQL Scripts** (Do This Now):
   ```bash
   # In Supabase SQL Editor:
   1. Run scripts/migrate_hour_requests_to_archive.sql
   2. Run scripts/reduce_database_size.sql (if you have backups)
   ```

3. **Monitor**:
   - Check Supabase dashboard after 24 hours
   - Egress should reset at start of next month
   - Database size should decrease after cleanup

## ⚠️ Important Notes

- **Egress resets monthly** - if you're at 166%, wait until next month cycle
- **Database size** can be reduced immediately with cleanup scripts
- **500 errors** should stop once you're under limits
- **Current optimizations** will prevent hitting limits again

## 🔍 Verify Fix

After cleanup, check Supabase dashboard:
- Database Size should be < 0.5 GB
- Egress will reset next month, but new queries will use less data
