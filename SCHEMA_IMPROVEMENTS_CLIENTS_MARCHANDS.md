# 🔧 AMÉLIORATIONS SCHÉMA: Clients Web + Marchands

**Priority:** 🔴 URGENT  
**Date:** June 5, 2026  
**Status:** Plan de modification

---

## 📋 MODIFICATIONS REQUISES

### 1️⃣ TABLE: fl_clients (Clients/Marchands)

#### Ajouter colonnes pour inscription web:

```sql
-- Analyse inscription web
web_registration_date       TIMESTAMPTZ,          -- Date inscription web
web_registration_source     TEXT,                  -- Source (website, app, direct)
web_registration_referrer   TEXT,                  -- Qui l'a référé
web_analysis_visits         INTEGER DEFAULT 0,    -- Nombre de visites avant inscription
web_analysis_time_spent     INTEGER DEFAULT 0,    -- Temps passé (secondes)
web_analysis_pages_viewed   INTEGER DEFAULT 0,    -- Pages visitées
web_profile_completion      NUMERIC DEFAULT 0,    -- % profil complété
web_document_uploads        JSONB DEFAULT '[]',   -- Documents uploadés (ICE, RC, etc)
web_verification_status     TEXT DEFAULT 'pending', -- pending|verified|rejected
web_verification_date       TIMESTAMPTZ,
web_verification_notes      TEXT,

-- Type de lieu (pour marchands)
lieu_type                   TEXT,                  -- magasin|bidane|table|marche|kiosk|autre
lieu_type_autre             TEXT,                  -- Si autre: description
lieu_description            TEXT,                  -- Description du lieu
lieu_superficie             NUMERIC,               -- Surface en m²
lieu_caracteristiques       JSONB DEFAULT '[]',   -- [climatisé, etageres, congelateur, etc]

-- Analyse détaillée
source_acquisition          TEXT,                  -- Comment trouvé FreshLink
source_acquisition_detail   TEXT,                  -- Détails source
decision_factors            JSONB DEFAULT '[]',   -- [prix, qualite, facilite, etc]
expected_annual_volume      NUMERIC,               -- Volume annuel prévu
expectations_text           TEXT,                  -- Attentes texte libre
```

#### Exemple complet de table modifiée:

```sql
DROP TABLE IF EXISTS public.fl_clients CASCADE;
CREATE TABLE public.fl_clients (
  -- Identité
  id                          TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  nom                         TEXT NOT NULL,
  secteur                     TEXT NOT NULL DEFAULT '',
  zone                        TEXT NOT NULL DEFAULT '',
  
  -- Type de client
  type                        TEXT NOT NULL DEFAULT 'marchand',  -- marchand|restaurant|depot|autre
  type_autre                  TEXT,
  
  -- Type de lieu (NOUVEAU pour marchands)
  lieu_type                   TEXT,                  -- magasin|bidane|table|marche|kiosk|autre
  lieu_type_autre             TEXT,
  lieu_description            TEXT,
  lieu_superficie             NUMERIC,
  lieu_caracteristiques       JSONB DEFAULT '[]',
  
  -- Stock & opérations
  taille                      TEXT DEFAULT '50-100kg',
  type_produits               TEXT DEFAULT 'moyenne',
  rotation                    TEXT DEFAULT 'journalier',
  
  -- Paiement & crédit
  modalite_paiement           TEXT,
  plafond_credit              NUMERIC DEFAULT 0,
  credit_autorise             BOOLEAN DEFAULT FALSE,
  delai_recouvrement          TEXT,
  credit_workflow_validateur  TEXT,
  credit_workflow_validateur_nom TEXT,
  credit_statut               TEXT DEFAULT 'ok',
  credit_solde                NUMERIC DEFAULT 0,
  
  -- Localisation
  gps_lat                     NUMERIC,
  gps_lng                     NUMERIC,
  telephone                   TEXT,
  email                       TEXT,
  adresse                     TEXT,
  
  -- Documents
  ice                         TEXT,
  notes                       TEXT,
  
  -- Inscription web (NOUVEAU)
  web_registration_date       TIMESTAMPTZ,
  web_registration_source     TEXT,                  -- website|app|direct
  web_registration_referrer   TEXT,
  web_analysis_visits         INTEGER DEFAULT 0,
  web_analysis_time_spent     INTEGER DEFAULT 0,
  web_analysis_pages_viewed   INTEGER DEFAULT 0,
  web_profile_completion      NUMERIC DEFAULT 0,
  web_document_uploads        JSONB DEFAULT '[]',
  web_verification_status     TEXT DEFAULT 'pending',  -- pending|verified|rejected
  web_verification_date       TIMESTAMPTZ,
  web_verification_notes      TEXT,
  
  -- Analyse acquisition
  source_acquisition          TEXT,                  -- Comment trouvé FreshLink
  source_acquisition_detail   TEXT,
  decision_factors            JSONB DEFAULT '[]',   -- Facteurs décision
  expected_annual_volume      NUMERIC,
  expectations_text           TEXT,
  
  -- Audit
  created_by                  TEXT NOT NULL DEFAULT '',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),
  prevendeur_id               TEXT,
  team_lead_id                TEXT,
  default_heure_livraison     TEXT
);

-- Index pour performance
CREATE INDEX idx_clients_web_registration ON public.fl_clients(web_registration_date DESC);
CREATE INDEX idx_clients_lieu_type ON public.fl_clients(lieu_type);
CREATE INDEX idx_clients_web_verification ON public.fl_clients(web_verification_status);
```

---

### 2️⃣ TABLE: fl_fournisseurs (Marchands/Fournisseurs)

#### Ajouter colonnes pour type de lieu:

```sql
DROP TABLE IF EXISTS public.fl_fournisseurs CASCADE;
CREATE TABLE public.fl_fournisseurs (
  -- Identité
  id                 TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  nom                TEXT NOT NULL,
  contact            TEXT NOT NULL DEFAULT '',
  telephone          TEXT,
  email              TEXT NOT NULL DEFAULT '',
  
  -- Type de lieu (NOUVEAU)
  lieu_type          TEXT,                       -- magasin|ferme|grossiste|coopérative|autre
  lieu_type_autre    TEXT,
  lieu_description   TEXT,
  lieu_caracteristiques JSONB DEFAULT '[]',     -- [livraison, stockage, refrigere, etc]
  
  -- Localisation
  adresse            TEXT,
  ville              TEXT,
  region             TEXT,
  gps_lat            NUMERIC,
  gps_lng            NUMERIC,
  
  -- Produits & opérations
  specialites        JSONB DEFAULT '[]',
  capacite_stock     NUMERIC,                    -- Capacité de stockage (tonnes)
  volume_hebdo       NUMERIC,                    -- Volume hebdomadaire typique
  modalite_paiement  TEXT,
  delai_paiement     INTEGER,
  
  -- Documents
  ice                TEXT,
  rc                 TEXT,
  
  -- Logistique
  itineraires        JSONB DEFAULT '[]',
  jours_livraison    JSONB DEFAULT '[]',        -- [lundi, mardi, ...]
  horaires_livraison TEXT,
  
  -- Notes
  notes              TEXT,
  
  -- Audit
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_fournisseurs_lieu_type ON public.fl_fournisseurs(lieu_type);
CREATE INDEX idx_fournisseurs_specialites ON public.fl_fournisseurs USING GIN(specialites);
```

---

### 3️⃣ NOUVELLE TABLE: fl_web_registrations (Audit inscription web)

```sql
DROP TABLE IF EXISTS public.fl_web_registrations CASCADE;
CREATE TABLE public.fl_web_registrations (
  id                    TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  
  -- Lien client
  client_id             TEXT REFERENCES public.fl_clients(id) ON DELETE CASCADE,
  
  -- Timing
  session_start         TIMESTAMPTZ NOT NULL,
  session_end           TIMESTAMPTZ,
  duration_seconds      INTEGER,
  
  -- Navigation
  first_page            TEXT,                    -- Page d'entrée
  last_page             TEXT,                    -- Dernière page visitée
  pages_visited         JSONB DEFAULT '[]',     -- Historique pages
  referrer              TEXT,                    -- Provenance (Google, Facebook, etc)
  
  -- Interactions
  form_started          TIMESTAMPTZ,
  form_completed        TIMESTAMPTZ,
  form_abandonments     INTEGER DEFAULT 0,      -- Fois abandonné et repris
  form_fields_filled    JSONB DEFAULT '{}',     -- Quels champs remplis/non
  
  -- Documents
  documents_uploaded    JSONB DEFAULT '[]',     -- [{type: 'ICE', filename: '...', size: ...}]
  
  -- Analyse
  browser_info          TEXT,
  device_type           TEXT,                    -- desktop|mobile|tablet
  ip_address            TEXT,
  
  -- Résultat
  registration_status   TEXT,                    -- completed|abandoned|error
  registration_date     TIMESTAMPTZ,
  
  -- Notes
  notes                 TEXT,
  
  -- Audit
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_web_regs_client_id ON public.fl_web_registrations(client_id);
CREATE INDEX idx_web_regs_session_start ON public.fl_web_registrations(session_start DESC);
CREATE INDEX idx_web_regs_status ON public.fl_web_registrations(registration_status);
```

---

### 4️⃣ ENUMS / TYPES (Valeurs possibles)

```sql
-- Type de lieu pour marchands
CREATE TYPE lieu_type_enum AS ENUM (
  'magasin',        -- Petit magasin/épicerie
  'bidane',         -- Bidane (marché poisson)
  'table',          -- Vendeur ambulant/table
  'marche',         -- Marché couvert
  'kiosk',          -- Kiosque
  'restaurant',     -- Restaurant/Hotel
  'depot',          -- Dépôt/stockage
  'coopérative',    -- Coopérative
  'grossiste',      -- Grossiste
  'ferme',          -- Producteur direct
  'autre'           -- Autre
);

-- Source acquisition client
CREATE TYPE source_acquisition_enum AS ENUM (
  'google',         -- Recherche Google
  'facebook',       -- Publicité Facebook
  'recommendation', -- Recommandation client existant
  'salesman',       -- Commercial
  'event',          -- Événement/salon
  'word_of_mouth',  -- Bouche à oreille
  'other'           -- Autre
);

-- Facteurs décision
CREATE TYPE decision_factor_enum AS ENUM (
  'prix',           -- Meilleur prix
  'qualite',        -- Qualité produits
  'facilite',       -- Facilité plateforme
  'livraison',      -- Rapidité livraison
  'credit',         -- Conditions crédit
  'service',        -- Qualité service
  'innovation',     -- Innovation/nouveauté
  'autres'          -- Autres
);
```

---

## 📊 ANALYSE DÉTAILLÉE CLIENTS WEB

### Données capturées lors inscription:

```
1. TIMING
   - Date inscription
   - Heure inscription
   - Durée session (avant inscription)
   
2. SOURCE
   - Où trouvé FreshLink (Google, Facebook, recommandation, etc)
   - Qui a recommandé (si applicable)
   - Page d'arrivée
   
3. NAVIGATION
   - Pages visitées avant inscription
   - Temps par page
   - Rebonds
   
4. PROFIL
   - Données complétées vs incomplètes (%)
   - Documents uploadés
   - Vérifications effectuées
   
5. DÉCISION
   - Raisons choix FreshLink
   - Volume prévu
   - Attentes spécifiques
   
6. LIEU (si marchand)
   - Type magasin (magasin, bidane, table, etc)
   - Surface
   - Caractéristiques (frigo, étagères, etc)
   
7. SUIVI POST-INSCRIPTION
   - Email verification
   - Documents vérifiés
   - Statut approbation
```

### Rapport d'analyse possible:

```
CLIENT REGISTRATION ANALYTICS REPORT

Période: [Date1] à [Date2]
Total inscriptions: 45
Taux conversion: 12% (45/375 visiteurs)

PAR SOURCE:
  Google Search      18  (40%)
  Facebook Ads       15  (33%)
  Recommendation     10  (22%)
  Direct              2   (4%)

PAR TYPE DE LIEU:
  Magasin            25  (56%)
  Bidane             10  (22%)
  Restaurant          5   (11%)
  Table               3    (7%)
  Autre               2    (4%)

PROFIL COMPLETION:
  100%               30  (67%)
   75-99%            12  (27%)
   50-74%             3   (6%)

DOCUMENTS:
  ICE uploadé        42  (93%)
  RC uploadé         38  (84%)
  Autres             15  (33%)

ATTENTES:
  Volume moyen annuel: 2.5T
  Principaux besoins: [Fraîcheur, Prix, Facilité livraison]

NEXT STEPS:
  À vérifier         12
  À approuver        25
  À rejeter           2
  Approuvés           6
```

---

## 🔧 MIGRATION SQL

### Migration file: `scripts/011_update_clients_marchands.sql`

```sql
-- ════════════════════════════════════════════════════════════════
-- Migration: Add web registration analysis + merchant location types
-- Date: 2026-06-05
-- ════════════════════════════════════════════════════════════════

-- Backup existing data (optional but recommended)
CREATE TABLE public.fl_clients_backup AS SELECT * FROM public.fl_clients;

-- 1. Add columns to fl_clients
ALTER TABLE public.fl_clients
ADD COLUMN web_registration_date TIMESTAMPTZ,
ADD COLUMN web_registration_source TEXT,
ADD COLUMN web_registration_referrer TEXT,
ADD COLUMN web_analysis_visits INTEGER DEFAULT 0,
ADD COLUMN web_analysis_time_spent INTEGER DEFAULT 0,
ADD COLUMN web_analysis_pages_viewed INTEGER DEFAULT 0,
ADD COLUMN web_profile_completion NUMERIC DEFAULT 0,
ADD COLUMN web_document_uploads JSONB DEFAULT '[]',
ADD COLUMN web_verification_status TEXT DEFAULT 'pending',
ADD COLUMN web_verification_date TIMESTAMPTZ,
ADD COLUMN web_verification_notes TEXT,
ADD COLUMN lieu_type TEXT,
ADD COLUMN lieu_type_autre TEXT,
ADD COLUMN lieu_description TEXT,
ADD COLUMN lieu_superficie NUMERIC,
ADD COLUMN lieu_caracteristiques JSONB DEFAULT '[]',
ADD COLUMN source_acquisition TEXT,
ADD COLUMN source_acquisition_detail TEXT,
ADD COLUMN decision_factors JSONB DEFAULT '[]',
ADD COLUMN expected_annual_volume NUMERIC,
ADD COLUMN expectations_text TEXT,
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Create web registrations table
CREATE TABLE public.fl_web_registrations (
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  client_id TEXT REFERENCES public.fl_clients(id) ON DELETE CASCADE,
  session_start TIMESTAMPTZ NOT NULL,
  session_end TIMESTAMPTZ,
  duration_seconds INTEGER,
  first_page TEXT,
  last_page TEXT,
  pages_visited JSONB DEFAULT '[]',
  referrer TEXT,
  form_started TIMESTAMPTZ,
  form_completed TIMESTAMPTZ,
  form_abandonments INTEGER DEFAULT 0,
  form_fields_filled JSONB DEFAULT '{}',
  documents_uploaded JSONB DEFAULT '[]',
  browser_info TEXT,
  device_type TEXT,
  ip_address TEXT,
  registration_status TEXT,
  registration_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX idx_clients_web_registration ON public.fl_clients(web_registration_date DESC);
CREATE INDEX idx_clients_lieu_type ON public.fl_clients(lieu_type);
CREATE INDEX idx_clients_web_verification ON public.fl_clients(web_verification_status);
CREATE INDEX idx_web_regs_client_id ON public.fl_web_registrations(client_id);
CREATE INDEX idx_web_regs_session_start ON public.fl_web_registrations(session_start DESC);
CREATE INDEX idx_web_regs_status ON public.fl_web_registrations(registration_status);

-- 4. Update fl_fournisseurs
ALTER TABLE public.fl_fournisseurs
ADD COLUMN lieu_type TEXT,
ADD COLUMN lieu_type_autre TEXT,
ADD COLUMN lieu_description TEXT,
ADD COLUMN lieu_caracteristiques JSONB DEFAULT '[]',
ADD COLUMN gps_lat NUMERIC,
ADD COLUMN gps_lng NUMERIC,
ADD COLUMN capacite_stock NUMERIC,
ADD COLUMN volume_hebdo NUMERIC,
ADD COLUMN jours_livraison JSONB DEFAULT '[]',
ADD COLUMN horaires_livraison TEXT;

CREATE INDEX idx_fournisseurs_lieu_type ON public.fl_fournisseurs(lieu_type);

-- Migration complete
SELECT 'Migration 011: Clients & Marchands schema update - COMPLETE' as status;
```

---

## ✅ DÉPLOIEMENT

1. **Backup database** (recommandé)
2. **Run migration** en Supabase Dashboard
3. **Update TypeScript interfaces** (lib/store.ts)
4. **Update API routes** pour capturer données web
5. **Deploy** à production

---

## 📋 CHECKLIST MISE EN ŒUVRE

- [ ] Migration SQL appliquée
- [ ] Types TypeScript mis à jour
- [ ] Formulaire inscription web modifié
- [ ] Analytics tracking implémentés
- [ ] API endpoints créés
- [ ] Rapports/dashboards créés
- [ ] Documentations utilisateur

---

**Status:** 🔴 URGENT - Plan ready for implementation  
**Ready:** À déployer immédiatement après approbation

