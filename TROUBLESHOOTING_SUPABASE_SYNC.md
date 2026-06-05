# 🔧 TROUBLESHOOTING: Supabase Sync Error - fl_notices.payload

**Error Message:**
```
Erreur Supabase Sync — table: fl_notices
column fl_notices.payload does not exist (code: 42703) (code: read_error)
```

**Date Encountered:** June 5, 2026  
**Status:** Investigating  

---

## 🔍 DIAGNOSIS

### Error Code 42703
- **PostgreSQL Code:** UNDEFINED_COLUMN
- **Meaning:** Column does not exist in table
- **Root Cause:** Either:
  1. Table `fl_notices` doesn't exist
  2. Column `payload` was not created
  3. Migration was incomplete
  4. RLS policies are blocking access

---

## 📋 TROUBLESHOOTING STEPS

### Step 1: Verify Table Exists

**In Supabase Dashboard:**

1. Go to SQL Editor
2. Run:
```sql
SELECT * FROM fl_notices LIMIT 1;
```

**Expected Result:**
- If table exists: Shows data or "0 rows"
- If table missing: Error "relation "fl_notices" does not exist"

**If missing:** Table needs to be created via migration

### Step 2: Verify Column Exists

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name='fl_notices' 
ORDER BY ordinal_position;
```

**Expected Result:**
- Lists all columns including `payload`
- If `payload` missing: Column needs to be added

### Step 3: Check RLS Policies

```sql
SELECT * FROM pg_policies 
WHERE tablename = 'fl_notices';
```

**Expected Result:**
- Shows RLS policies for fl_notices
- If none: RLS might not be enabled

### Step 4: Verify RLS is Enabled

```sql
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename='fl_notices';
```

**Expected Result:**
- `rowsecurity: true` if RLS is enabled
- `rowsecurity: false` if RLS is disabled

---

## 🛠️ COMMON SOLUTIONS

### Solution 1: Create Missing Table

If table doesn't exist, you need to run the migration:

```sql
CREATE TABLE IF NOT EXISTS fl_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES fl_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE fl_notices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can see own notices" ON fl_notices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can see all notices" ON fl_notices
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM fl_users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  );
```

### Solution 2: Add Missing Column

If table exists but `payload` is missing:

```sql
ALTER TABLE fl_notices 
ADD COLUMN payload JSONB DEFAULT '{}'::jsonb;
```

### Solution 3: Fix Permissions

If RLS policies are blocking access:

```sql
-- Check current user role
SELECT auth.uid(), role FROM fl_users 
WHERE id = auth.uid();

-- If user is admin, policies should allow access
-- If user is normal, they can only see their own notices
```

### Solution 4: Check Migration Files

Look for the migration that creates `fl_notices`:

```bash
ls -la scripts/ | grep -i notices
ls -la supabase/migrations/ | grep -i notices
```

If migration file exists but wasn't applied:
1. Go to Supabase Dashboard
2. SQL Editor
3. Copy entire migration file content
4. Paste and execute

---

## 🔗 WHERE IS payload USED?

Search codebase for `payload` usage:

```bash
grep -r "\.payload" app/ lib/ --include="*.ts" --include="*.tsx"
```

This shows which components are trying to access the `payload` column.

---

## 📊 CORRELATION WITH PHASE 1 FIXES

**Note:** This error is **NOT caused by Phase 1 security fixes.**

Phase 1 modified:
- ✅ app/api/data/upsert/route.ts (SQL injection fix)
- ✅ Authentication endpoints
- ✅ Admin verification
- ❌ Did NOT touch fl_notices table schema

**Root Cause:** Database schema mismatch - likely due to:
1. Incomplete migration deployment
2. Supabase environment not synced
3. Old codebase version expecting different schema

---

## 🚀 RESOLUTION STEPS

### For Development

1. **Verify Supabase connection:**
```bash
npx supabase status
```

2. **Check migrations applied:**
```bash
npx supabase migration list
```

3. **Apply pending migrations:**
```bash
npx supabase db push
```

### For Production (Vercel)

1. **Verify environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` set correctly
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches Supabase project

2. **Check Supabase Dashboard:**
   - Verify fl_notices table exists in production
   - Verify payload column exists
   - Verify RLS policies applied

3. **If table missing in production:**
   - Apply migration manually in Supabase Dashboard SQL Editor
   - OR use Supabase CLI: `npx supabase db push --linked`

---

## 📞 NEXT STEPS

1. Run diagnostic queries from Step 1-4 above
2. Identify which step fails
3. Apply corresponding solution
4. Test with query: `SELECT payload FROM fl_notices LIMIT 1;`
5. If error persists, check application logs for more context

---

## 🔗 RELATED FILES

- Migration files: `scripts/*.sql` or `supabase/migrations/*.sql`
- RLS policies: `scripts/011_rls_policies.sql`
- Table definitions: Search in schema files

---

**Status:** Awaiting diagnostic results  
**Estimated Resolution Time:** 15-30 minutes  
**Severity:** Medium (affects sync functionality, not security)

---

*This error is not related to the Phase 1 security remediation. It appears to be a database schema synchronization issue.*
