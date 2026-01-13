# Supabase Query Analysis

## Queries on Initial App Load

When the app first loads, the following contexts initialize and make queries:

### 1. EventsContext (loadEvents)
**Makes 3 queries:**
1. `SELECT * FROM events ORDER BY event_date`
   - Gets all events
2. `SELECT * FROM event_attendees WHERE event_id IN (...) ORDER BY registered_at`
   - Gets all attendees for those events (batched in one query)
3. `SELECT id, s_number FROM auth_users WHERE id IN (...)`
   - Maps attendee student_ids to s_numbers (only if there are attendees with student_ids)

**Total: 1-3 queries** (depends on whether events have attendees)

### 2. HourContext (loadHourRequests)
**Makes 1 query:**
1. `SELECT ... FROM hour_requests WHERE status = 'pending' ORDER BY submitted_at LIMIT 100`
   - Gets all pending hour requests

**Total: 1 query**

### 3. AuthContext
**Makes 0 queries on initial load**
- Only reads from localStorage (no database query)

---

## Total Queries on Initial Load: **2-4 queries**

- Minimum: 2 queries (events + hour_requests)
- Maximum: 4 queries (events + event_attendees + auth_users + hour_requests)

---

## Additional Queries by Screen

### AdminHourManagementScreen
- **On load**: May call `getAllHourRequests()` again (redundant if already loaded in context)
- **On refresh**: 1 query to reload hour requests

### AdminStudentManagementScreen
- **On load**: Calls `getAllStudents()`
  - Query 1: `SELECT * FROM students ORDER BY name LIMIT 5000`
  - Query 2: `SELECT s_number FROM auth_users LIMIT 5000`
  - **Total: 2 queries**

### Other Admin Screens
Similar patterns - typically 1-2 queries per screen load

---

## Potential Issues

### N+1 Query Problem
Currently, `getAllEvents()` does **well** - it batches:
- All events in 1 query
- All attendees in 1 query (using `IN` clause)
- All auth_users in 1 query (using `IN` clause)

✅ **No N+1 problem here**

### Redundant Queries
⚠️ **Issue**: `AdminHourManagementScreen` may call `getAllHourRequests()` even though `HourContext` already loaded it on app init.

### Query Optimization Opportunities

1. **Event Loading**: Could use Supabase joins to combine into 1-2 queries instead of 3:
   ```sql
   SELECT events.*, event_attendees.*, auth_users.s_number
   FROM events
   LEFT JOIN event_attendees ON events.id = event_attendees.event_id
   LEFT JOIN auth_users ON event_attendees.student_id = auth_users.id
   ```
   However, Supabase PostgREST makes this tricky with nested selects.

2. **Students Loading**: The `getAllStudents()` function makes 2 separate queries that could potentially be optimized.

3. **Caching**: Consider caching results in context to avoid redundant queries when navigating between screens.

---

## Recommendations

1. ✅ **Already good**: Events loading is well-optimized with batched queries
2. ⚠️ **Consider**: Cache hour requests in context to avoid reloading when navigating to AdminHourManagementScreen
3. ⚠️ **Consider**: Lazy load student data only when admin screens are accessed
4. ✅ **Already fixed**: Added timeout error handling and query limits

---

## Query Count Summary

| Operation | Query Count | Notes |
|-----------|-------------|-------|
| Initial App Load | 2-4 | Events (1-3) + Hour Requests (1) |
| Navigate to Admin Student Screen | +2 | Student list + Auth users |
| Navigate to Admin Hour Screen | +0-1 | May reload if not cached |
| Refresh Events | +1-3 | Reloads all events |
| Refresh Hour Requests | +1 | Reloads hour requests |
