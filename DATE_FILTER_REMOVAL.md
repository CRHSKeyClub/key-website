# How to Remove Date Filters (If Needed)

If you need to see **all** records (not just recent ones), you can remove the date filters I added.

## ⚠️ Warning

Removing date filters will make queries slower if you have thousands of records. **Only do this if:**
1. You've applied the database indexes (from `scripts/add_performance_indexes.sql`)
2. You have a small dataset (< 1,000 records per table)
3. You absolutely need to see old records

## How to Remove Filters

### 1. Hour Requests (getAllHourRequests)

**File**: `src/services/SupabaseService.ts`  
**Line**: ~925

**Remove this line:**
```typescript
.gte('submitted_at', oneYearAgo.toISOString()) // Only recent requests
```

**And remove these lines:**
```typescript
const oneYearAgo = new Date();
oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
```

### 2. Events (getAllEvents)

**File**: `src/services/SupabaseService.ts`  
**Line**: ~358

**Remove this line:**
```typescript
.gte('event_date', threeYearsAgo.toISOString()) // Only recent events
```

**And remove these lines:**
```typescript
const threeYearsAgo = new Date();
threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
```

### 3. Search (searchHourRequests)

**File**: `src/services/SupabaseService.ts`  
**Line**: ~960

**Remove this line:**
```typescript
.gte('submitted_at', twoYearsAgo.toISOString()) // Only recent requests
```

**And remove these lines:**
```typescript
const twoYearsAgo = new Date();
twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
```

## Alternative: Make Filters Configurable

Instead of removing filters, you could make them optional:

```typescript
static async getAllHourRequests(includeOld: boolean = false) {
  let query = supabase
    .from('hour_requests')
    .select('...')
    .eq('status', 'pending');
  
  if (!includeOld) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    query = query.gte('submitted_at', oneYearAgo.toISOString());
  }
  
  return query.order('submitted_at', { ascending: true }).limit(100);
}
```

Then call with `getAllHourRequests(true)` when you need old records.

## Recommended Approach

1. **Keep the filters** for normal use (better performance)
2. **Add a "Show All" button** in admin screens that calls a separate function without filters
3. **Use search** for finding specific old records (search already has a 2-year window)
