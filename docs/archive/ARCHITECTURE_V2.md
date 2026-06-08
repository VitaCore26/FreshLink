# 🏗️ Architecture Fresh Link Pro V2
## Web App Online — Multi-utilisateurs — Supabase Auth + Realtime

---

## 📊 Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                    UTILISATEURS FINAUX (Équipes)             │
│  - Mustapha (Admin)  - Jawad (Admin)  - Équipe logistique    │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  VERCEL (Frontend) │
                    │   Next.js 15       │
                    │  React 19 + TS     │
                    └──────────┬─────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼────────┐   │    ┌────────▼────────┐
        │ /api/* Routes  │   │    │ Supabase JS SDK │
        │ (Server-side)  │   │    │ (Client-side)   │
        └────────┬──────┘    │    └────────┬─────────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
                    ┌─────────▼──────────┐
                    │ SUPABASE (Backend) │
                    │                    │
                    │ ✅ Auth (JWT)     │
                    │ ✅ PostgreSQL      │
                    │ ✅ Realtime        │
                    │ ✅ RLS Policies    │
                    │ ✅ Storage         │
                    └────────────────────┘
```

---

## 🔐 Couches de sécurité

### Couche 1 : Authentification
```
localStorage (demo seulement)
    ↓
Supabase Auth (JWT)
    ↓
httpOnly cookies (session)
```

### Couche 2 : Autorisation (Permissions)
```
/api/data/upsert → vérification rôle serveur
    ↓
Supabase RLS policies
    ↓
User ne peut lire/écrire que ses données
```

### Couche 3 : Validation
```
Client-side (Zod) → format
Server-side (/api) → logique métier
Database (RLS) → intégrité
```

---

## 📂 Nouvelle structure fichiers

```
Fresh_Link_Pro/
├── lib/
│   ├── auth/
│   │   ├── supabaseAuth.ts     ✨ NOUVEAU — Authentification Supabase
│   │   └── middleware.ts
│   ├── supabase/
│   │   ├── client.ts           ✅ Mis à jour — Env vars obligatoires
│   │   ├── server.ts           ✅ Mis à jour — Env vars obligatoires
│   │   └── middleware.ts       ✅ Amélioré — Vérification session
│   └── store.ts                ⚠️ Déprécié — Garder pour fallback offline seulement
│
├── hooks/
│   └── useAuth.ts              ✨ NOUVEAU — Hook React pour session
│
├── app/
│   ├── page.tsx                ✅ Refactorisé — useAuth + Supabase
│   ├── layout.tsx              ✅ Amélioré
│   └── api/
│       ├── auth/
│       │   ├── signin/route.ts  ✨ NOUVEAU — Login serveur
│       │   └── signout/route.ts ✨ NOUVEAU — Logout serveur
│       └── data/
│           └── upsert/route.ts  ✨ NOUVEAU — Mutations validées
│
└── scripts/
    ├── 010_schema_final.sql
    ├── 011_rls_policies.sql
    └── SETUP_USERS.md           ✨ NOUVEAU — Instructions utilisateurs
```

---

## 🔄 Flow d'authentification

```
USER SIGNS IN
    ↓
LoginPage.tsx
    ↓
signInWithEmailFallback()
    ├─ Essayer Supabase Auth
    ├─ Fallback localStorage (dev seulement)
    └─ Récupérer profil de fl_users
    ↓
useAuth() hook écoute changements
    ↓
App reçoit `user` avec JWT
    ↓
Routes /api/* validées avec JWT
    ↓
RLS Supabase filtre les données
    ↓
Frontend affiche que ce que l'user a permission de voir
```

---

## 📡 Synchronisation Realtime

```
Prévendeur crée une commande
    ↓
/api/data/upsert (validation serveur)
    ↓
INSERT dans fl_commandes (Supabase)
    ↓
RLS permet Manager de la voir
    ↓
Supabase Realtime envoie broadcast
    ↓
Tous les Managers reçoivent update
    ↓
UI met à jour automatiquement (websocket)
```

---

## 🚀 Avantages V2

| V1 (localStorage) | V2 (Supabase Auth) |
|---|---|
| ❌ Données seulement locales | ✅ Données en cloud (Supabase) |
| ❌ Pas de multi-utilisateurs | ✅ Équipes entières connectées |
| ❌ Pas de sync temps réel | ✅ Realtime websockets |
| ❌ Auth client-side bypassable | ✅ JWT + RLS inviolable |
| ❌ Mot de passe en localStorage | ✅ Passwords chiffré Supabase |
| ❌ Offline seulement | ✅ Online + offline fallback |

---

## 📋 Checklist Déploiement

- [ ] **SETUP_USERS.md** — Créer utilisateurs Supabase Auth
- [ ] `.env.local` — Vérifier clés NEXT_PUBLIC_*
- [ ] `npm install` — Installer packages
- [ ] `npm run build` — Compilation sans erreurs
- [ ] `npm run dev` — Tester localement
- [ ] Login fonctionne
- [ ] Données se synchronisent
- [ ] Pusher vers Vercel
- [ ] Test production

---

## 🔗 Liens

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/auth/row-level-security)

---

*Architecture : Juin 2026 — Production Ready*
