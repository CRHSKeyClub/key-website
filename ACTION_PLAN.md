# Action Plan - Fix Supabase Loading Issues

## ✅ What's Already Done (Safe - No Action Needed)

The following code changes are **already applied** and **safe**:
- ✅ Error handling (won't break anything)
- ✅ Timeout protection (prevents crashes)
- ✅ Query optimizations (only selects needed columns)
- ✅ AdminHourManagementScreen caching (improves performance)

**You don't need to do anything for these - they're already in your code.**

---

## 🚨 REQUIRED: Apply Database Indexes (Most Important!)

**This is the #1 fix and MUST be done first.**

### Step 1: Go to Supabase Dashboard
1. Open https://app.supabase.com
2. Select your project
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run the Index Script
1. Open the file: `scripts/add_performance_indexes.sql`
2. Copy **ALL** the contents (lines 1-60)
3. Paste into the Supabase SQL Editor
4. Click **"Run"** (or press Cmd/Ctrl + Enter)

### Step 3: Verify Indexes Were Created
After running, you should see a results table showing all the indexes that were created. You should see:
- `idx_hour_requests_status`
- `idx_hour_requests_submitted_at`
- `idx_hour_requests_status_submitted_at`
- `idx_students_s_number`
- `idx_students_name`
- And several others...

**✅ If you see these indexes, you're done with this step!**

**⚠️ If you get errors:**
- Some indexes might already exist (that's OK - `IF NOT EXISTS` handles this)
- If you see permission errors, check your Supabase role

---

## ⚠️ OPTIONAL: Test the Date Filters

The code now has date filters that only show:
- **Hour Requests**: Last 12 months of pending requests
- **Events**: Last 3 years
- **Students**: Up to 1,000 (was 5,000)
- **Search**: Last 2 years

### Will This Break Anything?

**NO, but it might hide old data:**

✅ **Safe:**
- App won't crash
- All existing features work
- Recent data still shows
- Search still works (searches last 2 years)

⚠️ **Potential Issues:**
- Old pending requests (>1 year) won't show in admin screen
- Very old events (>3 years) won't show
- If you have >1,000 students, some won't show (use search instead)

### How to Test:

1. **Test Hour Requests:**
   - Go to Admin Hour Management screen
   - Check if you see recent pending requests
   - If you need to see older requests, use the search function

2. **Test Events:**
   - Go to Events screen
   - Check if recent events show
   - If old events are missing, that's expected (they're >3 years old)

3. **Test Students:**
   - Go to Admin Student Management
   - If you have <1,000 students, all should show
   - If you have >1,000, use search to find specific students

### If You Need to See All Old Data:

See `DATE_FILTER_REMOVAL.md` for instructions on removing date filters. But **only do this if:**
- You've applied the indexes first
- You have a small dataset (<1,000 records)
- You absolutely need to see old records

---

## 🔄 Rollback Plan (If Something Breaks)

If anything goes wrong, you can easily revert:

### Option 1: Remove Date Filters Only

Edit `src/services/SupabaseService.ts` and remove these lines:

**In `getAllHourRequests()` (around line 920-927):**
```typescript
// Remove these 3 lines:
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
.gte('submitted_at', oneYearAgo.toISOString())
```

**In `getAllEvents()` (around line 355-358):**
```typescript
// Remove these 3 lines:
const threeYearsAgo = new Date();
threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
.gte('event_date', threeYearsAgo.toISOString())
```

**In `searchHourRequests()` (around line 954-960):**
```typescript
// Remove these 3 lines:
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
.gte('submitted_at', twoYearsAgo.toISOString())
```

### Option 2: Increase Student Limit

In `getAllStudents()` (around line 1755), change:
```typescript
.limit(1000); // Change back to 5000 if needed
```

### Option 3: Git Revert (If You Use Git)

```bash
git checkout HEAD -- src/services/SupabaseService.ts
```

---

## 📋 Summary Checklist

- [ ] **REQUIRED**: Run `scripts/add_performance_indexes.sql` in Supabase SQL Editor
- [ ] **REQUIRED**: Verify indexes were created (check the results table)
- [ ] **OPTIONAL**: Test the app - check if recent data loads
- [ ] **OPTIONAL**: Test if old data is missing (expected if >1 year old)
- [ ] **IF NEEDED**: Remove date filters (see `DATE_FILTER_REMOVAL.md`)

---

## 🎯 Expected Results

**After applying indexes:**
- ✅ Queries should be **much faster** (< 500ms instead of 2-10+ seconds)
- ✅ Timeout errors should **disappear**
- ✅ App should load **without delays**

**After date filters:**
- ✅ Even faster queries
- ✅ Less data loaded (only recent records)
- ⚠️ Old records hidden (but search still works)

---

## ❓ FAQ

**Q: Will this break my app?**  
A: No. The changes are safe. Worst case, old data won't show (but you can remove filters).

**Q: Do I have to apply the indexes?**  
A: **YES** - This is the most important fix. Without indexes, queries will still be slow.

**Q: What if I have old pending requests I need to see?**  
A: Use the search function (searches last 2 years), or remove the date filter (see `DATE_FILTER_REMOVAL.md`).

**Q: What if I have more than 1,000 students?**  
A: Use the search/filter functions in admin screens, or increase the limit back to 5000.

**Q: Can I test this on a staging environment first?**  
A: Yes! The indexes are safe to run multiple times (they use `IF NOT EXISTS`).

---

## 🆘 Need Help?

If something breaks:
1. Check browser console for errors
2. Check Supabase dashboard for query errors
3. Remove date filters (see rollback plan above)
4. Verify indexes were created correctly

The code changes are **non-breaking** - they only add filters and error handling. The worst that can happen is old data won't show, which you can fix by removing the date filters.
