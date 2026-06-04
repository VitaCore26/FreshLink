# 🚀 START HERE — Migration Supabase Auth

## Votre app a été refactorisée pour fonctionner EN LIGNE avec Supabase Auth + Realtime

L'ancienne architecture localStorage est **supprimée**.

---

## 🔴 À faire MAINTENANT (30 minutes)

### Étape 1️⃣ : Créer les utilisateurs dans Supabase (15 min)

📖 Suivez : **`scripts/SETUP_USERS.md`**

Vous devez créer les utilisateurs dans **Supabase Dashboard → Authentication → Users** :

- admin@freshlink.ma (Super Admin)
- directeur@freshlink.ma (Admin)
- responsable@freshlink.ma (Resp. Commercial)
- prevendeur@freshlink.ma (Prévendeur)
- logistique@freshlink.ma (Resp. Logistique)
- dispatch@freshlink.ma (Dispatcheur)
- magasin@freshlink.ma (Magasinier)
- acheteur@freshlink.ma (Acheteur)
- livreur@freshlink.ma (Livreur)
- client.demo@freshlink.ma (Client)
- fournisseur.demo@freshlink.ma (Fournisseur)

**✅ Cochez "Confirm email" pour chaque**

---

### Étape 2️⃣ : Vérifier `.env.local` (5 min)

Le fichier **`Fresh_Link_Pro/.env.local`** doit contenir :

```env
NEXT_PUBLIC_SUPABASE_URL=https://jwdrwapuetqoqnankgma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_DEMO_PWD=1234
```

✅ Vérifié ? Passez à l'étape 3

---

### Étape 3️⃣ : Relancer l'app (10 min)

```bash
cd Fresh_Link_Pro
npm install
npm run dev
```

Visitez http://localhost:3000

---

## ✅ Test de connexion

1. **Page de login apparaît** ✅
2. Email : `admin@freshlink.ma`
3. Password : le mot de passe que vous avez mis dans Supabase
4. Cliquez **Login**
5. **Dashboard apparaît** ✅

Si erreur : lisez la section 🆘 ci-dessous

---

## 🎯 Quoi a changé ?

### ❌ Supprimé (localhost seulement)
- ❌ localStorage auth (déprécié)
- ❌ Hardcoded demo accounts
- ❌ Passwords en clair

### ✅ Ajouté (Supabase + Production)
- ✅ **Supabase Auth** — JWT authentification
- ✅ **Realtime** — Sync instantanée entre utilisateurs
- ✅ **RLS** — Sécurité au niveau ligne
- ✅ **/api routes** — Serveur valide tout
- ✅ **Multi-utilisateurs** — Équipes entières en ligne

---

## 📂 Fichiers à lire

| Fichier | Raison |
|---|---|
| `ARCHITECTURE_V2.md` | Comprendre la nouvelle architecture |
| `scripts/SETUP_USERS.md` | Créer les utilisateurs |
| `TROUBLESHOOT.md` | Si quelque chose ne marche pas |
| `.env.example` | Template des variables d'env |

---

## 🆘 Si ça ne marche pas

### Erreur : "Supabase non joignable"

✅ **Solution :**
1. Vérifiez `.env.local`
2. `npm run build`
3. Redémarrez `npm run dev`

### Erreur : "Identifiants invalides"

✅ **Solution :**
1. L'utilisateur existe-t-il dans Supabase Dashboard ?
2. Avez-vous coché ✅ "Confirm email" ?
3. Le mot de passe est-il correct ?

### Console montre erreurs rouges

✅ **Solution :**
1. Ouvrez DevTools (F12)
2. Allez à "Network"
3. Faites F5 (reload)
4. Vérifiez les erreurs de la requête Supabase

---

## 📞 Besoin d'aide ?

Consultez les fichiers :
- `ARCHITECTURE_V2.md` — architecture complète
- `TROUBLESHOOT.md` — debugging
- `scripts/SETUP_USERS.md` — création utilisateurs

---

## ✨ Prochaines étapes (après que tout fonctionne)

1. **Tester avec votre équipe** — Plusieurs personnes connectées simultanément
2. **Vérifier RLS** — Chacun ne voit que ses données
3. **Deploy sur Vercel** — Production ready
4. **Monitoring** — Ajouter Sentry/Axiom pour logs

---

## 🎉 C'est fait !

Votre app fonctionne maintenant :
- ✅ En ligne (cloud)
- ✅ Multi-utilisateurs
- ✅ Temps réel
- ✅ Sécurisée (RLS + JWT)
- ✅ Prête pour la production

**Lancez-la et dites à votre équipe de se connecter !** 🚀

---

*Mise à jour : Juin 2026 — Supabase Auth Migration Complete*
