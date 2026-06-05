# 🚨 DÉPLOIEMENT URGENT: Web Registration Analysis + Merchant Locations

**Status:** 🔴 URGENT - Ready for immediate deployment  
**Date:** June 5, 2026  
**Commit:** `70c0005`

---

## 📊 RÉSUMÉ DES MODIFICATIONS

### Amélioration 1: Analyse Web des Clients 📈

**Nouvelles données capturées à l'inscription:**
```
✅ Date/heure d'inscription
✅ Source (website, app, direct)
✅ Qui a recommandé
✅ Nombre de visites avant inscription
✅ Temps passé sur le site
✅ Pages visitées
✅ % de complétion du profil
✅ Documents uploadés
✅ Statut de vérification (pending|verified|rejected)
```

### Amélioration 2: Classification Type de Lieu 🏪

**Pour les marchands, sélection du type de lieu:**
```
✅ Magasin / Épicerie
✅ Bidane (Marché Poisson)
✅ Vendeur Ambulant / Table
✅ Marché Couvert
✅ Kiosque
✅ Restaurant / Hôtel
✅ Dépôt / Stockage
✅ Coopérative
✅ Grossiste
✅ Ferme / Producteur
✅ Autre (spécifier)
```

### Amélioration 3: Nouveau Tableau Audit 📋

**`fl_web_registrations` → Historique détaillé de chaque inscription:**
```
✅ Pages visitées (ordre, temps)
✅ Abandon de formulaire
✅ Champs complétés
✅ Documents uploadés
✅ Type d'appareil (desktop, mobile, tablet)
✅ Navigateur / Système d'exploitation
✅ Résultat (completed, abandoned, error)
```

### Amélioration 4: Insights Acquisition 💡

**Nouvelles données:**
```
✅ Comment client a trouvé FreshLink (Google, Facebook, recommendation, etc)
✅ Facteurs de décision (prix, qualité, facilité, livraison, crédit, service)
✅ Volume annuel prévu (kg)
✅ Attentes spécifiques (texte libre)
```

---

## 🚀 ÉTAPES DE DÉPLOIEMENT (2-3 heures)

### Étape 1: Appliquer la Migration (15 min)

**Option A: Supabase Dashboard (Recommandé)**

1. Allez à: `https://app.supabase.com`
2. Sélectionnez votre projet
3. Allez à `SQL Editor`
4. Collez le contenu de:
   ```
   scripts/012_clients_marchands_web_analysis.sql
   ```
5. Cliquez `Run`
6. Vérifiez le succès (pas d'erreurs)

**Option B: CLI**
```bash
npx supabase db push
```

---

### Étape 2: Mettre à Jour lib/store.ts (30 min)

**Importer les nouveaux types:**

```typescript
import type {
  Client,
  ClientWebRegistration,
  MerchantLocation,
  ClientAcquisition,
  WebRegistrationSession,
  LieuType,
  WebVerificationStatus,
  SourceAcquisition,
  DecisionFactor,
} from "@/lib/types/clients"
```

**Mettre à jour l'interface Client:**

```typescript
export interface Client {
  // ... existing fields ...

  // NEW: Web Registration
  webRegistrationDate?: string
  webRegistrationSource?: "website" | "app" | "direct"
  webRegistrationReferrer?: string
  webAnalysisVisits: number
  webAnalysisTimeSpent: number
  webAnalysisPagesViewed: number
  webProfileCompletion: number
  webDocumentUploads?: DocumentUpload[]
  webVerificationStatus: "pending" | "verified" | "rejected"
  webVerificationDate?: string
  webVerificationNotes?: string

  // NEW: Merchant Location
  lieuType?: "magasin" | "bidane" | "table" | "marche" | "kiosk" | "restaurant" | "depot" | "coopérative" | "grossiste" | "ferme" | "autre"
  lieuTypeAutre?: string
  lieuDescription?: string
  lieuSuperficie?: number
  lieuCaracteristiques?: string[]

  // NEW: Acquisition
  sourceAcquisition?: "google" | "facebook" | "recommendation" | "salesman" | "event" | "word_of_mouth" | "other"
  sourceAcquisitionDetail?: string
  decisionFactors?: string[]
  expectedAnnualVolume?: number
  expectationsText?: string
}
```

---

### Étape 3: Créer Page d'Inscription Améliorée (1-2 hours)

**Créer:** `components/auth/ClientRegistrationForm.tsx`

**Inclure:**

```typescript
// 1. SECTION: Identité basique
- nom
- email
- telephone
- adresse

// 2. SECTION: Type de client & lieu
- type: marchand|restaurant|depot|autre
- lieuType: magasin|bidane|table|marche|kiosk|...
- lieuDescription: texte libre
- lieuSuperficie: nombre (m²)

// 3. SECTION: Caractéristiques du lieu
- Checkboxes: climatisé, étagères, congélateur, etc

// 4. SECTION: Opérations
- taille: 50-100kg|100-500kg|500kg+
- rotation: journalier|hebdomadaire|mensuel
- type_produits: fruits|légumes|poisson|mixte

// 5. SECTION: Acquisition
- Comment trouvé FreshLink (select dropdown)
- Facteurs décision (checkboxes)
- Volume annuel prévu (nombre)
- Attentes (textarea)

// 6. SECTION: Documents
- Upload ICE
- Upload RC

// 7. SECTION: Consentement
- Accepte conditions
- Accepte politique privée
```

**Tracker analytics:**

```typescript
// Capturer pour fl_web_registrations:
const sessionStart = new Date()
const pagesVisited = [] // Ajouter à chaque page
const formStarted = new Date() // Quand utilisateur commence formulaire
const documentsUploaded = [] // Lors uploads

// Submit:
POST /api/registrations → {
  sessionStart,
  pagesVisited,
  formStarted,
  documentsUploaded,
  clientData: {...},
  deviceType,
  browserInfo
}
```

---

### Étape 4: Créer API Endpoints (30 min)

**Créer:** `app/api/registrations/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // 1. Créer client
  const client = await createClient(body.clientData)
  
  // 2. Créer web registration session
  const session = await createWebRegistration({
    clientId: client.id,
    sessionStart: body.sessionStart,
    sessionEnd: new Date(),
    pagesVisited: body.pagesVisited,
    // ... autres champs
  })
  
  // 3. Envoyer email de confirmation
  await sendRegistrationEmail(client.email)
  
  // 4. Retourner résultat
  return NextResponse.json({ client, session })
}
```

**Créer:** `app/api/registrations/analytics/route.ts`

```typescript
// GET /api/registrations/analytics?from=2026-06-01&to=2026-06-30

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from")
  const to = request.nextUrl.searchParams.get("to")
  
  // Query fl_web_registrations et fl_clients
  // Return analytics data
  
  return NextResponse.json({
    totalRegistrations: 45,
    bySource: { google: 18, facebook: 15, ... },
    byLocationTypes: { magasin: 25, bidane: 10, ... },
    conversionRate: 12,
    // ... etc
  })
}
```

---

### Étape 5: Dashboard Analytics (Optional - 30 min)

**Créer:** `components/admin/ClientAnalyticsDashboard.tsx`

**Afficher:**
- Graphique: Inscriptions par source
- Graphique: Type de lieu distribution
- Graphique: Facteurs décision
- Tableau: Clients en attente vérification
- KPI: Taux conversion, volume annuel moyen

---

### Étape 6: Test Local (30 min)

```bash
# 1. Appliquer migration
# (en Supabase Dashboard)

# 2. Installer dépendances
npm install

# 3. Démarrer dev
npm run dev

# 4. Tester
# - Aller à page inscription
# - Remplir tous les champs
# - Vérifier données dans Supabase

# 5. Vérifier base de données
SELECT COUNT(*) FROM fl_web_registrations;
SELECT * FROM fl_clients WHERE web_registration_date IS NOT NULL LIMIT 5;
```

---

### Étape 7: Deploy (15 min)

```bash
# Commit & Push
git push origin main

# Auto-déploie sur Vercel
# Vérifiez le déploiement: https://your-site.vercel.app
```

---

## 📋 CHECKLIST DÉPLOIEMENT

### PRÉ-DÉPLOIEMENT
- [ ] Backup database (Supabase Dashboard > Backups)
- [ ] Vérifier migration SQL syntax
- [ ] Vérifier TypeScript types compile

### MIGRATION
- [ ] Migration 012 appliquée en Supabase
- [ ] Vérifier colonnes ajoutées (SELECT * FROM fl_clients LIMIT 1)
- [ ] Vérifier table fl_web_registrations existe

### CODE
- [ ] lib/store.ts mis à jour avec nouveaux types
- [ ] components/auth/ClientRegistrationForm.tsx créé
- [ ] app/api/registrations/route.ts créé
- [ ] app/api/registrations/analytics/route.ts créé

### TEST
- [ ] Build local réussit: `npm run build`
- [ ] Test inscription en local
- [ ] Vérifier données dans Supabase
- [ ] Test analytics API

### PRODUCTION
- [ ] git push origin main
- [ ] Vercel auto-déploie
- [ ] Test en production
- [ ] Monitor pour erreurs

---

## ⚠️ ROLLBACK (Si problème)

```sql
-- Restaurer backup
-- Supabase Dashboard > Backups > Restore

-- Ou manuellement (ATTENTION!):
DROP TABLE IF EXISTS public.fl_web_registrations CASCADE;

-- Pour l'instant, colonnes restent (safe)
```

---

## 📊 EXEMPLES DE RAPPORTS

### Rapport 1: Inscriptions par Source

```
Source            | Nombre | % du total
Google Search     | 18     | 40%
Facebook Ads      | 15     | 33%
Recommendation    | 10     | 22%
Direct            | 2      | 4%
─────────────────────────────────
TOTAL             | 45     | 100%
```

### Rapport 2: Type de Lieu

```
Lieu Type         | Nombre | % | Vol. Annuel Moy
Magasin           | 25     | 56% | 2.8T
Bidane            | 10     | 22% | 1.5T
Restaurant        | 5      | 11% | 0.8T
Table             | 3      | 7%  | 0.4T
Autre             | 2      | 4%  | 0.2T
─────────────────────────────────────
TOTAL             | 45     | 100% | 5.7T
```

### Rapport 3: Facteurs Décision

```
Facteur          | Mentions | %
Meilleur Prix    | 35       | 78%
Qualité          | 28       | 62%
Facilité Plateforme | 22    | 49%
Livraison        | 18       | 40%
Crédit           | 12       | 27%
Service          | 8        | 18%
```

---

## 🔐 SÉCURITÉ & DONNÉES

**GDPR Compliance:**
- ✅ IP address: anonymized
- ✅ Device info: no personal data
- ✅ Documents: encrypted storage
- ✅ Delete on request: set cascade delete

**Privacy:**
- Analytics data: internal use only
- No sharing with 3rd parties
- User can request deletion

---

## 🚨 POINTS CRITIQUES

1. **Migration SQL:** Doit être exécutée en Supabase
2. **Types TypeScript:** Doivent correspondre au schéma
3. **Analytics tracking:** Doit capturer données en temps réel
4. **Verification workflow:** Process de validation des clients

---

## 📞 SUPPORT

**Questions?**
- Consultez: `SCHEMA_IMPROVEMENTS_CLIENTS_MARCHANDS.md`
- Consultez: `lib/types/clients.ts`
- Consultez: `scripts/012_clients_marchands_web_analysis.sql`

---

## ✅ PROCHAINES ÉTAPES

1. **Maintenant (Immédiat):**
   - [ ] Appliquer migration
   - [ ] Tester en local

2. **Prochains jours:**
   - [ ] Créer formulaire d'inscription
   - [ ] Créer API endpoints
   - [ ] Créer dashboard analytics

3. **Prochaines semaines:**
   - [ ] Intégrer tracking GA4
   - [ ] Créer rapports automatiques
   - [ ] Optimiser conversion

---

**Status:** 🔴 **URGENT** → 🟢 **PRÊT À DÉPLOYER**

**Temps estimé:** 2-3 heures  
**Complexité:** Moyenne  
**Impact:** Critique pour acquisition

---

*Déploiement autorisé: 2026-06-05*  
*Prioriser: OUI*  
*Blocker: NON*
