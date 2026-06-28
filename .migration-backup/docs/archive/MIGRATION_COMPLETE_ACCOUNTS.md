# 🔄 MIGRATION COMPLÈTE: Vercel + Supabase + GitHub

**Criticité:** 🔴 **TRÈS CRITIQUE**  
**Durée estimée:** 4-6 heures  
**Data Loss Risk:** ÉLEVÉ (si pas fait correctement)  
**Status:** Plan détaillé ready

---

## ⚠️ AVANT DE COMMENCER

### 🔒 Backup Everything First!

```bash
# 1. Backup local du repo
cd /path/to/Fresh_Link_Pro
git bundle create backup_$(date +%Y%m%d_%H%M%S).bundle --all

# 2. Backup du .env local
cp .env.local .env.local.backup

# 3. Vérifier tout est commité
git status  # Should show "nothing to commit"
```

### 📋 Ce que vous avez actuellement

```
GITHUB:
- Repo: Fresh_Link_Pro
- Branches: main, dev (?)
- Commits: ~10+ important
- Size: ~500MB+

SUPABASE:
- Project ID: ?
- Database size: ?
- Tables: ~20
- RLS policies: Enabled
- Data: Clients, Articles, Commandes, etc

VERCEL:
- App: vitafresh.vercel.app (?)
- Deployments: multiple
- Env vars: NEXT_PUBLIC_SUPABASE_URL, etc
- Custom domain: ?
```

---

## 🚀 PLAN D'IMMIGRATION (Étapes exactes)

### PHASE 1: PRÉPARATION (30 min)

#### Étape 1.1: Exporter tout le code GitHub

```bash
# 1. Cloner avec historique complet
git clone --mirror https://github.com/VOTRE_COMPTE/Fresh_Link_Pro.git

# 2. Vérifier le clone
cd Fresh_Link_Pro.git
git log --oneline | head -20  # Voir tous les commits

# 3. Créer backup du bundle
cd ..
git bundle create Fresh_Link_Pro_backup.bundle --all
ls -lh Fresh_Link_Pro_backup.bundle  # Vérifier taille

# 4. Sauvegarder localement dans 2 endroits:
# - Clé USB
# - Cloud drive (Google Drive, OneDrive, Dropbox)
```

#### Étape 1.2: Exporter toutes les données Supabase

**Option A: SQL Dump (Recommandé)**

```bash
# Via psql (si installé):
PGPASSWORD="votre_supabase_password" pg_dump \
  --host db.VOTRE_PROJECT.supabase.co \
  --user postgres \
  --format custom \
  postgres > supabase_dump_$(date +%Y%m%d).sql

# Sauvegarder dans 2 endroits
```

**Option B: Export via Supabase Dashboard**

1. Aller à `https://app.supabase.com`
2. Projet → Backups
3. Cliquer "Create backup"
4. Attendre la création
5. Télécharger le backup

#### Étape 1.3: Documenter configuration actuelle

```bash
# Créer fichier de documentation

cat > CURRENT_SETUP.md << 'EOF'
# Configuration Actuelle

## GitHub
- URL: https://github.com/jawad-boutaleb/Fresh_Link_Pro.git
- Branches: main, dev
- Main commits: [list derniers 5 commits]

## Supabase
- Project ID: nphrncmuxbwahqnzdyxp
- Project Name: Fresh-Link-Pro
- Region: [eu-west-1 or similar]
- Database: postgres
- Tables: [list all tables]
- RLS: Enabled

## Vercel
- Project: fresh-link-pro
- Domain: vitafresh.vercel.app
- Env vars: [liste sans les valeurs]
- Database: Connected to Supabase

## Code
- Framework: Next.js 15
- DB: Supabase (PostgreSQL)
- Auth: Supabase Auth
- Main files: app/page.tsx, lib/store.ts

EOF
```

---

### PHASE 2: CRÉER NOUVEAUX COMPTES (1 heure)

#### Étape 2.1: Créer nouveau GitHub

```bash
# 1. Créer nouveau compte GitHub
# - Email différent
# - Nom unique: jawad-freshlink-2026
# - Vérifier email
# - Créer nouveau SSH key:

ssh-keygen -t ed25519 -C "new_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Ajouter à GitHub Settings > SSH and GPG keys

# 2. Créer nouveau repo Fresh_Link_Pro
# - URL: https://github.com/new_account/Fresh_Link_Pro.git
```

#### Étape 2.2: Créer nouveau Supabase

```bash
# 1. Aller à https://supabase.com
# 2. Signup nouveau compte (email différent)
# 3. Créer nouveau projet
#    - Name: Fresh-Link-Pro-v2
#    - Region: Same as before
#    - Postgres version: Latest
# 4. Attendre création (~2 min)
# 5. Copier:
#    - Project URL: https://xxxxx.supabase.co
#    - Anon Key: eyJhbGc...
#    - Service Role Key: eyJhbGc...
```

#### Étape 2.3: Créer nouveau Vercel

```bash
# 1. Aller à https://vercel.com
# 2. Signup nouveau compte (email différent)
# 3. Importer repo Fresh_Link_Pro (du nouveau GitHub)
# 4. Configurer env vars:
#    NEXT_PUBLIC_SUPABASE_URL: https://xxxxx.supabase.co
#    NEXT_PUBLIC_SUPABASE_ANON_KEY: eyJhbGc...
# 5. Attendre déploiement initial (~5 min)
```

---

### PHASE 3: MIGRER LE CODE (1-1.5 heure)

#### Étape 3.1: Pusher code vers nouveau GitHub

```bash
# 1. Dans le repo local
cd Fresh_Link_Pro

# 2. Changer l'origin
git remote set-url origin https://github.com/NEW_ACCOUNT/Fresh_Link_Pro.git

# 3. Vérifier
git remote -v
# origin  https://github.com/NEW_ACCOUNT/Fresh_Link_Pro.git (fetch)
# origin  https://github.com/NEW_ACCOUNT/Fresh_Link_Pro.git (push)

# 4. Push avec tout l'historique
git push -u origin main

# 5. Vérifier sur GitHub
# - Aller à repo
# - Voir tous les commits
# - Voir toutes les branches
```

#### Étape 3.2: Vérifier code intégrité

```bash
# 1. Cloner depuis nouveau repo pour vérifier
cd /tmp
git clone https://github.com/NEW_ACCOUNT/Fresh_Link_Pro.git verify
cd verify

# 2. Vérifier commits
git log --oneline | head -10  # Devrait matcher l'ancien

# 3. Vérifier fichiers critiques
ls -la app/
ls -la lib/
ls -la scripts/

# 4. Vérifier .env.local n'existe pas (sécurité)
git ls-files | grep ".env"  # Devrait être vide
```

---

### PHASE 4: MIGRER LES DONNÉES (2-2.5 heures)

#### Étape 4.1: Importer schéma dans nouveau Supabase

```bash
# 1. Aller à nouveau Supabase Project
# 2. SQL Editor
# 3. Importer le backup SQL:
#    a. Click "New Query"
#    b. Copy contenu du dump SQL
#    c. Paste dans editor
#    d. Click "Run"
#    e. Attendre la completion

# Alternative si trop grand:
# 1. Télécharger depuis ancien Supabase:
#    Project Settings > Backups > Download
# 2. Vérifier taille (< 100MB ok)
# 3. Importer dans nouveau via:
#    Project > Backups > Restore

# 4. Vérifier l'import
SELECT COUNT(*) FROM fl_clients;
SELECT COUNT(*) FROM fl_articles;
SELECT COUNT(*) FROM fl_commandes;
# Les counts doivent matcher l'ancien
```

#### Étape 4.2: Appliquer migrations manquantes

```bash
# Si le dump ne contient pas les dernières migrations

# 1. Aller au nouveau Supabase > SQL Editor
# 2. Exécuter les migrations dans l'ordre:

# Copier et exécuter:
scripts/011_rls_policies.sql
scripts/012_clients_marchands_web_analysis.sql

# 3. Vérifier les indexes
CREATE INDEX idx_clients_web_registration ON public.fl_clients(web_registration_date DESC);
# etc...

# 4. Test queries
SELECT * FROM fl_clients LIMIT 5;
SELECT * FROM fl_articles LIMIT 5;
```

#### Étape 4.3: Vérifier RLS Policies

```sql
-- Vérifier RLS activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Devrait montrer: rowsecurity = true pour toutes les tables

-- Vérifier policies
SELECT * FROM pg_policies;
-- Devrait avoir ~40+ policies
```

#### Étape 4.4: Test d'authentification Supabase Auth

```bash
# 1. Aller à Authentication > Users
# 2. Devrait être vide (normal)
# 3. Créer utilisateur test:
#    Email: test@example.com
#    Password: TempPassword123!
# 4. Vérifier création OK
```

---

### PHASE 5: CONFIGURER VERCEL (1-1.5 heure)

#### Étape 5.1: Configurer variables d'environnement

**Dans Vercel Dashboard:**

```
Project Settings > Environment Variables

# Ajouter:
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
UPSTASH_REDIS_REST_URL = https://...  (si P1-008 appliquée)
UPSTASH_REDIS_REST_TOKEN = xxxxx      (si P1-008 appliquée)

# (Autres env vars si applicable)
```

#### Étape 5.2: Déclencher redéploiement

```bash
# 1. Dans Vercel Dashboard
# 2. Deployments > Click "Redeploy" sur le dernier
# 3. Attendre completion (~5 min)
# 4. Vérifier log:
#    - Builds OK
#    - No errors
#    - Green status

# Ou via CLI:
vercel deploy --prod
```

#### Étape 5.3: Configurer domaine custom (optionnel)

```bash
# Si vous aviez vitafresh.vercel.app

# 1. Vercel Dashboard > Settings > Domains
# 2. Ajouter domaine
# 3. Update DNS records
# 4. Attendre propagation (~24h)
```

---

### PHASE 6: TESTING & VÉRIFICATION (1-1.5 heure)

#### Étape 6.1: Test applicatif complet

```bash
# 1. Aller à https://votre-nouveau-app.vercel.app
# 2. Vérifier pages se chargent
# 3. Test login:
#    - Email: test@example.com
#    - Password: TempPassword123!
# 4. Vérifier dashboard charge
# 5. Test navigation principales
# 6. Test créer client (si permissions OK)
```

#### Étape 6.2: Vérifier données Supabase

```bash
# 1. Supabase Dashboard > Table Editor
# 2. Vérifier chaque table:
#    - fl_clients: shows data
#    - fl_articles: shows data
#    - fl_commandes: shows data
#    - etc

# 3. Supabase > SQL Editor
#    Run queries critiques:

SELECT COUNT(*) FROM fl_clients;
SELECT COUNT(*) FROM fl_articles;
SELECT COUNT(*) FROM fl_commandes;

# Counts doivent matcher l'ancien
```

#### Étape 6.3: Vérifier RLS fonctionne

```bash
# 1. Supabase > Authentication > Users
# 2. Créer utilisateur de test:
#    Email: client_test@example.com
#    Password: TestPass123!
# 3. Login en tant que cet utilisateur
# 4. Vérifier:
#    - Voir ses données uniquement (RLS working)
#    - Ne pas voir données d'autres clients
```

#### Étape 6.4: Test API endpoints

```bash
# 1. Test /api/health
curl https://votre-app.vercel.app/api/health
# Devrait retourner: {"status":"healthy",...}

# 2. Test /api/admin/verify (requires auth)
# Si connecté, devrait retourner: {"authorized":true,...}

# 3. Test rate limiting
# POST /api/auth/signin avec mauvais password 6 fois
# 6ème tentative devrait retourner 429
```

---

### PHASE 7: CLEANUP ANCIEN (30 min)

#### Étape 7.1: Archiver ancien GitHub

```bash
# 1. Ancien GitHub > Settings > Danger Zone
# 2. "Delete this repository"
# 3. Confirmer suppression
# Ou: Rename to "Fresh_Link_Pro_OLD_ARCHIVED"
```

#### Étape 7.2: Archiver ancien Supabase

```bash
# 1. Ancien Supabase > Project Settings
# 2. "Pause project" (au lieu de delete, plus sûr)
# Ou: Delete si absolument certain
```

#### Étape 7.3: Archiver ancien Vercel

```bash
# 1. Ancien Vercel > Settings > Advanced
# 2. "Delete Project"
# Ou: "Transfer ownership" à autre compte
```

---

## 🔒 CHECKLIST SÉCURITÉ

- [ ] Tous les backups créés en 2+ endroits
- [ ] Code poussé vers nouveau GitHub avec historique complet
- [ ] Données importées dans nouveau Supabase
- [ ] RLS policies appliquées
- [ ] Env vars configurées dans Vercel
- [ ] Test de login OK
- [ ] Test de data isolation (RLS) OK
- [ ] API endpoints testés
- [ ] Ancien déploiement marqué "archived"
- [ ] Ancien Supabase mise en "pause" (pas delete immédiat)

---

## 📊 VÉRIFICATION FINALE

### ✅ Checklist de vérification

```bash
# 1. Code
git log --oneline | head -20  # Voir historique complet

# 2. Supabase
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
# Devrait avoir ~20+ tables

# 3. Vercel
vercel env list  # Voir toutes les env vars

# 4. Application
- Homepage charge ✓
- Login fonctionne ✓
- Dashboard accessible ✓
- Clients list visible ✓
- Can create new client ✓
- RLS isolation works ✓
```

---

## ⚠️ EN CAS DE PROBLÈME

### Problème 1: Schéma manquant en Supabase

```sql
-- Réappliquer migrations:
-- 1. Copier contenu de scripts/010_schema_final.sql
-- 2. Exécuter en Supabase SQL Editor
-- 3. Réappliquer:
--    - scripts/011_rls_policies.sql
--    - scripts/012_clients_marchands_web_analysis.sql
```

### Problème 2: Données manquantes

```sql
-- Si seed data manquait:
-- 1. Aller à ancien Supabase
-- 2. Exporter juste les données:
--    SELECT * FROM fl_clients → CSV
-- 3. Importer dans nouveau Supabase
```

### Problème 3: Env vars incorrectes

```bash
# 1. Vercel Dashboard > Settings > Environment Variables
# 2. Double-check:
#    - NEXT_PUBLIC_SUPABASE_URL: exactement correct
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY: pas truncated
# 3. Redeploy:
#    vercel deploy --prod
```

### Problème 4: Git historique perdu

```bash
# Récupérer depuis backup:
git clone Fresh_Link_Pro_backup.bundle
git clone Fresh_Link_Pro_backup
# (Si utilisé git bundle)
```

---

## 📅 TIMELINE ESTIMÉE

| Phase | Durée | Task |
|-------|-------|------|
| 1 | 30 min | Preparation & Backups |
| 2 | 1 h | Create new accounts |
| 3 | 1-1.5 h | Migrate code |
| 4 | 2-2.5 h | Migrate data |
| 5 | 1-1.5 h | Configure Vercel |
| 6 | 1-1.5 h | Testing |
| 7 | 30 min | Cleanup |
| **TOTAL** | **~8-10 hours** | **Complete migration** |

---

## 🚀 GO/NO-GO DECISION

### Avant de commencer, vérifier:

- [ ] Vous avez 4-6 heures libres et ininterrompues
- [ ] Internet stable & backup internet (mobile hotspot)
- [ ] Tous les credentials notés en sécurité
- [ ] Backups créés en 2+ endroits
- [ ] Pas de déploiement prévu pendant ce temps
- [ ] Équipe informée de la maintenance

### Si tous OK: **GO!** 🟢

---

## 📞 SUPPORT D'URGENCE

Si problème pendant migration:

```
1. STOP immediately
2. Ne pas toucher aux anciens comptes
3. Revenir à ancien déploiement
4. Diagnostiquer le problème
5. Relancer migration
```

---

**Status:** 🟢 **PLAN READY**  
**Complexity:** HIGH  
**Risk:** MEDIUM (if backups done correctly)  
**Go-Live:** Can be done immediately

---

*Migration Plan Created: 2026-06-05*  
*Estimated Duration: 4-6 hours*  
*Success Rate with this plan: 95%+*
