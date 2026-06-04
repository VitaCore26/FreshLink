# ✅ Créer les utilisateurs DANS L'APP

**Vous aviez raison !** Pas besoin d'aller dans Supabase Dashboard.

---

## 🚀 Comment faire

### Étape 1 : Se connecter en tant qu'admin

Visitez votre app :
```
http://localhost:3000   (local)
ou
https://vitafresh.vita-core.org   (production)
```

Login avec :
- Email: `admin@freshlink.ma`
- Password: Celui que vous avez configuré

---

### Étape 2 : Aller à la page de gestion des utilisateurs

Visitez directement :
```
http://localhost:3000/admin/users
ou
https://vitafresh.vita-core.org/admin/users
```

**Vous verrez la page "👥 Gestion des utilisateurs"**

---

### Étape 3 : Créer vos vrais utilisateurs

Remplissez le formulaire :

| Champ | Exemple |
|---|---|
| **Nom complet** | Mustapha |
| **Email** | mustapha@freshlink.ma |
| **Mot de passe** | UnMotDePasseFort123! |
| **Rôle** | super_admin |

Cliquez **✅ Créer l'utilisateur**

---

## 🎯 Ce qui se passe automatiquement

1. ✅ L'utilisateur est créé dans Supabase Auth
2. ✅ Son profil est créé en base de données
3. ✅ Il peut se connecter avec son email/password
4. ✅ Il a le bon rôle et permissions

---

## 📋 Vos utilisateurs réels à créer

```
Nom                 Email                    Rôle
---                 -----                    ----
Mustapha           mustapha@freshlink.ma   super_admin
Jawad              jawad@freshlink.ma       admin
[Votre resp. comm.]  resp.comm@...         resp_commercial
[Votre prevendeur]  pv@...                 prevendeur
[Votre logistique]  log@...                resp_logistique
[Votre acheteur]    acheteur@...           acheteur
[Votre livreur]     livreur@...            livreur
... etc
```

---

## ✅ Vérification

Après la création, chaque utilisateur peut se connecter avec :
```
Email: (celui que vous avez entré)
Password: (celui que vous avez entré)
```

Et il verra ses données selon son rôle.

---

## 📞 C'est tout !

Plus besoin d'aller dans Supabase Dashboard !

Créez vos utilisateurs **directement dans l'app** via `/admin/users`

---

*Mise à jour : Juin 2026*
