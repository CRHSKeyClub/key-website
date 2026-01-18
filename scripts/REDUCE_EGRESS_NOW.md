# Reduce Egress Right Now - Immediate Actions

## Current Egress: 8.285 GB / 5 GB = **166%** ⚠️

Since you're already over the limit, here are **immediate code changes** to reduce egress:

---

## ✅ 1. Disable Auto-Refresh After Actions

**Problem**: After every approve/reject/delete, the app reloads all hour requests.

**Fix**: Update local state only, don't reload from database.

**Egress Saved**: ~50-100 KB per action × 100 actions = **5-10 MB**

---

## ✅ 2. Increase Cache Duration

**Problem**: Context refreshes too often, making redundant queries.

**Fix**: Add a cache TTL - only refresh if data is older than 5 minutes.

**Egress Saved**: ~100-200 KB per refresh × 20 refreshes/hour = **2-4 MB/hour**

---

## ✅ 3. Reduce Student Query Size

**Problem**: `getAllStudents()` loads 1,000 students with all columns.

**Fix**: 
- Reduce limit to 500 (or even 250 for admin list)
- Only select columns needed for list view
- Load full details only when clicking

**Egress Saved**: ~500 KB per query × 10 queries/day = **5 MB/day**

---

## ✅ 4. Reduce Events Query Size

**Problem**: `getAllEvents()` loads events with full attendee data.

**Fix**:
- Only load recent events (last 1 year instead of 3)
- Don't load attendee details unless needed
- Reduce attendee data selected

**Egress Saved**: ~200-300 KB per query × 5 queries/day = **1-1.5 MB/day**

---

## ✅ 5. Remove Background Refreshes

**Problem**: AdminHourManagementScreen calls `refreshHourRequests()` in background even when using cached data.

**Fix**: Don't refresh in background - only refresh on explicit user action.

**Egress Saved**: ~100 KB per background refresh × 50 refreshes/day = **5 MB/day**

---

## ✅ 6. Lazy Load Contexts

**Problem**: HourContext and EventsContext load on app start, even if user never visits those screens.

**Fix**: Only load contexts when user navigates to screens that need them.

**Egress Saved**: ~200 KB per app load × 100 loads/day = **20 MB/day**

---

## ✅ 7. Disable Auto-Refresh on Context Actions

**Problem**: After submitting/updating/deleting hour requests, context automatically reloads.

**Fix**: Optimistically update local state, skip database reload.

**Egress Saved**: ~50 KB per action × 50 actions/day = **2.5 MB/day**

---

## ✅ 8. Reduce Search Limits

**Problem**: Search returns 50-100 results.

**Fix**: Reduce to 20-30 results (enough for first page).

**Egress Saved**: ~50 KB per search × 20 searches/day = **1 MB/day**

---

## 📊 Total Egress Reduction

If you implement all of these:

- **Per Day**: ~35-50 MB saved
- **Per Month**: ~1-1.5 GB saved
- **Current**: 8.285 GB used
- **After Fixes**: ~6.5-7 GB (still over, but much better)

**Note**: Egress resets at start of each month. These fixes will help prevent hitting limit next month.

---

## 🎯 Quick Wins (Biggest Impact)

1. **Remove background refreshes** (saves ~5 MB/day)
2. **Optimistic updates** (saves ~5 MB/day)
3. **Lazy load contexts** (saves ~20 MB/day)
4. **Reduce student query** (saves ~5 MB/day)

**Total Quick Wins**: ~35 MB/day = **~1 GB/month**

---

## ⚠️ What Won't Help (Already Done)

- ✅ Already reduced query limits (25 rows)
- ✅ Already removed large fields (description, admin_notes)
- ✅ Already using indexes
- ✅ Already caching in contexts

---

## 🔄 What You Still Need

**Egress resets monthly** - if you're at 166% now:
- You'll hit limits until next month reset
- New queries will use less data (thanks to optimizations)
- Next month should stay under limit

**Database size** - run cleanup script to get under 0.5 GB limit.
