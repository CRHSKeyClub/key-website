# Migration Guide: Supabase → Neon PostgreSQL

This guide shows **exactly** what would need to change to migrate from Supabase to Neon PostgreSQL.
**This is a reference guide only - it doesn't actually make the changes.**

---

## Overview

**What Would Change:**
- Replace `@supabase/supabase-js` with `postgres.js` (direct SQL connections)
- Replace Supabase query builder syntax with raw SQL
- Handle authentication separately (Neon doesn't have built-in auth)
- Update connection handling

**Why Neon:**
- **3 GB database** (vs 0.5 GB Supabase free)
- **500 GB egress/month** (vs 5 GB Supabase free)
- Still PostgreSQL (same database engine)
- Free forever

**Migration Complexity:** Medium (2-3 hours)
**Code Changes:** ~200 lines in `SupabaseService.ts` need rewriting

---

## Step 1: Install New Dependencies

### Current (Supabase):
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.49.10"
  }
}
```

### New (Neon):
```json
{
  "dependencies": {
    "postgres": "^3.4.3"
  }
}
```

**Command:**
```bash
npm uninstall @supabase/supabase-js
npm install postgres
```

---

## Step 2: Update Connection Client

### Current: `src/services/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zvoavkzruhnzzeqyihrc.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGci...'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### New: `src/services/neonClient.ts`

```typescript
import postgres from 'postgres'

// Neon connection string format:
// postgresql://username:password@host.neon.tech/dbname?sslmode=require
const neonConnectionString = import.meta.env.VITE_NEON_DATABASE_URL || 
  'postgresql://username:password@xxxxx.neon.tech/dbname?sslmode=require'

// Create postgres connection pool
export const sql = postgres(neonConnectionString, {
  max: 10, // Connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
})
```

**What Changed:**
- ✅ Direct PostgreSQL connection instead of Supabase REST API
- ✅ Connection string instead of URL + key
- ✅ SQL queries instead of query builder

---

## Step 3: Update Environment Variables

### Current `.env`:
```env
VITE_SUPABASE_URL=https://zvoavkzruhnzzeqyihrc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### New `.env`:
```env
VITE_NEON_DATABASE_URL=postgresql://username:password@xxxxx.neon.tech/dbname?sslmode=require
```

**How to Get Neon Connection String:**
1. Sign up at https://neon.tech
2. Create a project
3. Go to "Connection Details"
4. Copy the connection string

---

## Step 4: Rewrite SupabaseService.ts

This is the **biggest change**. Here's how queries would change:

### Example 1: Get All Hour Requests

#### Current (Supabase):
```typescript
static async getAllHourRequests() {
  const { data, error } = await supabase
    .from('hour_requests')
    .select('id, student_s_number, student_name, event_name, event_date, hours_requested, description, type, status, submitted_at, reviewed_at, reviewed_by, admin_notes, image_name')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(25);

  if (error) throw error;
  return data || [];
}
```

#### New (Neon with postgres.js):
```typescript
static async getAllHourRequests() {
  try {
    const data = await sql`
      SELECT 
        id, 
        student_s_number, 
        student_name, 
        event_name, 
        event_date, 
        hours_requested, 
        description, 
        type, 
        status, 
        submitted_at, 
        reviewed_at, 
        reviewed_by, 
        admin_notes, 
        image_name
      FROM hour_requests
      WHERE status = 'pending'
      ORDER BY submitted_at ASC
      LIMIT 25
    `;
    
    return data || [];
  } catch (error) {
    console.error('Error getting all hour requests:', error);
    throw error;
  }
}
```

**What Changed:**
- ✅ `.from()` → `FROM` in SQL
- ✅ `.select()` → `SELECT` in SQL
- ✅ `.eq()` → `WHERE ... =` in SQL
- ✅ `.order()` → `ORDER BY` in SQL
- ✅ `.limit()` → `LIMIT` in SQL
- ✅ `sql` tagged template literal instead of query builder

---

### Example 2: Search Hour Requests

#### Current (Supabase):
```typescript
static async searchHourRequests(searchTerm: string, status: string = 'pending', limit: number = 100) {
  let query = supabase
    .from('hour_requests')
    .select('id, student_s_number, student_name, ...')
    .eq('status', status)
    .gte('submitted_at', twoYearsAgo.toISOString());

  if (searchTerm.trim()) {
    const searchPattern = `%${searchTerm.trim()}%`;
    query = query.or(`student_name.ilike.${searchPattern},student_s_number.ilike.${searchPattern},event_name.ilike.${searchPattern}`);
  }

  query = query
    .order('submitted_at', { ascending: true })
    .limit(limit);

  const { data, error } = await query;
  return data || [];
}
```

#### New (Neon):
```typescript
static async searchHourRequests(searchTerm: string, status: string = 'pending', limit: number = 100) {
  try {
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    let query = sql`
      SELECT 
        id, student_s_number, student_name, event_name, event_date,
        hours_requested, type, status, submitted_at, reviewed_at, 
        reviewed_by, image_name
      FROM hour_requests
      WHERE status = ${status}
        AND submitted_at >= ${twoYearsAgo.toISOString()}
    `;

    if (searchTerm.trim()) {
      const searchPattern = `%${searchTerm.trim()}%`;
      query = sql`
        ${query}
        AND (
          LOWER(student_name) LIKE LOWER(${searchPattern})
          OR LOWER(student_s_number) LIKE LOWER(${searchPattern})
          OR LOWER(event_name) LIKE LOWER(${searchPattern})
          OR LOWER(description) LIKE LOWER(${searchPattern})
        )
      `;
    }

    const data = await sql`
      ${query}
      ORDER BY submitted_at ASC
      LIMIT ${limit}
    `;

    return data || [];
  } catch (error) {
    console.error('Error searching hour requests:', error);
    throw error;
  }
}
```

**What Changed:**
- ✅ Query builder chaining → SQL string concatenation
- ✅ `.or()` → `OR` conditions in SQL
- ✅ `.ilike()` → `LOWER() LIKE` in SQL
- ✅ Parameterized queries with `${variable}` syntax

---

### Example 3: Insert Hour Request

#### Current (Supabase):
```typescript
static async submitHourRequest(requestData: any) {
  const { data, error } = await supabase
    .from('hour_requests')
    .insert([{
      student_s_number: requestData.student_s_number,
      student_name: requestData.student_name,
      event_name: requestData.event_name,
      event_date: requestData.event_date,
      hours_requested: requestData.hours_requested,
      description: requestData.description,
      type: requestData.type || 'volunteering',
      status: 'pending',
      submitted_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### New (Neon):
```typescript
static async submitHourRequest(requestData: any) {
  try {
    const [data] = await sql`
      INSERT INTO hour_requests (
        student_s_number,
        student_name,
        event_name,
        event_date,
        hours_requested,
        description,
        type,
        status,
        submitted_at
      )
      VALUES (
        ${requestData.student_s_number},
        ${requestData.student_name},
        ${requestData.event_name},
        ${requestData.event_date},
        ${requestData.hours_requested},
        ${requestData.description},
        ${requestData.type || 'volunteering'},
        'pending',
        ${new Date().toISOString()}
      )
      RETURNING *
    `;

    return data;
  } catch (error) {
    console.error('Error submitting hour request:', error);
    throw error;
  }
}
```

**What Changed:**
- ✅ `.insert([{...}])` → `INSERT INTO ... VALUES` SQL
- ✅ `.select().single()` → `RETURNING *` in SQL
- ✅ Array destructuring `[data]` to get first row

---

### Example 4: Update Hour Request Status

#### Current (Supabase):
```typescript
static async updateHourRequestStatus(
  requestId: string,
  status: string,
  adminNotes: string = '',
  reviewedBy: string = 'Admin',
  hoursRequested: number | null = null
) {
  const { data, error } = await supabase
    .from('hour_requests')
    .update({
      status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
      admin_notes: adminNotes
    })
    .eq('id', requestId)
    .select()
    .single();

  if (error) throw error;
  
  // ... handle status update logic
  return data;
}
```

#### New (Neon):
```typescript
static async updateHourRequestStatus(
  requestId: string,
  status: string,
  adminNotes: string = '',
  reviewedBy: string = 'Admin',
  hoursRequested: number | null = null
) {
  try {
    const [data] = await sql`
      UPDATE hour_requests
      SET 
        status = ${status},
        reviewed_at = ${new Date().toISOString()},
        reviewed_by = ${reviewedBy},
        admin_notes = ${adminNotes}
      WHERE id = ${requestId}
      RETURNING *
    `;

    if (!data) {
      throw new Error('Hour request not found');
    }

    // ... handle status update logic (same as before)
    // Update student hours, etc.
    
    return data;
  } catch (error) {
    console.error('Error updating hour request status:', error);
    throw error;
  }
}
```

**What Changed:**
- ✅ `.update({...})` → `UPDATE ... SET` SQL
- ✅ `.eq('id', requestId)` → `WHERE id = ${requestId}` SQL
- ✅ `.select().single()` → `RETURNING *` in SQL

---

### Example 5: Delete Hour Request

#### Current (Supabase):
```typescript
static async deleteHourRequest(requestId: string) {
  const { error } = await supabase
    .from('hour_requests')
    .delete()
    .eq('id', requestId);

  if (error) throw error;
}
```

#### New (Neon):
```typescript
static async deleteHourRequest(requestId: string) {
  try {
    await sql`
      DELETE FROM hour_requests
      WHERE id = ${requestId}
    `;
  } catch (error) {
    console.error('Error deleting hour request:', error);
    throw error;
  }
}
```

**What Changed:**
- ✅ `.delete().eq()` → `DELETE FROM ... WHERE` SQL

---

## Step 5: Update All SupabaseService Methods

You'd need to convert **every method** in `SupabaseService.ts`. Here's the pattern:

### Common Conversions:

| Supabase Syntax | Neon SQL Syntax |
|----------------|-----------------|
| `.from('table')` | `FROM table` |
| `.select('col1, col2')` | `SELECT col1, col2` |
| `.eq('col', value)` | `WHERE col = ${value}` |
| `.ne('col', value)` | `WHERE col != ${value}` |
| `.gt('col', value)` | `WHERE col > ${value}` |
| `.gte('col', value)` | `WHERE col >= ${value}` |
| `.lt('col', value)` | `WHERE col < ${value}` |
| `.lte('col', value)` | `WHERE col <= ${value}` |
| `.like('col', pattern)` | `WHERE col LIKE ${pattern}` |
| `.ilike('col', pattern)` | `WHERE LOWER(col) LIKE LOWER(${pattern})` |
| `.in('col', [a, b])` | `WHERE col IN (${a}, ${b})` |
| `.order('col', {asc: true})` | `ORDER BY col ASC` |
| `.limit(10)` | `LIMIT 10` |
| `.single()` | `RETURNING *` + destructure `[data]` |
| `.insert([{...}])` | `INSERT INTO ... VALUES ... RETURNING *` |
| `.update({...})` | `UPDATE ... SET ... RETURNING *` |
| `.delete()` | `DELETE FROM ... WHERE ...` |

---

## Step 6: Handle Authentication

**This is a bigger change** because Supabase has built-in auth, but Neon doesn't.

### Current (Supabase Auth):
```typescript
// In AuthContext.tsx
const loginStudent = async (sNumber: string, password: string) => {
  // Supabase handles password hashing, sessions, etc.
  const result = await SupabaseService.loginStudent(sNumber, password);
  // Stores session automatically
}
```

### New (Neon - Manual Auth):
```typescript
// In AuthContext.tsx
import bcrypt from 'bcryptjs';

const loginStudent = async (sNumber: string, password: string) => {
  // Need to manually query auth_users table
  const [user] = await sql`
    SELECT * FROM auth_users
    WHERE s_number = ${sNumber.toLowerCase()}
  `;

  if (!user) {
    throw new Error('User not found');
  }

  // Manually verify password
  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    throw new Error('Invalid password');
  }

  // Manually store session in localStorage
  localStorage.setItem('user', JSON.stringify(user));
  
  return user;
}
```

**What You'd Need to Add:**
- ✅ `bcryptjs` package for password hashing
- ✅ Manual session management (localStorage)
- ✅ JWT tokens (if you want sessions)
- ✅ Password reset logic
- ✅ Registration logic with password hashing

---

## Step 7: Update Storage (if using Supabase Storage)

### Current (Supabase Storage):
```typescript
const { error } = await supabase.storage
  .from('proof-photos')
  .upload(fileName, fileData);
```

### New (Neon - No Built-in Storage):
You'd need to use a separate storage service:
- **Cloudinary** (free tier: 25 GB)
- **AWS S3** (pay-as-you-go)
- **Backblaze B2** (cheap: $5/TB)
- **Store base64 in database** (simpler but uses DB space)

---

## Step 8: Migrate Data

### Export from Supabase:
```bash
# Using pg_dump (PostgreSQL tool)
pg_dump -h zvoavkzruhnzzeqyihrc.supabase.co \
        -U postgres \
        -d postgres \
        --no-owner \
        --no-acl \
        > supabase_backup.sql
```

### Import to Neon:
```bash
# Using psql
psql "postgresql://user:pass@xxxxx.neon.tech/dbname?sslmode=require" \
     < supabase_backup.sql
```

---

## Step 9: Update All Import Statements

### Current:
```typescript
// src/services/SupabaseService.ts
import { supabase } from './supabaseClient';
```

### New:
```typescript
// src/services/SupabaseService.ts
import { sql } from './neonClient';
```

---

## Summary: What Would Change

### Files That Need Updates:
1. ✅ `package.json` - Replace `@supabase/supabase-js` with `postgres`
2. ✅ `src/services/supabaseClient.ts` → Rename to `neonClient.ts`
3. ✅ `src/services/SupabaseService.ts` - Rewrite all ~200 queries
4. ✅ `src/contexts/AuthContext.tsx` - Rewrite auth logic
5. ✅ All files importing from `supabaseClient` - Update imports
6. ✅ `.env` file - Add Neon connection string

### Estimated Time:
- **Setup**: 30 minutes
- **Query Rewriting**: 2-3 hours (for all ~200 queries)
- **Auth Rewriting**: 1-2 hours
- **Testing**: 1-2 hours
- **Total**: 4-7 hours

### Lines of Code:
- **SupabaseService.ts**: ~2,300 lines → Need to rewrite ~800 lines
- **AuthContext.tsx**: ~300 lines → Need to rewrite ~150 lines
- **Other files**: ~50 import statements to update

---

## Pros & Cons

### Pros:
- ✅ 6x more database space (3 GB vs 0.5 GB)
- ✅ 100x more egress (500 GB vs 5 GB)
- ✅ Free forever
- ✅ Still PostgreSQL (same queries work)
- ✅ Serverless (scales to zero)

### Cons:
- ❌ 4-7 hours of migration work
- ❌ Need to rewrite all queries to SQL
- ❌ No built-in auth (need to build yourself)
- ❌ No built-in storage (need separate service)
- ❌ No REST API (need direct SQL)
- ❌ Different dashboard

---

## Would You Like Me To...?

1. **Create the actual migration code** (I'll rewrite SupabaseService.ts for Neon)
2. **Just keep the guide** (you decide when to migrate)
3. **Help upgrade Supabase Pro instead** (easier, costs $25/month)

Let me know which option you prefer!
