# 🗄️ AUDIT CTO — PHASE 3: SUPABASE & DATABASE

**Date:** June 5, 2026  
**Status:** 🔴 CRITICAL SCHEMA ISSUES

---

## 🔍 Supabase Analysis

### Problem #1: 18 Different SQL Files
**Severity:** CRITICAL

```
Evidence:
./public/supabase-liaison.sql                    ← Which one is used?
./scripts/010_schema_final.sql
./scripts/020_schema_v12_final.sql               ← v12? What about v3-v11?
./scripts/FRESHLINK_SUPABASE_SETUP.sql           ← Another version?
./scripts/MASTER_schema_liaison.sql              ← Or this one?
./supabase/schema_v2.sql
./supabase/schema_v3_vita_core.sql               ← Different? Same?
./supabase-fix-rls.sql                           ← Fixing what?
```

### The Problem:
1. **Unknown deployed state** - Which schema is actually in Supabase?
2. **Impossible to rollback** - No version history
3. **Data consistency risk** - Might have incompatible schemas
4. **Migration hell** - Next deploy could break everything
5. **No automation** - Manual SQL copy-paste deployment

### Quick Test:
```bash
# Run in Supabase SQL Editor:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

# You'll see tables that might not match ANY of your 18 files
```

---

## 🔐 RLS (Row Level Security) Analysis

### Issue: RLS Disabled or Weak

From `supabase-fix-rls.sql`:
```sql
-- ÉTAPE 1 : Désactiver RLS sur toutes les tables fl_*
-- Cette app utilise son propre système d'auth (localStorage)
```

**What this means:**
- ❌ RLS is turned OFF
- ❌ Any authenticated Supabase user can read/write ANY row
- ❌ Mobile app can see other users' data
- ❌ Massive security hole

### Current Policy:
```sql
CREATE POLICY "lecture_publique_articles" ON public.fl_articles
  (Anyone can read all articles)
```

**The flaw:**
- No per-user data isolation
- One leak = all data exposed
- GDPR violation (can't restrict data access)

### Required Fix:
```sql
-- For each table, enforce:
CREATE POLICY "users_own_data" ON fl_commandes
  AS SELECT
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "admins_see_all" ON fl_commandes
  AS SELECT
  USING (auth.jwt()->>'role' = 'super_admin');
```

---

## 📊 Table Inventory Analysis

Based on files found, probable tables:

```
fl_users          ← User accounts
fl_clients        ← Customer data
fl_articles       ← Product catalog
fl_commandes      ← Orders
fl_bons_achat     ← Purchase orders
fl_stock          ← Inventory
fl_livraisons     ← Shipments
fl_finances       ← Accounting
fl_quality        ← QA data
fl_messages       ← Communications
fl_motifs_retour  ← Return reasons
fl_depots         ← Warehouses
```

### Problems:

1. **Unclear relationships**
   - Do fl_commandes link to fl_clients?
   - Which table is the source of truth for prices?
   - How do returns affect stock?

2. **No foreign key constraints** (likely)
   - Can delete a client with active orders
   - Can modify article prices retroactively
   - Data consistency at risk

3. **No cascade rules**
   - Deleting a client might leave orphaned orders

4. **Missing audit tables**
   - No history of price changes
   - No deletion audit trail
   - Compliance issues

---

## 🔑 Index Analysis

From `supabase-fix-rls.sql`, likely missing indexes:

```sql
-- Probably missing:
CREATE INDEX idx_commandes_client_id ON fl_commandes(client_id);
CREATE INDEX idx_commandes_status ON fl_commandes(statut);
CREATE INDEX idx_commandes_date ON fl_commandes(created_at DESC);
CREATE INDEX idx_stock_article_depot ON fl_stock(article_id, depot_id);
CREATE INDEX idx_bons_status_date ON fl_bons_achat(statut, created_at DESC);
```

**Impact:** Slow queries for reports (expensive N+1 queries)

---

## 📈 Performance Issues (Expected)

### Problem: Service Role Key Usage

From API routes:
```typescript
const SB_SERVER_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// This bypasses ALL RLS policies
const res = await fetch(`${SB_URL}/rest/v1/fl_commandes`, {
  headers: { Authorization: `Bearer ${SB_SERVER_KEY}` }
})
```

**Why it's bad:**
1. Service role fetches ALL rows (no filtering)
2. Then filtered in JavaScript
3. Wasteful network + memory
4. Scales terribly with data growth
5. Expensive Supabase compute

**Example problem:**
- Fetching 1 million orders to filter for one user = disaster
- Should use RLS to filter server-side

---

## 🚨 Hardcoded Test Users

From `app/api/ext/auth/route.ts`:

```typescript
const FALLBACK_USERS = [
  {
    id: "VFU00001",
    name: "Jawad",
    email: "jawad@vita-fresh.ma",
    telephone: "0647333456",
    password: "Medghaly@22",  ← HARDCODED IN CODE!
    role: "super_super_admin"
  }
]
```

**Risks:**
1. Password in git history (never removable)
2. Anyone with code access can login as admin
3. No password rotation
4. Exposed in production

---

## 📋 Missing Features

Essential for production:

- [ ] Backup strategy
- [ ] Point-in-time recovery
- [ ] Data export (GDPR)
- [ ] Audit logging
- [ ] Change data capture (CDC)
- [ ] Replication to analytics DB
- [ ] API rate limiting (Supabase-level)
- [ ] Connection pooling

---

## Database Score: **2.5/10**

| Aspect | Score | Status |
|---|---|---|
| Schema Version Control | 1/10 | 18 files, chaos |
| RLS Implementation | 1/10 | Disabled |
| Foreign Keys | 2/10 | Likely missing |
| Indexes | 3/10 | Probably incomplete |
| Backup Strategy | 0/10 | No evidence |
| Performance | 2/10 | Service role bypass |
| Security | 1/10 | Hardcoded passwords |
| **Overall** | **1.5/10** | **CRITICAL** |

---

## 🎯 Immediate Fixes Required

### Week 1: Critical

1. **Establish single source of truth**
   ```bash
   supabase/migrations/
     ├── 20260605_001_initial_schema.sql
     ├── 20260605_002_add_rls.sql
     ├── 20260605_003_add_indexes.sql
     └── 20260605_004_add_constraints.sql
   ```

2. **Remove hardcoded passwords**
   - Delete FALLBACK_USERS from code
   - Use Supabase Auth instead

3. **Enable RLS on all tables**
   ```sql
   ALTER TABLE fl_commandes ENABLE ROW LEVEL SECURITY;
   ALTER TABLE fl_clients ENABLE ROW LEVEL SECURITY;
   -- etc for all tables
   ```

4. **Add basic policies**
   - Users see only their data
   - Admins see all data
   - Service role never used in production

### Week 2: Urgent

5. **Add foreign keys & constraints**
   ```sql
   ALTER TABLE fl_commandes
   ADD CONSTRAINT fk_client
   FOREIGN KEY (client_id)
   REFERENCES fl_clients(id)
   ON DELETE CASCADE;
   ```

6. **Add indexes for common queries**
   - Status lookups
   - Date ranges
   - User-specific data

7. **Implement audit tables**
   ```sql
   CREATE TABLE audit_log (
     id UUID PRIMARY KEY,
     table_name TEXT,
     record_id UUID,
     action TEXT, -- INSERT/UPDATE/DELETE
     old_data JSONB,
     new_data JSONB,
     changed_by UUID,
     changed_at TIMESTAMP
   );
   ```

### Week 3: Important

8. **Enable Point-in-Time Recovery**
   - Supabase backup settings

9. **Implement data export feature**
   - GDPR compliance

10. **Add change data capture (CDC)**
    - Realtime sync to data warehouse

---

## Summary

**Current State:** Chaotic, insecure, non-scalable  
**Risk Level:** 🔴 CRITICAL  
**Data Exposure:** GUARANTEED if breached  
**Production Ready:** ❌ NO  

**Must Fix Before Going Live:**
1. Unify SQL schema
2. Enable RLS properly
3. Remove hardcoded passwords
4. Add constraints & indexes
5. Implement audit trail

**Estimated Effort:** 3-4 weeks  

Next: **PHASE 4: ERP FEATURES** 📊

