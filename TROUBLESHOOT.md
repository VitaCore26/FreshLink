# 🔧 Dépannage Complet — Fresh Link Pro

## Problème : "Supabase non joignable" (968 entrées non synchronisées)

### Cause #1 : `.env.local` manquant ou incorrect

**Vérifier :**
```bash
# Fichier doit exister :
Fresh_Link_Pro/.env.local

# Et contenir :
NEXT_PUBLIC_SUPABASE_URL=https://jwdrwapuetqoqnankgma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi... (la vraie clé)
NEXT_PUBLIC_DEMO_PWD=1234
```

**Correction :**
1. Ouvrez VS Code
2. Créez `Fresh_Link_Pro/.env.local`
3. Copiez les valeurs de Supabase Dashboard
4. Sauvegardez (Ctrl+S)
5. Relancez : `npm run dev`

---

## Problème : Blocage device après approbation

### Solution rapide : Console navigateur

Appuyez sur `F12` et collez :
```javascript
localStorage.setItem('SECURITY_GUARD_BYPASS', '1'); location.reload();
```

### Ou cliquez le bouton gris : "⚠️ Continuer sans permission"

---

## Problème : Erreur au démarrage (Cannot read properties...)

### Étape 1 : Réinitialisation complète

Console navigateur (F12) :
```javascript
localStorage.clear(); sessionStorage.clear(); location.href = '/';
```

### Étape 2 : Vérifier Node et npm

```bash
cd Fresh_Link_Pro
npm -v      # Doit être ≥ 9
node -v     # Doit être ≥ 18
npm install # Réinstaller packages
npm run dev
```

### Étape 3 : Vérifier Supabase connexion

Console navigateur :
```javascript
// Testez la connexion
fetch('https://jwdrwapuetqoqnankgma.supabase.co/rest/v1/')
  .then(r => r.json())
  .then(d => console.log('✅ Supabase OK', d))
  .catch(e => console.error('❌ Supabase ERREUR', e))
```

Si ✅ → La BD est joignable
Si ❌ → Vérifiez votre internet ou que les clés Supabase sont correctes

---

## Problème : Login ne fonctionne pas

### Vérifiez les credentials :

Email et password proviennent de **NEXT_PUBLIC_DEMO_PWD** :

```bash
# Utilisateurs valides (si NEXT_PUBLIC_DEMO_PWD=1234) :
Email: admin@freshlink.ma
Mot de passe: 1234

Email: prevendeur@freshlink.ma
Mot de passe: 1234

Email: responsable@freshlink.ma
Mot de passe: 1234
```

**Si vous changez NEXT_PUBLIC_DEMO_PWD**, tous les comptes demo utilisent ce nouveau mot de passe.

---

## Problème : Données locales non synchronisées (968 entrées)

### C'est normal en offline

L'app fonctionne **offline-first** :
- ✅ Les 968 entrées sont dans localStorage
- ⚠️ Elles ne sont pas en Supabase (juste pas synchronisées)

### Forcer la synchronisation :

Console navigateur :
```javascript
localStorage.removeItem('fl_supabase_synced_v1');
location.reload();
```

L'app va retenter le sync vers Supabase.

---

## Checklist Diagnostic Complet

- [ ] `.env.local` existe et contient les bonnes clés
- [ ] `npm install` a été lancé
- [ ] `npm run dev` démarre sans erreur
- [ ] Console navigateur (F12) ne montre pas d'erreurs rouges
- [ ] Supabase est joignable (test fetch ci-dessus)
- [ ] Vous pouvez vous connecter avec admin@freshlink.ma / votre DEMO_PWD
- [ ] Les 968 entrées locales s'affichent (même sans sync)

---

## 🆘 Si rien ne marche

**Réinitialisation NUCLÉAIRE :**

```bash
# Terminal
cd Fresh_Link_Pro
rm -rf node_modules .next
npm install
npm run dev
```

```javascript
// Console navigateur (F12)
localStorage.clear(); sessionStorage.clear(); location.reload();
```

Cela repart from scratch complet.

---

## 📊 Statuts de synchronisation

| Message | Signifie | Action |
|---|---|---|
| "968 entrées locales" | Données en localStorage | OK — app fonctionne |
| "Supabase non joignable" | Sync échoue | Vérifiez `.env.local` + internet |
| "Synchronisé" | Données en Supabase | Parfait ✅ |
| "Offline" | Pas de connexion | Utilisez les données locales |

---

## 🔐 Notes de sécurité

- **Ne jamais committer `.env.local`** — il contient vos clés
- **NEXT_PUBLIC_** variables sont visibles au frontend — OK, c'est intentionnel
- **Approbation device** peut être bypassée en développement avec SECURITY_GUARD_BYPASS
- **En production**, enlevez les boutons bypass et implémentez Supabase Auth

---

*Mise à jour : Juin 2026*
