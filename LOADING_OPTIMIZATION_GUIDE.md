# Supabase Loading Issues - Fix Guide

## 🚨 Critical: Apply Database Indexes First

**This is the most important step!** Without indexes, queries will be slow and timeout.

1. Go to your Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `scripts/add_performance_indexes.sql`
3. Run the script
4. Verify indexes were created successfully

This will fix the timeout errors (code 57014) and dramatically improve query performance.

---

## ✅ Optimizations Already Applied

### 1. Error Handling & Timeout Protection
- Queries now handle timeout errors gracefully
- Return empty arrays instead of crashing
- Added query limits with date filtering for better performance

### 2. Large Dataset Optimizations (NEW!)
- **Hour Requests**: Only loads last 6 months (was: all pending)
- **Students**: Limit reduced from 5,000 to 500
- **Events**: Only loads last 2 years (was: all events)
- **Search**: Only searches last year of requests

See `LARGE_DATASET_OPTIMIZATION.md` for more details.

### 2. Query Optimization
- Only select needed columns (not `*`)
- Added reasonable limits to prevent large result sets
- Batched queries where possible (e.g., events with attendees)

### 3. AdminHourManagementScreen Optimization
- Now uses cached data from `HourContext` first
- Only makes new queries when necessary (search/filter)
- Falls back to cached data on errors

---

## 🔧 Additional Optimizations You Can Apply

### 1. Add Query Retry Logic (Optional)

If you want automatic retries for failed queries, add this to `SupabaseService.ts`:

```typescript
// Helper function for retry logic
static async withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (i === maxRetries - 1) throw error;
      if (error.code === '57014' || error.message?.includes('timeout')) {
        console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries reached');
}

// Use it in getAllHourRequests:
static async getAllHourRequests() {
  return this.withRetry(async () => {
    const { data, error } = await supabase
      .from('hour_requests')
      .select('...')
      .eq('status', 'pending')
      .limit(100);
    if (error) throw error;
    return data || [];
  });
}
```

### 2. Implement Request Caching

Add to `HourContext.tsx`:

```typescript
const [cache, setCache] = useState<{
  data: HourRequest[];
  timestamp: number;
} | null>(null);

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const loadHourRequests = useCallback(async (forceRefresh: boolean = false) => {
  // Use cache if fresh
  if (!forceRefresh && cache && Date.now() - cache.timestamp < CACHE_DURATION) {
    console.log('📦 Using cached hour requests');
    setHourRequests(cache.data);
    return;
  }
  
  // Load fresh data
  const requests = await SupabaseService.getAllHourRequests();
  setHourRequests(requests);
  setCache({ data: requests, timestamp: Date.now() });
}, [cache]);
```

### 3. Lazy Load Non-Critical Data

Instead of loading everything on app start:

```typescript
// In App.tsx or router, only load critical data initially
// Load admin screens data only when accessed
const loadAdminData = useCallback(async () => {
  if (!adminDataLoaded && isAdmin) {
    // Load admin-specific data
    await loadStudents();
    await loadHourRequests();
    setAdminDataLoaded(true);
  }
}, [isAdmin, adminDataLoaded]);
```

---

## 📊 Performance Monitoring

Add performance logging to track query times:

```typescript
static async getAllHourRequests() {
  const startTime = performance.now();
  try {
    const { data, error } = await supabase...
    const duration = performance.now() - startTime;
    console.log(`⏱️ getAllHourRequests took ${duration.toFixed(2)}ms`);
    return data || [];
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`❌ Query failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}
```

---

## 🎯 Quick Wins

1. **Apply indexes** (most important!) - Run `scripts/add_performance_indexes.sql`
2. **Check Supabase dashboard** - Look at query performance and slow queries
3. **Reduce limits if needed** - If 100 is too many, try 50
4. **Add loading skeletons** - Better UX while waiting
5. **Show cached data first** - Already implemented in AdminHourManagementScreen

---

## 🐛 Debugging Slow Queries

1. **Check Supabase Dashboard → Database → Query Performance**
   - Look for queries taking > 1 second
   - Check for missing indexes warnings

2. **Enable query logging**:
   ```typescript
   // In supabaseClient.ts
   export const supabase = createClient(url, key, {
     // ... existing config
     global: {
       headers: {
         // ...
         'x-debug': 'true' // Enable debug mode
       }
     }
   });
   ```

3. **Check network tab**:
   - Look for slow Supabase requests
   - Check response sizes
   - Look for 500 errors or timeouts

---

## 📈 Expected Performance After Fixes

- **Before indexes**: 2-10+ seconds, frequent timeouts
- **After indexes**: < 500ms for most queries
- **With caching**: < 50ms for cached data

---

## ⚠️ Common Issues

### Issue: Still getting timeouts after indexes
**Solution**: 
- Check if indexes were actually created (run the verify query)
- Ensure you're querying indexed columns
- Consider reducing query limits

### Issue: Queries are fast but UI feels slow
**Solution**: 
- Check React re-renders (use React DevTools)
- Implement proper loading states
- Add skeleton loaders

### Issue: Data is stale
**Solution**: 
- Reduce cache duration
- Add refresh buttons
- Use context refresh functions

---

## 📝 Summary

1. ✅ **MUST DO**: Run the index script
2. ✅ **Already done**: Error handling, query limits, caching in AdminHourManagementScreen
3. ⚠️ **Optional**: Add retry logic, implement full caching, lazy loading
4. 📊 **Monitor**: Check Supabase dashboard for query performance

**Most important**: Apply the database indexes. Everything else is secondary.
