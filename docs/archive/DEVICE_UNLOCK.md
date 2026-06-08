# 🔓 Déblocage Appareils — Fresh Link Pro

## Si vous êtes bloqué par une vérification de sécurité

### Option 1 : Bouton dans l'UI (FACILE)

Vous verrez un bouton gris en bas : **"⚠️ Continuer sans permission"** ou **"⚠️ Continuer sans GPS"**

Cliquez dessus pour contourner la vérification.

---

### Option 2 : Console navigateur (RAPIDE)

1. Appuyez sur `F12` pour ouvrir DevTools
2. Allez à l'onglet **Console**
3. Tapez et appuyez sur Entrée :

```javascript
localStorage.setItem('SECURITY_GUARD_BYPASS', '1'); location.reload();
```

L'app recharge et vous êtes débloqué.

---

### Option 3 : Réinitialisation complète (NUCLÉAIRE)

Si tout est corrompu et l'app ne démarre plus :

1. Appuyez sur `F12` → **Console**
2. Collez ceci et appuyez Entrée :

```javascript
localStorage.clear(); 
sessionStorage.clear(); 
indexedDB.databases?.().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name))); 
location.href = '/';
```

Cela efface **tout** et repart from scratch.

---

## 🔧 Problèmes courants

### "Je suis bloqué sur la vérification de caméra"
- ✅ Cliquez **"Continuer sans permission"**
- OU utilisez Option 2 ci-dessus

### "Je suis bloqué sur la vérification GPS"
- ✅ Cliquez **"Continuer sans GPS"**
- OU Utilisez Option 2

### "L'app ne démarre pas du tout"
- ✅ Utilisez **Option 3** (réinitialisation complète)

### "Après réinitialisation, j'ai besoin de me reconnecter"
- Email : `admin@freshlink.ma`
- Mot de passe : celui de votre `.env.local` (NEXT_PUBLIC_DEMO_PWD)

---

## 🆘 Vérifications rapides

**Vérifiez que `.env.local` existe :**
```
Fresh_Link_Pro/.env.local
```

Contenu attendu :
```env
NEXT_PUBLIC_SUPABASE_URL=https://jwdrwapuetqoqnankgma.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
NEXT_PUBLIC_DEMO_PWD=1234
```

Sans ce fichier, l'app refuse de démarrer.

---

## 📞 Besoin d'aide ?

- **Vérifiez `.env.local`** — c'est la cause #1 de blocage
- **Essayez la réinitialisation** (Option 3)
- **Vérifiez que npm packages sont installés** : `npm install`
- **Redémarrez le serveur** : `npm run dev`

---

*Mise à jour : Juin 2026 — Fixed device approval blocking*
