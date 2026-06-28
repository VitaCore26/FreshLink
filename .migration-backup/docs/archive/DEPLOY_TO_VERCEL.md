# 🚀 Déployer sur Vercel — Guide Complet

## Prérequis

- ✅ Code pushé sur GitHub
- ✅ Supabase configuré avec utilisateurs
- ✅ `.env.local` bien configuré localement

---

## Étape 1️⃣ : Connecter le repo GitHub à Vercel

1. Allez sur https://vercel.com
2. Cliquez **Add New... → Project**
3. **Import Git Repository**
4. Sélectionnez votre repo (Fresh_Link_Pro)
5. Cliquez **Import**

---

## Étape 2️⃣ : Configurer les Environment Variables

**Dans Vercel :**

1. **Settings → Environment Variables**
2. Ajoutez ces variables (une par une) :

### Variable 1 : NEXT_PUBLIC_SUPABASE_URL
- **Name:** `NEXT_PUBLIC_SUPABASE_URL`
- **Value:** `https://jwdrwapuetqoqnankgma.supabase.co`
- **Environments:** Production, Preview, Development ✅

Cliquez **Save**

### Variable 2 : NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3ZHJ3YXB1ZXRxb3FuYW5rZ21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDE1NzUsImV4cCI6MjA5NDAxNzU3NX0.9l0e2eE9milvCWg29TIoGXgWY-ULOmTVrPmWRCsIvtw`
- **Environments:** Production, Preview, Development ✅

Cliquez **Save**

### Variable 3 : NEXT_PUBLIC_DEMO_PWD
- **Name:** `NEXT_PUBLIC_DEMO_PWD`
- **Value:** `1234` (ou votre mot de passe choisi)
- **Environments:** Production, Preview, Development ✅

Cliquez **Save**

---

## Étape 3️⃣ : Vérifier la configuration du domaine

**Dans Vercel :**

1. **Settings → Domains**
2. Si vous avez un domaine custom (vitafresh.vita-core.org) :
   - Ajoutez-le
   - Vérifiez le status : ✅ **Valid Configuration**
3. Si le status est ❌ **Invalid** :
   - Notez les **nameservers** affichés
   - Allez dans votre registrar (GoDaddy, Namecheap, etc.)
   - Changez les nameservers
   - Attendez 24-48h

---

## Étape 4️⃣ : Lancer le déploiement

**Deux options :**

### Option A : Déploiement auto (Recommandé)

1. Push votre code sur GitHub
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push origin main
   ```
2. Vercel détecte le push et déploie automatiquement

### Option B : Redéployer manuellement

1. Allez dans **Deployments**
2. Sur le dernier déploiement, cliquez **... → Redeploy**

---

## ✅ Vérifier le déploiement

### Test 1 : Build Success

Dans **Deployments**, le status doit être : ✅ **Ready**

Si ❌ **Failed** :
- Cliquez sur le déploiement
- Onglet **Logs**
- Cherchez l'erreur

### Test 2 : App accessible

Visitez votre URL :
- vitafresh.vita-core.org (si domaine custom)
- Ou l'URL par défaut Vercel

La page de **login** devrait apparaître (pas "indisponible").

### Test 3 : Supabase connexion

Ouvrez DevTools (F12) → Console et tapez :

```javascript
fetch('https://jwdrwapuetqoqnankgma.supabase.co/rest/v1/')
  .then(r => r.json())
  .then(d => console.log('✅ SUPABASE OK', d))
  .catch(e => console.error('❌ SUPABASE ERREUR', e))
```

Doit afficher : ✅ SUPABASE OK

### Test 4 : Health check

Visitez : `vitafresh.vita-core.org/api/health`

Vous devez voir :
```json
{
  "status": "ok",
  "environment": {
    "supabaseUrl": "✅ Set",
    "supabaseKey": "✅ Set",
    "demoPwd": "✅ Set"
  }
}
```

---

## 🆘 Troubleshooting

### Erreur : "Catalogue Vita Core — temporairement indisponible"

**Causes probables :**

1. ❌ Variables d'env manquantes
   - Vérifiez Settings → Environment Variables
   - Redéployez après ajout

2. ❌ Supabase non joignable
   - Vérifiez que l'URL Supabase est correcte
   - Vérifiez la connexion internet

3. ❌ Build échoué
   - Allez dans Deployments → Logs
   - Cherchez l'erreur de build

4. ❌ Domaine mal configuré
   - Vérifiez que le domaine est dans Settings → Domains
   - Vérifiez le status : ✅ Valid

### Erreur : "Module not found"

```
Solution: Relancez npm install localement et push vers GitHub
```

```bash
npm install
git add package-lock.json
git commit -m "Update packages"
git push origin main
```

### Erreur : "Cannot read property of undefined"

Généralement les variables d'env manquent.

```bash
# Vérifiez que les variables sont dans Vercel
# Settings → Environment Variables
# Puis redéployez
```

---

## 📋 Checklist finale

- [ ] Variables d'env ajoutées en Vercel (3 variables)
- [ ] Chaque variable sur Production, Preview, Development
- [ ] Build complété avec ✅ Ready
- [ ] App accessible sur son URL
- [ ] Page de login apparaît
- [ ] Console /api/health affiche ✅ ok
- [ ] Supabase connexion ✅ OK

---

## 🎯 Points clés

| Important | Détail |
|---|---|
| **Variables d'env** | MUST être ajoutées manuellement en Vercel (ne viennent pas de .env.local) |
| **Git push** | C'est Vercel qui remet à jour (ne pas deploy directement) |
| **Domaine** | Peut prendre 24-48h pour propager DNS |
| **Build log** | Toujours vérifier les Logs si quelque chose ne marche pas |
| **Health check** | Visitez /api/health pour diagnostiquer |

---

## 📞 Si ça ne marche toujours pas

Envoyez-moi :
1. URL de votre Vercel project
2. Screenshot des Environment Variables
3. Screenshot des Deployment Logs (l'erreur exacte)
4. URL du site (vitafresh.vita-core.org)

---

*Guide : Juin 2026 — Vercel Production Deployment*
