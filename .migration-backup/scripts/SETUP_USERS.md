# 🚀 Setup Utilisateurs Supabase Auth

## ⚠️ IMPORTANT : À faire MANUELLEMENT dans Supabase Dashboard

L'authentification localStorage est supprimée. Vous devez créer les vrais utilisateurs dans **Supabase Auth**.

---

## Étape 1 : Ouvrir Supabase Dashboard

1. Allez sur [supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet Fresh Link Pro
3. Allez dans **Authentication → Users**

---

## Étape 2 : Créer les utilisateurs

Pour chaque personne, créez un utilisateur avec :

### Super Admin
- **Email :** admin@freshlink.ma
- **Password :** un_mot_de_passe_fort
- Cochez ✅ **Confirm email**
- Appuyez **Create user**

### Admin/Managers (Directeur)
- **Email :** directeur@freshlink.ma
- **Password :** mot_de_passe_fort_2
- Cochez ✅ **Confirm email**
- Appuyez **Create user**

### Resp. Commercial
- **Email :** responsable@freshlink.ma
- **Password :** mot_de_passe_fort_3
- Cochez ✅ **Confirm email**

### Prévendeur
- **Email :** prevendeur@freshlink.ma
- **Password :** mot_de_passe_fort_4
- Cochez ✅ **Confirm email**

### Resp. Logistique
- **Email :** logistique@freshlink.ma
- **Password :** mot_de_passe_fort_5
- Cochez ✅ **Confirm email**

### Dispatcheur
- **Email :** dispatch@freshlink.ma
- **Password :** mot_de_passe_fort_6
- Cochez ✅ **Confirm email**

### Magasinier
- **Email :** magasin@freshlink.ma
- **Password :** mot_de_passe_fort_7
- Cochez ✅ **Confirm email**

### Acheteur
- **Email :** acheteur@freshlink.ma
- **Password :** mot_de_passe_fort_8
- Cochez ✅ **Confirm email**

### Livreur
- **Email :** livreur@freshlink.ma
- **Password :** mot_de_passe_fort_9
- Cochez ✅ **Confirm email**

### Client
- **Email :** client.demo@freshlink.ma
- **Password :** mot_de_passe_fort_10
- Cochez ✅ **Confirm email**

### Fournisseur
- **Email :** fournisseur.demo@freshlink.ma
- **Password :** mot_de_passe_fort_11
- Cochez ✅ **Confirm email**

---

## ✅ Vérification

Après avoir créé tous les utilisateurs, vous devriez voir dans **Supabase Dashboard → Authentication → Users** :

```
Email                        | Provider | Created
---                          | ---      | ---
admin@freshlink.ma           | Email    | just now
directeur@freshlink.ma       | Email    | just now
responsable@freshlink.ma     | Email    | just now
prevendeur@freshlink.ma      | Email    | just now
... etc
```

---

## 🎯 Connexion à l'app

Une fois les utilisateurs créés :

1. Allez sur votre app Fresh Link Pro
2. Page de login
3. Entrez : `admin@freshlink.ma` / `mot_de_passe_que_vous_avez_choisi`
4. ✅ Vous êtes connecté via Supabase Auth !

---

## 🔄 Que se passe-t-il après ?

1. L'app utilise **Supabase Auth** (JWT) au lieu de localStorage
2. Les données sont synchronisées avec **Supabase** en temps réel (Realtime)
3. Vos équipes peuvent se connecter simultanément
4. Les permissions sont vérifiées par **RLS** côté serveur

---

## 🚨 Si quelque chose ne marche pas

### Login échoue

❌ **Erreur :** "Identifiants invalides"

✅ **Solution :**
- Vérifiez que l'utilisateur existe dans Supabase Dashboard → Authentication → Users
- Vérifiez que vous avez coché ✅ **Confirm email** lors de la création
- Vérifiez que le mot de passe est correct

### L'app dit "Non authentifié"

✅ **Solution :**
- Actualisez la page (F5)
- Ouvrez DevTools (F12) → Console
- Vérifiez qu'il n'y a pas d'erreurs rouges

### Les données ne se synchro pas

✅ **Solution :**
- C'est normal au démarrage — les données locales sont en cache
- Attendez 5-10 secondes
- L'app va commencer la synchronisation automatiquement vers Supabase

---

## 📋 Checklist Finalisation

- [ ] Tous les utilisateurs créés dans Supabase Auth
- [ ] Chaque utilisateur a ✅ **Confirm email**
- [ ] App relancée (`npm run dev`)
- [ ] Login fonctionne avec admin@freshlink.ma
- [ ] Données locales se synchronisent vers Supabase

---

C'est fait ! 🎉

*Mise à jour : Juin 2026 — Supabase Auth Migration*
