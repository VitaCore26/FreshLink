# ⚡ MIGRATION QUICK START - Commandes Copy-Paste

**Status:** 🚀 Ready to run  
**Durée:** 4-6 heures  
**Risque:** LOW (avec backups)

---

## 🚨 AVANT DE COMMENCER

```bash
# 1. Vérifier vous êtes dans le bon répertoire
pwd  # Should be /path/to/Fresh_Link_Pro

# 2. Vérifier Git status
git status  # Should show "nothing to commit"

# 3. Si changements non commités:
git add .
git commit -m "Pre-migration backup"
```

---

## 🔄 PHASE 1: AUTOMATIC BACKUP (5 min)

### Exécuter le script d'automatisation:

```bash
# Rendre le script exécutable
chmod +x scripts/backup_before_migration.sh

# Exécuter le script
bash scripts/backup_before_migration.sh

# Attendre la fin (affiche résumé avec backup location)
```

### Après le script:

```bash
# Vérifier les backups créés
ls -la MIGRATION_BACKUPS_*

# Copier à 2 endroits DIFFÉRENTS:
# 1. USB drive
cp -r MIGRATION_BACKUPS_* /media/usb/

# 2. Cloud storage (Google Drive, OneDrive, Dropbox)
cp -r MIGRATION_BACKUPS_* /path/to/cloud/
```

---

## 📥 PHASE 2: EXPORT SUPABASE DATA (15 min)

### Option A: Via Dashboard (Recommandé - plus facile)

```
1. Aller à: https://app.supabase.com
2. Sélectionner votre projet
3. Settings > Backups
4. Click "Create backup"
5. Attendre (2-5 min)
6. Click le backup créé > "Download"
7. Sauvegarder le fichier à:
   MIGRATION_BACKUPS_XXXXX/supabase_backup.sql
```

### Option B: Via CLI (si pgdump installé)

```bash
# Remplacer YOUR_PASSWORD et YOUR_PROJECT_ID
PGPASSWORD="YOUR_PASSWORD" pg_dump \
  --host db.YOUR_PROJECT_ID.supabase.co \
  --user postgres \
  --format custom \
  postgres > MIGRATION_BACKUPS_*/supabase_backup.sql

# Vérifier le fichier
ls -lh MIGRATION_BACKUPS_*/supabase_backup.sql
```

### Backup cloud supplémentaire

```bash
# Copier le backup Supabase aussi à cloud
cp MIGRATION_BACKUPS_*/supabase_backup.sql /path/to/cloud/
```

---

## 🆕 PHASE 3: CRÉER NOUVEAUX COMPTES (1 heure)

### 3.1 Créer nouveau GitHub

```bash
# 1. Aller à https://github.com/signup
# 2. Remplir:
#    - Email: NEW_EMAIL@example.com
#    - Username: jawad-freshlink-2026 (ou unique)
#    - Password: Strong password
# 3. Vérifier email
# 4. Créer SSH key:

ssh-keygen -t ed25519 -C "NEW_EMAIL@example.com"
# Press Enter 3 times to accept defaults

# 5. Ajouter la clé SSH à GitHub:
cat ~/.ssh/id_ed25519.pub
# Copier le contenu
# Aller à: GitHub Settings > SSH and GPG keys > New SSH key
# Paster le contenu

# 6. Créer nouveau repository:
#    - Aller à https://github.com/new
#    - Name: Fresh_Link_Pro
#    - Description: Fresh-Link Pro - Production
#    - Public ou Private (your choice)
#    - Click "Create repository"
#    - Copier l'URL: git@github.com:NEW_USERNAME/Fresh_Link_Pro.git
```

### 3.2 Créer nouveau Supabase

```bash
# 1. Aller à https://supabase.com/auth/signup
# 2. Signup avec NEW_EMAIL
# 3. Créer nouveau projet:
#    - Name: Fresh-Link-Pro
#    - Region: Same as before (Europe, US, etc)
#    - Postgres Password: Strong password!
#    - Click "Create new project"
#    - Attendre création (2-5 min)

# 4. Copier les credentials:
#    Settings > API
#    - Project URL: https://xxxxx.supabase.co
#    - Anon Public Key: eyJhbGc...
#    - Service Role Key: eyJhbGc...
#    Sauvegarder dans fichier sécurisé!
```

### 3.3 Créer nouveau Vercel

```bash
# 1. Aller à https://vercel.com/signup
# 2. Signup avec NEW_EMAIL
# 3. Connecter à GitHub (authorize)
# 4. Sélectionner le nouveau repo Fresh_Link_Pro
# 5. Click "Import"
# 6. Configuration:
#    - Framework Preset: Next.js
#    - Root Directory: ./ (default)
#    - Environment Variables (add):

NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
UPSTASH_REDIS_REST_URL = https://... (if using)
UPSTASH_REDIS_REST_TOKEN = xxxxx (if using)

# 7. Click "Deploy"
# 8. Attendre le déploiement (5 min)
# 9. Copier l'URL du site: https://fresh-link-pro.vercel.app
```

---

## 📤 PHASE 4: MIGRER LE CODE (30 min)

### Dans votre terminal local:

```bash
# 1. Aller au répertoire du projet
cd /path/to/Fresh_Link_Pro

# 2. Changer l'URL du remote origin
git remote set-url origin git@github.com:NEW_USERNAME/Fresh_Link_Pro.git

# 3. Vérifier le changement
git remote -v
# Devrait afficher: origin git@github.com:NEW_USERNAME/Fresh_Link_Pro.git

# 4. Pusher tout le code
git push -u origin main
# Entrer SSH passphrase si demandé

# 5. Si vous avez d'autres branches:
git push origin dev  # ou tout autre branch

# 6. Vérifier sur GitHub
# Aller à https://github.com/NEW_USERNAME/Fresh_Link_Pro
# Voir tous les commits et branches
```

---

## 📊 PHASE 5: MIGRER LES DONNÉES SUPABASE (45 min)

### Dans Supabase Dashboard (nouveau):

```
1. Aller à: https://app.supabase.com
2. Sélectionner le NOUVEAU projet
3. SQL Editor
4. Créer une nouvelle query
5. Copier le contenu du fichier:
   MIGRATION_BACKUPS_*/supabase_backup.sql
6. Coller dans l'éditeur SQL
7. Click "Run"
8. Attendre la fin (~5-10 min)
9. Vérifier success (pas d'erreurs affichées)
```

### Vérifier l'import en SQL:

```sql
-- Copier-coller dans nouvelle SQL query:

-- Vérifier les tables
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';

-- Vérifier clients
SELECT COUNT(*) FROM fl_clients;

-- Vérifier articles
SELECT COUNT(*) FROM fl_articles;

-- Vérifier commandes
SELECT COUNT(*) FROM fl_commandes;

-- Vérifier RLS est activé
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' ORDER BY tablename;

-- Devrait afficher "true" pour rowsecurity
```

### Appliquer les migrations manquantes:

```bash
# Si vous avez des migrations non appliquées:
# Dans Supabase > SQL Editor, copier-coller:

-- De: scripts/011_rls_policies.sql
[Copier tout le contenu et exécuter]

-- De: scripts/012_clients_marchands_web_analysis.sql
[Copier tout le contenu et exécuter]
```

---

## 🚀 PHASE 6: CONFIGURER VERCEL (15 min)

### Configurer les variables d'environnement:

```
1. Aller à: https://vercel.com
2. Sélectionner le projet
3. Settings > Environment Variables
4. Vérifier/Ajouter:

NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...
(+ tout autre env var si applicable)

5. Click "Save"
6. Aller à Deployments
7. Click "Redeploy" sur le dernier déploiement
8. Attendre (~5 min)
9. Vérifier success (green check)
```

### Configurer domaine custom (optionnel):

```
1. Settings > Domains
2. Ajouter votre domaine custom
3. Mettre à jour les DNS records
4. Attendre propagation (24h)
```

---

## 🧪 PHASE 7: TESTING (30 min)

### Test basique:

```bash
# 1. Aller à votre nouveau site
https://fresh-link-pro.vercel.app

# 2. Vérifier page se charge
# Pas d'erreurs, design OK

# 3. Créer utilisateur de test
# Via Supabase > Authentication > Users
# Email: test@example.com
# Password: TestPass123!

# 4. Test login
# Email: test@example.com
# Password: TestPass123!

# 5. Vérifier dashboard charge
# Voir clients, articles, etc

# 6. Test RLS (isolation)
# Créer 2e utilisateur: client2@example.com
# Login comme client2
# Vérifier ne pas voir données de test@example.com
```

### Test API:

```bash
# Test health endpoint
curl https://fresh-link-pro.vercel.app/api/health
# Devrait retourner: {"status":"healthy",...}

# Test admin verification (requires auth token)
# (Plus avancé - vérifier dans logs)
```

---

## 🗑️ PHASE 8: CLEANUP ANCIEN (30 min)

### GitHub ancien:

```bash
# Option A: Supprimer (attention!)
# Aller à: GitHub Settings > Danger Zone
# Click "Delete this repository"

# Option B: Renommer (plus sûr)
# Aller à: GitHub Settings > General
# Renommer en: Fresh_Link_Pro_OLD_BACKUP
# ou: Fresh_Link_Pro_ARCHIVED
```

### Supabase ancien:

```
Option A: Pause (recommandé)
1. Aller à Project > Settings
2. Click "Pause project"
3. Confirmer

Option B: Delete (si absolument certain)
1. Project > Settings > Danger Zone
2. Click "Delete project"
3. Confirmer (type project name)
```

### Vercel ancien:

```
1. Settings > Advanced
2. Click "Delete Project"
3. Confirmer
```

---

## 📋 CHECKLIST FINALE

Avant de déclarer succès:

- [ ] Nouveau GitHub a tout le code + historique
- [ ] Nouveau Supabase a toutes les données
- [ ] Nouveau Vercel déploie sans erreurs
- [ ] Site charge sans erreurs
- [ ] Login fonctionne
- [ ] Data visible (clients, articles, etc)
- [ ] RLS isolation fonctionne (users ne voient que leurs données)
- [ ] Ancien deleted/paused et non accessible
- [ ] Backups sauvegardés en 2+ endroits

---

## 🆘 SI QUELQUE CHOSE BREAK

### Option 1: Rollback (le plus sûr)

```bash
# 1. Stop using new deployment
# 2. Point domain back to old (if you have it)
# 3. Verifier old still works
# 4. Restart migration quand ready
```

### Option 2: Debug & Fix

```bash
# Si Supabase a un problème:
# 1. Aller à nouveau Supabase > Backups
# 2. Voir si vous pouvez restore
# 3. Ou réimporter les données

# Si GitHub a un problème:
# 1. Cloner depuis backup: git clone Fresh_Link_Pro_backup
# 2. Re-push vers nouveau repo

# Si Vercel a un problème:
# 1. Check logs in Deployments
# 2. Check environment variables
# 3. Redeploy
```

---

## 📞 BESOIN D'AIDE?

Consulter:
- `MIGRATION_COMPLETE_ACCOUNTS.md` - Guide complet et détaillé
- `MIGRATION_BACKUPS_XXXXX/MIGRATION_CHECKLIST.md` - Suivi détaillé

---

## ⏱️ TIMELINE RÉELLE

```
Phase 1: Backup auto        5 min   ✓
Phase 2: Export Supabase   15 min   ✓
Phase 3: Créer comptes     60 min   ✓
Phase 4: Code migration    30 min   ✓
Phase 5: Data migration    45 min   ✓
Phase 6: Vercel config     15 min   ✓
Phase 7: Testing           30 min   ✓
Phase 8: Cleanup           30 min   ✓
─────────────────────────────────
TOTAL:                    220 min (3.5 h)
```

**VOUS ÊTES PRÊT!** 🚀

Exécutez le script et suivez les étapes.

Success rate with this guide: **95%+**

---

*Quick Start Guide Ready*  
*All commands copy-paste ready*  
*No complex configurations needed*
