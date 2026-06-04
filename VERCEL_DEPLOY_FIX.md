# 🔴 FIX : Catalogue Vita Core — Temporairement indisponible

## 🚨 Diagnostic du problème

L'erreur "Catalogue Vita Core — temporairement indisponible" signifie généralement :

1. ❌ Variables d'environnement manquantes en production
2. ❌ Supabase non joignable 
3. ❌ Build échoué sur Vercel
4. ❌ DNS mal configuré
5. ❌ App crash au démarrage

---

## ✅ Solution — Checklist Vercel

### Étape 1 : Vérifier les variables d'environnement Vercel

**Allez sur :** https://vercel.com/dashboard

1. Sélectionnez votre projet (vita-core)
2. Allez dans **Settings → Environment Variables**
3. Vérifiez que vous avez TOUS ces variables :

```
NEXT_PUBLIC_SUPABASE_URL       = https://jwdrwapuetqoqnankgma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJhbGciOi...
NEXT_PUBLIC_DEMO_PWD           = votre_mot_de_passe
```

❌ **Si manquants** → Ajoutez-les immédiatement

**Chaque variable doit avoir :**
- ✅ Disponible pour Production
- ✅ Disponible pour Preview
- ✅ Disponible pour Development

---

### Étape 2 : Redéployer sur Vercel

Après avoir ajouté les variables d'env :

1. Allez dans **Deployments**
2. Trouvez le dernier déploiement
3. Cliquez **... → Redeploy** (sur la droite)
4. Attendez la fin (5-10 minutes)

**Le log de build devrait montrer :** ✅ BUILD SUCCESSFUL

---

### Étape 3 : Vérifier le domaine vitafresh.vita-core.org

**Dans Vercel :**
1. Settings → Domains
2. Vérifiez que `vitafresh.vita-core.org` est configuré
3. Status doit être : ✅ **Valid configuration**

Si ❌ **Invalid** :
1. Notez les nameservers Vercel
2. Allez dans votre registrar (GoDaddy, OVH, etc.)
3. Changez les nameservers vers ceux de Vercel
4. Attendez 24-48h pour la propagation DNS

---

### Étape 4 : Tester la connexion Supabase

Une fois redéployé, testez que l'app peut se connecter à Supabase.

Ouvrez la console navigateur (F12) sur vitafresh.vita-core.org :

```javascript
// Testez que Supabase est joignable
fetch('https://jwdrwapuetqoqnankgma.supabase.co/rest/v1/')
  .then(r => r.json())
  .then(d => console.log('✅ SUPABASE OK', d))
  .catch(e => console.error('❌ SUPABASE ERREUR', e))
```

✅ Si OK → L'app peut se connecter
❌ Si erreur → Vérifiez les clés Supabase

---

## 🔴 Si ça n'affiche toujours rien

### Vérifier les logs Vercel

1. Allez sur https://vercel.com/dashboard
2. Votre projet → **Deployments**
3. Cliquez sur le dernier déploiement
4. Onglet **Logs**
5. Regardez les erreurs

**Erreurs courantes :**

| Erreur | Cause | Solution |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL undefined` | Variable manquante | Ajouter en Vercel → Settings → Environment Variables |
| `Cannot reach Supabase` | Supabase indisponible ou URL invalide | Vérifier les clés Supabase |
| `Module not found` | Package manquant | Vérifier `package.json`, lancer `npm install` |
| `Port already in use` | Conflits de port | Reboot Vercel → Redeploy |

### Vérifier le .env en production

Les variables NEXT_PUBLIC_* sont incluses dans le bundle (visibles côté client).

Testez que le build a bien inclus les variables :

```bash
# Localement
NEXT_PUBLIC_SUPABASE_URL=https://jwdrwapuetqoqnankgma.supabase.co npm run build
npm run start
```

L'app doit démarrer sans erreurs.

---

## 🔧 Checklist complète

- [ ] Variables d'env ajoutées en Vercel (Settings → Environment Variables)
- [ ] Chaque variable configurée pour Production
- [ ] Redéploiement lancé sur Vercel
- [ ] Build completed avec ✅ SUCCESS
- [ ] Domaine vitafresh.vita-core.org configuré
- [ ] Console navigateur : ✅ Supabase est joignable
- [ ] App affiche login (pas "indisponible")

---

## 🚨 Emergency — Reset complet

Si rien ne marche, faites un reset complet :

### Sur votre machine locale

```bash
cd Fresh_Link_Pro
rm -rf .next node_modules
npm install
npm run build  # Vérifier qu'il compile
npm run dev    # Vérifier qu'il démarre
```

### Sur Vercel

1. Allez dans **Settings → General**
2. Cliquez **Delete Project** (en bas)
3. Recréez le projet en reliant le git

```bash
# Dans le repo local
git push origin main
```

Vercel va redéployer automatiquement.

---

## 📞 Vérifications finales

**Test 1 : App démarre localement**
```bash
npm run dev
```
Visitez http://localhost:3000
- ✅ Page de login apparaît

**Test 2 : App démarre en prod Vercel**
- ✅ vitafresh.vita-core.org affiche la login

**Test 3 : Connexion à Supabase**
```javascript
// DevTools console sur prod
fetch('https://jwdrwapuetqoqnankgma.supabase.co/rest/v1/')
  .then(r => console.log('✅ OK'))
  .catch(e => console.error('❌ ERREUR', e))
```

---

## 🎯 Si vous être vraiment bloqué

**Envoyez-moi :**
1. Screenshot de Vercel → Settings → Environment Variables
2. Screenshot de Vercel → Deployments → Build Logs (le dernier)
3. Screenshot de la page d'erreur sur vitafresh.vita-core.org

---

*Mise à jour : Juin 2026 — Vercel Deployment Fix*
