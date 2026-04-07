# FreshLink — Guide Complet : VS Code + Vercel + Supabase

---

## PARTIE 1 — TÉLÉCHARGER ET OUVRIR DANS VS CODE

### Étape 1 : Télécharger le projet depuis v0

1. Ouvrez votre projet sur **v0.app**
2. Cliquez sur les **3 points (...)** en haut à droite du bloc de code
3. Sélectionnez **"Download ZIP"**
4. Extrayez le ZIP dans un dossier, par ex : `C:\projets\freshlink\`

### Étape 2 : Ouvrir dans VS Code

```bash
# Option A : depuis le terminal
cd C:\projets\freshlink
code .

# Option B : VS Code > File > Open Folder > choisir le dossier
```

### Étape 3 : Installer les dépendances

```bash
npm install
```

### Étape 4 : Créer le fichier .env.local

Créez un fichier `.env.local` à la racine du projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://VOTRE_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_anon_key_ici

# (Optionnel) pour les opérations serveur
SUPABASE_SERVICE_ROLE_KEY=votre_service_role_key_ici
```

### Étape 5 : Lancer en local

```bash
npm run dev
# Ouvrez http://localhost:3000
```

---

## PARTIE 2 — CONFIGURATION SUPABASE

### Étape 1 : Créer un projet Supabase

1. Allez sur **https://supabase.com**
2. Cliquez **"New project"**
3. Choisissez votre organisation, donnez un nom : `freshlink`
4. Définissez un mot de passe de base de données (gardez-le précieusement)
5. Choisissez la région : **eu-west-3 (Paris)** recommandé pour le Maroc
6. Cliquez **"Create new project"** — attendre 1-2 minutes

### Étape 2 : Récupérer les clés API

1. Dans votre projet Supabase → **Settings** (icône engrenage) → **API**
2. Copiez :
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ ne jamais exposer côté client)

### Étape 3 : Exécuter le script SQL

1. Dans Supabase → **SQL Editor** (icône base de données)
2. Cliquez **"New query"**
3. Copiez **tout le contenu** de `scripts/supabase_FINAL_SETUP.sql`
4. Collez dans l'éditeur
5. Cliquez **"Run"** (ou Ctrl+Entrée)
6. Vérifiez que la dernière requête SELECT affiche des chiffres > 0

### Étape 4 : Vérifier la connexion depuis l'app

Après avoir configuré les variables d'environnement et relancé :
- Connectez-vous en tant que `superadmin@freshlink.ma` / `superadmin2024`
- En haut à droite du back-office, vous verrez un badge **"Supabase"** bleu clignotant si la connexion est active
- Si vous voyez **"DB offline"** en rouge → vérifiez vos variables `.env.local`

---

## PARTIE 3 — DÉPLOIEMENT SUR VERCEL

### Étape 1 : Installer Vercel CLI

```bash
npm install -g vercel
```

### Étape 2 : Se connecter à Vercel

```bash
vercel login
# Choisissez : Continue with Email ou GitHub
```

### Étape 3 : Initialiser le projet

```bash
# Dans le dossier du projet
cd C:\projets\freshlink
vercel
```

Répondre aux questions :
- **Set up and deploy?** → `Y`
- **Which scope?** → votre compte
- **Link to existing project?** → `N` (première fois)
- **What's your project name?** → `freshlink`
- **In which directory?** → `.` (entrée)
- **Override settings?** → `N`

### Étape 4 : Ajouter les variables d'environnement sur Vercel

```bash
# Méthode 1 : CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Coller votre URL, choisir: Production, Preview, Development

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Coller votre clé anon

vercel env add SUPABASE_SERVICE_ROLE_KEY
# Coller votre service role key
# IMPORTANT : choisir SEULEMENT Production et Preview (pas Development)
```

```
# Méthode 2 : Interface Web
1. Allez sur https://vercel.com/dashboard
2. Cliquez sur votre projet freshlink
3. Settings → Environment Variables
4. Ajoutez chaque variable avec sa valeur
```

### Étape 5 : Déployer en production

```bash
# Déploiement de production
vercel --prod

# Ou via git (recommandé)
git add .
git commit -m "Deploy FreshLink"
git push origin main
# Vercel déploie automatiquement à chaque push sur main
```

### Étape 6 : Connecter GitHub (recommandé)

```bash
# Dans VS Code, ouvrez un terminal
git init
git add .
git commit -m "Initial commit FreshLink"

# Sur GitHub : créer un nouveau repo "freshlink"
git remote add origin https://github.com/VOTRE_USER/freshlink.git
git push -u origin main
```

Sur Vercel → votre projet → **Settings** → **Git** → connecter le repo GitHub
Désormais, chaque `git push` déclenche un déploiement automatique.

---

## PARTIE 4 — WORKFLOW QUOTIDIEN VS CODE

### Structure recommandée de l'espace de travail

```
freshlink/
├── .env.local          ← variables locales (NE PAS commiter)
├── .env.example        ← template des variables (à commiter)
├── .gitignore          ← s'assurer que .env.local est dedans
├── app/
│   └── page.tsx
├── components/
│   ├── backoffice/
│   ├── mobile/
│   └── portail/
├── lib/
│   ├── store.ts
│   └── supabase/
├── scripts/
│   └── supabase_FINAL_SETUP.sql
└── GUIDE_VSCODE_VERCEL_SUPABASE.md
```

### Extensions VS Code recommandées

- **ESLint** (dbaeumer.vscode-eslint)
- **Tailwind CSS IntelliSense** (bradlc.vscode-tailwindcss)
- **Prettier** (esbenp.prettier-vscode)
- **GitLens** (eamodio.gitlens)
- **Thunder Client** (rangav.vscode-thunder-client) — tester les API

### Commandes utiles

```bash
# Développement local
npm run dev

# Build de production (tester avant déploiement)
npm run build
npm start

# Vérifier les erreurs TypeScript
npx tsc --noEmit

# Déployer sur Vercel
vercel --prod

# Voir les logs Vercel en temps réel
vercel logs --follow

# Lister les déploiements
vercel ls
```

---

## PARTIE 5 — DÉPANNAGE COURANT

| Problème | Cause | Solution |
|----------|-------|----------|
| Écran blanc | Erreur JS au chargement | Ouvrir DevTools (F12) → Console → lire l'erreur |
| "DB offline" badge rouge | Supabase non connecté | Vérifier `.env.local` ou les Vercel env vars |
| Build fail sur Vercel | Erreur TypeScript | Lancer `npx tsc --noEmit` en local |
| Page 404 sur Vercel | Mauvais dossier de build | Vérifier `vercel.json` ou paramètres projet |
| Données perdues | localStorage effacé | Utiliser DataGuard → Exporter avant de vider |
| Login superadmin échoue | Mauvais mot de passe | `superadmin@freshlink.ma` / `superadmin2024` |

---

## COMPTES PAR DÉFAUT (après SQL setup)

| Compte | Email | Mot de passe | Rôle |
|--------|-------|-------------|------|
| Super Admin | superadmin@freshlink.ma | superadmin2024 | Accès complet |
| Ourai (RH) | ourai@freshlink.ma | ourai2024 | RH & Salaires |
| Azmi (Compta) | azmi@freshlink.ma | azmi2024 | Comptabilité RH |
| Hicham (Admin) | hicham@freshlink.ma | hicham2024 | Admin général |
