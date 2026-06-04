# 🔧 FIX — vitafresh.vita-core.org "Temporairement indisponible"

## 🚨 Le problème

Votre site affiche : **"Catalogue Vita Core — temporairement indisponible"**

Cela veut dire que l'app **Fresh Link Pro** sur Vercel ne peut pas se connecter à Supabase ou démarre mal.

---

## ✅ Solution — Action immédiate (15 minutes)

### 🔴 Vérification 1 : Variables d'environnement Vercel

**Allez sur :** https://vercel.com/dashboard/vitafresh-vita-core

1. **Settings → Environment Variables**
2. Vérifiez que vous avez ces 3 variables :

```
NEXT_PUBLIC_SUPABASE_URL       ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY  ✅
NEXT_PUBLIC_DEMO_PWD           ✅
```

❌ **Si manquants** :
1. Cliquez **+ Add New**
2. Ajoutez chaque variable
3. Choisissez : Production, Preview, Development
4. Sauvegardez

---

### 🔴 Vérification 2 : Redéployer après ajout

Après avoir ajouté les variables :

1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Bouton **... → Redeploy**
4. Attendez 5-10 minutes

**Status doit être :** ✅ Ready (pas Failed)

---

### 🔴 Vérification 3 : Tester l'app

Visitez : https://vitafresh.vita-core.org

**La page de login devrait apparaître** (pas "indisponible")

---

## 🔍 Si ça n'affiche toujours rien

### Étape 1 : Vérifier les logs Vercel

1. Allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Onglet **Logs**
4. Cherchez les erreurs (en rouge)

**Messages courants :**

| Erreur | Signifie |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL undefined` | Variable manquante en Vercel |
| `Cannot reach Supabase` | Supabase indisponible ou URL invalide |
| `Build failed` | Erreur de compilation |

### Étape 2 : Vérifier l'endpoint de santé

Visitez : `https://vitafresh.vita-core.org/api/health`

Devrait afficher (JSON) :
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

**Si erreur :**
- Les variables ne sont pas présentes en Vercel
- Allez dans Settings → Environment Variables et vérifiez

### Étape 3 : Tester Supabase localement

```bash
cd Fresh_Link_Pro
npm install
npm run build    # Doit compiler sans erreurs
npm run dev      # Doit démarrer sur http://localhost:3000
```

Si l'app démarre localement mais pas sur Vercel → problème de configuration Vercel

---

## 📋 Checklist complète

- [ ] Variables d'env présentes en Vercel (Settings → Environment Variables)
- [ ] **NEXT_PUBLIC_SUPABASE_URL** = `https://jwdrwapuetqoqnankgma.supabase.co`
- [ ] **NEXT_PUBLIC_SUPABASE_ANON_KEY** = `eyJhbGciOi...`
- [ ] **NEXT_PUBLIC_DEMO_PWD** = votre mot de passe
- [ ] Chaque variable sur Production, Preview, Development ✅
- [ ] Redéploiement lancé (Deployments → ... → Redeploy)
- [ ] Build status = ✅ Ready (pas Failed)
- [ ] Visitez vitafresh.vita-core.org → login apparaît
- [ ] Visitez /api/health → affiche OK

---

## 🎯 Résumé

| Problème | Solution | Temps |
|---|---|---|
| Variables manquantes | Ajouter en Vercel → Settings | 5 min |
| Ancien déploiement | Redeploy en Vercel | 10 min |
| Supabase indisponible | Vérifier les clés | 5 min |
| App échoue localement | Vérifier `npm install` | 10 min |

**Total : 15-30 minutes maximum**

---

## 📞 Si vous êtes bloqué

Envoyez-moi une capture de :
1. Vercel → Environment Variables (montrez que les 3 variables sont là)
2. Vercel → Deployments → Logs (dernière erreur)
3. Le message exact sur vitafresh.vita-core.org

---

## 📖 Guides complets

- **DEPLOY_TO_VERCEL.md** — Guide complet de déploiement
- **VERCEL_DEPLOY_FIX.md** — Guide détaillé du fix
- **START_HERE.md** — Configuration initiale

---

**LANCEZ LE FIX MAINTENANT** ⚡

*Le problème se résout en 15 minutes.*

---

*Mis à jour : Juin 2026*
