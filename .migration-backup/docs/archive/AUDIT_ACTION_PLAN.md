# ⚡ ACTION PLAN — IMMEDIATE FIXES (48 Hours)

**Created:** June 5, 2026  
**Status:** 🔴 URGENT  
**Deadline:** June 6, 2026 EOD  

---

## 🎯 Mission: Achieve Deployable Security

**Current:** 🔴 CRITICAL (4 P0 vulns)  
**Target:** 🟡 ACCEPTABLE (no P0s)  
**Effort:** 20 hours  
**Timeline:** 48 hours max  

---

## TASK 1: Fix SQL Injection (1 hour)

**File:** `app/api/data/upsert/route.ts`

**Current (Line 30-31):**
```typescript
const { table, data, conflictColumn = "id" } = await request.json()
const { data: result, error } = await supabase.from(table).upsert(data)
```

**Fix:**
```typescript
// Add at the top of the file
const ALLOWED_TABLES = [
  'fl_commandes',
  'fl_articles', 
  'fl_clients',
  'fl_bons_achat',
  'fl_bons_livraison',
  'fl_bons_preparation'
]

export async function POST(request: NextRequest) {
  const { table, data, conflictColumn = "id" } = await request.json()
  
  // ✅ ADD THIS VALIDATION
  if (!ALLOWED_TABLES.includes(table)) {
    return NextResponse.json(
      { error: `Table '${table}' is not allowed` },
      { status: 403 }
    )
  }
  
  const { data: result, error } = await supabase
    .from(table)
    .upsert(data, { onConflict: conflictColumn })
}
```

**Verification:**
```bash
# Test 1: Valid table (should work)
curl -X POST http://localhost:3000/api/data/upsert \
  -H "Content-Type: application/json" \
  -d '{"table":"fl_articles","data":[]}'

# Test 2: Invalid table (should return 403)
curl -X POST http://localhost:3000/api/data/upsert \
  -H "Content-Type: application/json" \
  -d '{"table":"fl_users","data":[]}'
```

---

## TASK 2: Remove Hardcoded Demo Passwords (4 hours)

**File:** `lib/store.ts`

**Current (Line 932):**
```typescript
const DEMO_PWD = process.env.NEXT_PUBLIC_DEMO_PWD ?? "1234"  // ❌ UNSAFE

const DEFAULT_USERS = [
  { id: "u1", name: "Super Admin", email: "admin@freshlink.ma", password: DEMO_PWD, ... },
  // ... 14 more accounts
]
```

**Fix Option 1 (Immediate):**
```typescript
// Completely remove DEFAULT_USERS in production
const DEFAULT_USERS = process.env.NODE_ENV === 'development'
  ? [
      {
        id: "dev1",
        name: "Dev Admin",
        email: "dev@example.com",
        password: process.env.DEV_PASSWORD || "GenerateRandomPasswordHere123!",
        role: "super_admin"
      }
    ]
  : []  // ✅ NO accounts in production

// Alternative: Load from environment only
const loadDemoUsers = (): User[] => {
  if (process.env.NODE_ENV !== 'development') return []
  
  const demoJsonStr = process.env.DEMO_USERS_JSON
  if (!demoJsonStr) return []
  
  try {
    return JSON.parse(demoJsonStr)
  } catch {
    console.warn("Could not parse DEMO_USERS_JSON")
    return []
  }
}

const DEFAULT_USERS = loadDemoUsers()
```

**Verification:**
```bash
# 1. Delete .env file or ensure NEXT_PUBLIC_DEMO_PWD is NOT set
rm .env

# 2. Build and check
npm run build

# 3. Try to login
# Admin login should FAIL with "Invalid credentials"
# This confirms no default users exist
```

---

## TASK 3: Remove Auth Fallback (4 hours)

**File:** `lib/auth/supabaseAuth.ts` (Line 120)

**Current:**
```typescript
export async function signInWithEmailFallback(
  email: string,
  password: string
): Promise<User | null> {
  try {
    const result = await signInWithEmail(email, password)
    if ("user" in result) return result.user
    
    // ❌ FALLBACK TO WEAK AUTH
    return store.login(email, password)
  } catch {
    // ❌ ANOTHER FALLBACK
    return store.login(email, password)
  }
}
```

**Fix:**
```typescript
export async function signInWithEmailFallback(
  email: string,
  password: string
): Promise<User | null> {
  try {
    const result = await signInWithEmail(email, password)
    if ("user" in result) return result.user
    
    // ✅ FAIL IMMEDIATELY - NO FALLBACK
    throw new Error("Invalid email or password")
  } catch (err) {
    // ✅ Log error but don't fall back to weak auth
    console.error("[Auth] Login failed:", err instanceof Error ? err.message : "Unknown error")
    return null  // Return null, not fallback login
  }
}
```

**Update app/page.tsx (Line 50):**
```typescript
// OLD:
const user = await signInWithEmailFallback(email, password)

// NEW:
try {
  const user = await signInWithEmailFallback(email, password)
  if (!user) {
    setError("Authentication failed. Supabase may be unavailable.")
    return
  }
  // ... proceed with login
} catch (err) {
  setError(err instanceof Error ? err.message : "Login failed")
}
```

**Verification:**
```bash
# 1. Shutdown Supabase (simulate offline)
# 2. Try to login
# Should see: "Authentication failed. Supabase may be unavailable."
# NOT: Fallback to localStorage auth
```

---

## TASK 4: Enable RLS Policies (6 hours)

**File:** `scripts/011_rls_policies.sql`

**Current:**
```sql
-- RLS disabled, policies too permissive
CREATE POLICY "articles_select" ON public.fl_articles
  FOR SELECT
  USING (auth.role() = 'authenticated');
```

**Fix:**
1. Go to Supabase Dashboard → SQL Editor
2. Run this script:

```sql
-- Step 1: Enable RLS on all tables
ALTER TABLE fl_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_bons_achat ENABLE ROW LEVEL SECURITY;
ALTER TABLE fl_users ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop overly permissive policies
DROP POLICY IF EXISTS "articles_select" ON public.fl_articles;

-- Step 3: Add role-based policies
-- Articles: Only users with acheteur/admin can see article details
CREATE POLICY "articles_for_buyers" ON public.fl_articles
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM fl_users 
      WHERE id = auth.uid()
      AND role IN ('acheteur', 'admin', 'super_admin')
    )
  );

-- Commandes: Users see only their own orders
CREATE POLICY "commandes_own_only" ON public.fl_commandes
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM fl_users
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
      )
    )
  );

-- Admin: Can see everything
CREATE POLICY "admin_access_all" ON public.fl_articles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM fl_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
```

**Verification:**
```bash
# Test that RLS is working:
1. Create test user (non-admin)
2. Try to fetch another user's orders
3. Should return empty result (RLS blocks it)
4. Login as admin
5. Should see all orders
```

---

## TASK 5: Enable TypeScript Strict Mode (2 hours)

**Files:**
- `tsconfig.json`
- `next.config.js`

**Fix 1: tsconfig.json**
```json
{
  "compilerOptions": {
    "strict": true,              // ✅ ADD THIS
    "noImplicitAny": true,       // ✅ Change from false
    "strictNullChecks": true,    // ✅ Already there
    "strictFunctionTypes": true, // ✅ Already there
    "noUnusedLocals": true,      // ✅ ADD THIS
    "noUnusedParameters": true,  // ✅ ADD THIS
    "noImplicitReturns": true,   // ✅ ADD THIS
    "noFallthroughCasesInSwitch": true  // ✅ ADD THIS
  }
}
```

**Fix 2: next.config.js**
```javascript
const nextConfig = {
  reactStrictMode: true,
  
  // ✅ CHANGE THIS:
  typescript: { ignoreBuildErrors: false },  // Was: true
  // ✅ ADD ESLint:
  eslint: { ignoreDuringBuilds: false },    // Was likely missing
  
  // ... rest of config
}
```

**Fix 3: Resolve TypeScript errors**
```bash
npm run build 2>&1 | head -50
# Note all errors and fix them one by one
```

**Verification:**
```bash
npm run build
# Should complete without errors
# Should see "✓ Created .next"
```

---

## TASK 6: Fix Admin Authorization (Server-Side) (2 hours)

**File:** `app/admin/users/page.tsx`

**Current (Line 18):**
```typescript
const isAdmin = user && (
  user.role === "super_admin" ||
  user.role === "admin"
)
setAuthorized(isAdmin || false)  // ❌ Client-side only
```

**Fix:**
1. Create new API route:

**File:** `app/api/admin/verify/route.ts` (NEW)
```typescript
import { getCurrentUser } from "@/lib/auth/supabaseAuth"
import { NextResponse } from "next/server"

export async function GET() {
  const user = await getCurrentUser()
  
  if (!user) {
    return NextResponse.json(
      { authorized: false },
      { status: 401 }
    )
  }
  
  const isAdmin = user.role === "super_admin" || user.role === "admin"
  
  if (!isAdmin) {
    return NextResponse.json(
      { authorized: false },
      { status: 403 }
    )
  }
  
  return NextResponse.json({
    authorized: true,
    user: { id: user.id, role: user.role }
  })
}
```

2. Update `app/admin/users/page.tsx`:

```typescript
"use client"

import { useEffect, useState } from "react"
import BOUserManagement from "@/components/backoffice/BOUserManagement"

export default function AdminUsersPage() {
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        // ✅ Check on server, not client
        const res = await fetch("/api/admin/verify", {
          method: "GET",
          headers: { "Content-Type": "application/json" }
        })
        
        if (res.ok) {
          const data = await res.json()
          setAuthorized(data.authorized)
        } else {
          setAuthorized(false)
        }
      } catch (err) {
        console.error("Auth check failed:", err)
        setAuthorized(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!authorized) {
    return (
      <div className="p-8 text-red-600">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p>You don't have permission to access this page.</p>
      </div>
    )
  }

  return <BOUserManagement />
}
```

**Verification:**
```bash
# Test 1: Non-admin user
# Visit /admin/users
# Should see "Unauthorized" immediately

# Test 2: Admin user  
# Login as super_admin
# Visit /admin/users
# Should see the management interface
```

---

## TASK 7: Add Rate Limiting (2 hours)

**File:** `app/api/auth/signin/route.ts`

**Option 1: Using Upstash (Recommended)**

1. Sign up: https://upstash.com
2. Create Redis database
3. Get connection string

**Install:**
```bash
npm install @upstash/ratelimit redis
```

**Code:**
```typescript
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const limiter = new Ratelimit({
  redis,
  analytics: true,
  prefix: "ratelimit:signin",
  limiter: Ratelimit.slidingWindow(5, "15m")
})

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  // ✅ Check rate limit FIRST
  const { success, limit, reset, remaining } = await limiter.limit(email)
  
  if (!success) {
    return NextResponse.json(
      { 
        error: `Too many attempts. Please try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds.`
      },
      { status: 429 }
    )
  }

  // ... rest of signin logic
}
```

**Verification:**
```bash
# Try to login 6 times with wrong password
# On 6th attempt, should get 429 (Too Many Requests)
```

---

## 📋 Checklist (Copy-Paste)

```
TASK 1: Fix SQL Injection
☐ Edit app/api/data/upsert/route.ts
☐ Add ALLOWED_TABLES whitelist
☐ Test: invalid table returns 403
☐ Commit

TASK 2: Remove Demo Passwords
☐ Edit lib/store.ts
☐ Remove all DEFAULT_USERS OR load from env only
☐ Test: login fails with no demo users
☐ Commit

TASK 3: Remove Auth Fallback
☐ Edit lib/auth/supabaseAuth.ts
☐ Remove store.login() calls
☐ Return null on failure
☐ Test: offline = "Authentication failed" message
☐ Commit

TASK 4: Enable RLS
☐ Go to Supabase SQL Editor
☐ Run updated RLS policies
☐ Test: non-admin can't see other's orders
☐ Test: admin can see all

TASK 5: Enable TypeScript
☐ Edit tsconfig.json
☐ Edit next.config.js
☐ Run: npm run build
☐ Fix all type errors
☐ Commit

TASK 6: Server-Side Auth Check
☐ Create app/api/admin/verify/route.ts
☐ Update app/admin/users/page.tsx
☐ Test: DevTools can't bypass
☐ Commit

TASK 7: Add Rate Limiting
☐ Sign up at Upstash
☐ Install @upstash/ratelimit
☐ Update app/api/auth/signin/route.ts
☐ Test: 6 attempts = 429 error
☐ Commit

DEPLOY
☐ Push to main branch
☐ Vercel auto-deploys
☐ Check /api/health endpoint
☐ Manual smoke test
```

---

## Expected Outcome

After 48 hours:
- ✅ No SQL injection vulnerabilities
- ✅ No hardcoded passwords
- ✅ No auth bypass
- ✅ RLS policies enforced
- ✅ TypeScript strict mode
- ✅ Rate limiting active
- ✅ Ready for staging deployment

**Status:** 🟢 **DEPLOYABLE (with ongoing monitoring)**

---

**Assigned to:** Development Team  
**Started:** June 5, 2026  
**Deadline:** June 6, 2026, 5:00 PM  
**Review:** June 7, 2026, 10:00 AM

