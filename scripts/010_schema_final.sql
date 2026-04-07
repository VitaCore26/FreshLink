-- ============================================================
-- OPTIMFLUX — SCHEMA FINAL v10
-- Supabase: https://nphrncmuxbwahqnzdyxp.supabase.co
-- Date: 2026 | Auteur: Jawad
-- Toutes les tables metier avec RLS desactivee (gestion auth maison)
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════════════════════════════════════════════════
-- 1. DEPOTS (multi-entrepot)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_depots CASCADE;
CREATE TABLE public.fl_depots (
  id               TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  nom              TEXT NOT NULL,
  adresse          TEXT,
  ville            TEXT,
  actif            BOOLEAN DEFAULT TRUE,
  responsable_nom  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Depot par defaut
INSERT INTO public.fl_depots (id, nom, actif) VALUES
  ('DEPOT_PRINCIPAL', 'Depot Principal', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 2. UTILISATEURS
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_users CASCADE;
CREATE TABLE public.fl_users (
  id                             TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  name                           TEXT NOT NULL,
  email                          TEXT UNIQUE NOT NULL,
  password                       TEXT NOT NULL DEFAULT '1234',
  password_mobile                TEXT,
  password_bo                    TEXT,
  role                           TEXT NOT NULL DEFAULT 'prevendeur',
  access_type                    TEXT,           -- 'mobile' | 'backoffice' | 'both'
  secteur                        TEXT,
  phone                          TEXT,
  telephone                      TEXT,
  actif                          BOOLEAN DEFAULT TRUE,
  photo_url                      TEXT,
  require_camera_auth            BOOLEAN DEFAULT FALSE,
  -- Permissions granulaires
  can_view_achat                 BOOLEAN DEFAULT FALSE,
  can_view_commercial            BOOLEAN DEFAULT FALSE,
  can_view_logistique            BOOLEAN DEFAULT FALSE,
  can_view_stock                 BOOLEAN DEFAULT FALSE,
  can_view_cash                  BOOLEAN DEFAULT FALSE,
  can_view_finance               BOOLEAN DEFAULT FALSE,
  can_view_recap                 BOOLEAN DEFAULT FALSE,
  can_view_database              BOOLEAN DEFAULT FALSE,
  can_view_external              BOOLEAN DEFAULT FALSE,
  can_create_commande_bo         BOOLEAN DEFAULT FALSE,
  -- Objectifs prevendeur
  objectif_clients               INTEGER DEFAULT 0,
  objectif_tonnage               INTEGER DEFAULT 0,
  objectif_journalier_ca         NUMERIC DEFAULT 0,
  objectif_hebdomadaire_ca       NUMERIC DEFAULT 0,
  objectif_mensuel_ca            NUMERIC DEFAULT 0,
  objectif_journalier_clients    INTEGER DEFAULT 0,
  objectif_hebdomadaire_clients  INTEGER DEFAULT 0,
  objectif_mensuel_clients       INTEGER DEFAULT 0,
  -- Notifications workflow
  notif_achat                    BOOLEAN DEFAULT FALSE,
  notif_commercial               BOOLEAN DEFAULT FALSE,
  notif_livraison                BOOLEAN DEFAULT FALSE,
  notif_recap                    BOOLEAN DEFAULT FALSE,
  notif_besoin_achat             BOOLEAN DEFAULT FALSE,
  -- Liens portail
  fournisseur_id                 TEXT,
  client_id                      TEXT,
  -- Multi-depot
  depot_id                       TEXT REFERENCES public.fl_depots(id) ON DELETE SET NULL,
  created_at                     TIMESTAMPTZ DEFAULT NOW(),
  updated_at                     TIMESTAMPTZ DEFAULT NOW()
);

-- Super admin par defaut
INSERT INTO public.fl_users (id, name, email, password, role, actif,
  can_view_achat, can_view_commercial, can_view_logistique, can_view_stock,
  can_view_cash, can_view_finance, can_view_recap, can_view_database, can_view_external, can_create_commande_bo)
VALUES (
  'SUPER_ADMIN_001', 'Admin Principal', 'admin@optimflux.ma', '1234', 'super_admin', TRUE,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
) ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 3. CLIENTS
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_clients CASCADE;
CREATE TABLE public.fl_clients (
  id                          TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  nom                         TEXT NOT NULL,
  secteur                     TEXT NOT NULL DEFAULT '',
  zone                        TEXT NOT NULL DEFAULT '',
  type                        TEXT NOT NULL DEFAULT 'marchand',
  type_autre                  TEXT,
  taille                      TEXT DEFAULT '50-100kg',
  type_produits               TEXT DEFAULT 'moyenne',
  rotation                    TEXT DEFAULT 'journalier',
  modalite_paiement           TEXT,
  plafond_credit              NUMERIC DEFAULT 0,
  credit_autorise             BOOLEAN DEFAULT FALSE,
  delai_recouvrement          TEXT,
  credit_workflow_validateur  TEXT,
  credit_workflow_validateur_nom TEXT,
  credit_statut               TEXT DEFAULT 'ok',
  credit_solde                NUMERIC DEFAULT 0,
  gps_lat                     NUMERIC,
  gps_lng                     NUMERIC,
  telephone                   TEXT,
  email                       TEXT,
  adresse                     TEXT,
  ice                         TEXT,
  notes                       TEXT,
  created_by                  TEXT NOT NULL DEFAULT '',
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  prevendeur_id               TEXT,
  team_lead_id                TEXT,
  default_heure_livraison     TEXT
);

-- ══════════════════════════════════════════════════════════════
-- 4. FOURNISSEURS
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_fournisseurs CASCADE;
CREATE TABLE public.fl_fournisseurs (
  id                 TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  nom                TEXT NOT NULL,
  contact            TEXT NOT NULL DEFAULT '',
  telephone          TEXT,
  email              TEXT NOT NULL DEFAULT '',
  adresse            TEXT,
  ville              TEXT,
  region             TEXT,
  specialites        JSONB DEFAULT '[]',
  modalite_paiement  TEXT,
  delai_paiement     INTEGER,
  ice                TEXT,
  rc                 TEXT,
  notes              TEXT,
  itineraires        JSONB DEFAULT '[]',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 5. ARTICLES (catalogue produits)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_articles CASCADE;
CREATE TABLE public.fl_articles (
  id                     TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  nom                    TEXT NOT NULL,
  nom_ar                 TEXT NOT NULL DEFAULT '',
  famille                TEXT NOT NULL DEFAULT '',
  unite                  TEXT NOT NULL DEFAULT 'kg',
  um                     TEXT,
  colisage_par_um        NUMERIC,
  colisage_caisses       NUMERIC,
  colisage_demi_caisses  NUMERIC,
  stock_disponible       NUMERIC DEFAULT 0,
  stock_defect           NUMERIC DEFAULT 0,
  stock_reel             NUMERIC,
  stock_reel_date        DATE,
  stock_reel_saisi_par   TEXT,
  stock_theorique        NUMERIC,
  shelf_life_jours       INTEGER,
  alerte_shelf_life_jours INTEGER,
  prix_liquidation       NUMERIC,
  prix_achat             NUMERIC NOT NULL DEFAULT 0,
  pv_methode             TEXT DEFAULT 'pourcentage',  -- 'pourcentage' | 'montant' | 'manuel'
  pv_valeur              NUMERIC DEFAULT 0,
  marge_methode          TEXT,
  lots                   JSONB DEFAULT '[]',
  historique_prix_achat  JSONB DEFAULT '[]',
  photo                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 6. LIVREURS
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_livreurs CASCADE;
CREATE TABLE public.fl_livreurs (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  type              TEXT NOT NULL DEFAULT 'interne',  -- 'interne' | 'externe'
  nom               TEXT NOT NULL,
  prenom            TEXT NOT NULL DEFAULT '',
  telephone         TEXT NOT NULL DEFAULT '',
  cin               TEXT,
  photo_cin         TEXT,
  photo_perso       TEXT,
  type_vehicule     TEXT,
  marque_vehicule   TEXT,
  matricule         TEXT,
  capacite_caisses  INTEGER,
  capacite_tonnage  NUMERIC,
  photo_cart_grise  TEXT,
  photo_permis      TEXT,
  societe           TEXT,
  notes             TEXT,
  actif             BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 7. COMMANDES
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_commandes CASCADE;
CREATE TABLE public.fl_commandes (
  id                   TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  commercial_id        TEXT NOT NULL DEFAULT '',
  commercial_nom       TEXT NOT NULL DEFAULT '',
  client_id            TEXT NOT NULL DEFAULT '',
  client_nom           TEXT NOT NULL DEFAULT '',
  secteur              TEXT NOT NULL DEFAULT '',
  zone                 TEXT NOT NULL DEFAULT '',
  gps_lat              NUMERIC DEFAULT 0,
  gps_lng              NUMERIC DEFAULT 0,
  lignes               JSONB NOT NULL DEFAULT '[]',   -- LigneCommande[]
  heure_livraison      TEXT DEFAULT '',
  statut               TEXT NOT NULL DEFAULT 'en_attente',
  email_destinataire   TEXT DEFAULT '',
  team_lead_id         TEXT,
  team_lead_nom        TEXT,
  approbateur          TEXT,
  approbateur_id       TEXT,
  date_approbation     TIMESTAMPTZ,
  motif_refus          TEXT,
  commentaire          TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 8. BONS D'ACHAT
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_bons_achat CASCADE;
CREATE TABLE public.fl_bons_achat (
  id                   TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  acheteur_id          TEXT NOT NULL DEFAULT '',
  acheteur_nom         TEXT NOT NULL DEFAULT '',
  fournisseur_id       TEXT NOT NULL DEFAULT '',
  fournisseur_nom      TEXT NOT NULL DEFAULT '',
  lignes               JSONB NOT NULL DEFAULT '[]',   -- LigneAchat[]
  statut               TEXT NOT NULL DEFAULT 'brouillon',  -- 'brouillon' | 'valide' | 'receptionne'
  email_destinataire   TEXT DEFAULT '',
  depot_id             TEXT REFERENCES public.fl_depots(id) ON DELETE SET NULL,
  depot_nom            TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 9. PURCHASE ORDERS (PO Push — acheteur terrain)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_purchase_orders CASCADE;
CREATE TABLE public.fl_purchase_orders (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  article_id        TEXT NOT NULL DEFAULT '',
  article_nom       TEXT NOT NULL DEFAULT '',
  article_unite     TEXT NOT NULL DEFAULT 'kg',
  fournisseur_id    TEXT NOT NULL DEFAULT '',
  fournisseur_nom   TEXT NOT NULL DEFAULT '',
  fournisseur_email TEXT DEFAULT '',
  quantite          NUMERIC NOT NULL DEFAULT 0,
  prix_unitaire     NUMERIC NOT NULL DEFAULT 0,
  total             NUMERIC NOT NULL DEFAULT 0,
  statut            TEXT NOT NULL DEFAULT 'ouvert',  -- 'ouvert' | 'envoye' | 'receptionne' | 'annule'
  notes             TEXT DEFAULT '',
  created_by        TEXT NOT NULL DEFAULT '',
  commande_qty      NUMERIC,
  stock_qty         NUMERIC,
  retour_qty        NUMERIC,
  montant_paye      NUMERIC DEFAULT 0,
  statut_paiement   TEXT DEFAULT 'impaye',           -- 'impaye' | 'partiel' | 'solde'
  date_paiement     DATE,
  note_paiement     TEXT,
  depot_id          TEXT REFERENCES public.fl_depots(id) ON DELETE SET NULL,
  depot_nom         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 10. RECEPTIONS (magasinier)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_receptions CASCADE;
CREATE TABLE public.fl_receptions (
  id                TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date              DATE NOT NULL DEFAULT CURRENT_DATE,
  bon_achat_id      TEXT DEFAULT '',
  purchase_order_id TEXT,
  fournisseur_nom   TEXT,
  source            TEXT NOT NULL DEFAULT 'bon_achat',  -- 'bon_achat' | 'purchase_order' | 'manuel'
  lignes            JSONB NOT NULL DEFAULT '[]',
  statut            TEXT NOT NULL DEFAULT 'en_attente',  -- 'en_attente' | 'stand_by' | 'partielle' | 'validee'
  operateur_id      TEXT NOT NULL DEFAULT '',
  notes             TEXT,
  depot_id          TEXT REFERENCES public.fl_depots(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 11. TRIPS (tournees de livraison)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_trips CASCADE;
CREATE TABLE public.fl_trips (
  id                    TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  numero                TEXT,
  date                  DATE NOT NULL DEFAULT CURRENT_DATE,
  livreur_id            TEXT NOT NULL DEFAULT '',
  livreur_nom           TEXT NOT NULL DEFAULT '',
  vehicule              TEXT NOT NULL DEFAULT '',
  commande_ids          JSONB DEFAULT '[]',
  statut                TEXT NOT NULL DEFAULT 'planifie',  -- 'planifie' | 'en_cours' | 'termine'
  itineraire            JSONB DEFAULT '[]',
  sequence_mode         TEXT DEFAULT 'itineraire',
  km_depart             NUMERIC,
  km_arrivee            NUMERIC,
  km_total              NUMERIC,
  nb_caisses_by_article JSONB DEFAULT '{}',
  caisses_validees      BOOLEAN DEFAULT FALSE,
  km_depart_confirme    BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 12. BONS DE LIVRAISON (BL)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_bons_livraison CASCADE;
CREATE TABLE public.fl_bons_livraison (
  id                          TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date                        DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_id                     TEXT NOT NULL DEFAULT '',
  commande_id                 TEXT NOT NULL DEFAULT '',
  client_nom                  TEXT NOT NULL DEFAULT '',
  secteur                     TEXT NOT NULL DEFAULT '',
  zone                        TEXT NOT NULL DEFAULT '',
  livreur_nom                 TEXT NOT NULL DEFAULT '',
  prevendeur_nom              TEXT NOT NULL DEFAULT '',
  lignes                      JSONB NOT NULL DEFAULT '[]',  -- LigneBL[]
  montant_total               NUMERIC NOT NULL DEFAULT 0,
  tva                         NUMERIC NOT NULL DEFAULT 0,
  montant_ttc                 NUMERIC NOT NULL DEFAULT 0,
  statut                      TEXT NOT NULL DEFAULT 'emis',  -- 'emis' | 'encaisse' | 'retour_partiel'
  statut_livraison            TEXT NOT NULL DEFAULT 'livre',  -- 'livre' | 'premier_passage' | 'deuxieme_passage' | 'retour'
  motif_retour                TEXT,
  valide_magasinier           BOOLEAN DEFAULT FALSE,
  heure_livraison_reelle      TEXT,
  heure_effective             TEXT,
  nb_colis                    INTEGER,
  nb_caisse_gros              INTEGER DEFAULT 0,
  nb_caisse_demi              INTEGER DEFAULT 0,
  montant_caisses             NUMERIC DEFAULT 0,
  caisse_pricing              JSONB,
  frais_impression_par_feuille NUMERIC DEFAULT 0,
  nb_feuilles                 INTEGER DEFAULT 1,
  frais_service_par_caisse    NUMERIC DEFAULT 0,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 13. RETOURS
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_retours CASCADE;
CREATE TABLE public.fl_retours (
  id               TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date             DATE NOT NULL DEFAULT CURRENT_DATE,
  trip_id          TEXT NOT NULL DEFAULT '',
  livreur_nom      TEXT NOT NULL DEFAULT '',
  lignes           JSONB NOT NULL DEFAULT '[]',  -- LigneRetour[]
  statut           TEXT NOT NULL DEFAULT 'en_attente',  -- 'en_attente' | 'valide'
  valide_par       TEXT,
  date_validation  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 14. VISITES PREVENDEUR
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_visites CASCADE;
CREATE TABLE public.fl_visites (
  id                   TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  prevendeur_id        TEXT NOT NULL DEFAULT '',
  prevendeur_nom       TEXT NOT NULL DEFAULT '',
  client_id            TEXT NOT NULL DEFAULT '',
  client_nom           TEXT NOT NULL DEFAULT '',
  commande_id          TEXT,
  resultat             TEXT NOT NULL DEFAULT 'commande',  -- 'commande' | 'sans_commande'
  raison_sans_commande TEXT,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 15. MOUVEMENTS CAISSE VIDE
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_caisses_mouvements CASCADE;
CREATE TABLE public.fl_caisses_mouvements (
  id              TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  heure           TEXT,
  type_operation  TEXT NOT NULL DEFAULT 'manuel',  -- 'ctrl_achat' | 'reception' | 'expedition' | 'achat' | 'retour' | 'manuel'
  sens            TEXT NOT NULL DEFAULT 'sortie',  -- 'sortie' | 'entree'
  nb_caisse_gros  INTEGER DEFAULT 0,
  nb_caisse_demi  INTEGER DEFAULT 0,
  reference_doc   TEXT,
  article_nom     TEXT,
  operateur_id    TEXT NOT NULL DEFAULT '',
  operateur_nom   TEXT NOT NULL DEFAULT '',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 16. CONTENANTS TARES (configurables)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_contenants_tare CASCADE;
CREATE TABLE public.fl_contenants_tare (
  id        TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  nom       TEXT NOT NULL,
  poids_kg  NUMERIC NOT NULL DEFAULT 0,
  actif     BOOLEAN DEFAULT TRUE,
  notes     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.fl_contenants_tare (id, nom, poids_kg, actif, notes) VALUES
  ('ct1', 'Caisse plastique (gros)', 2.8,  TRUE,  'Caisse standard 30kg'),
  ('ct2', 'Petit caisse (demi)',      2.0,  TRUE,  'Demi-caisse 15kg'),
  ('ct3', 'Chario',                   15.0, FALSE, 'Poids a configurer selon le chario utilise'),
  ('ct4', 'Palette bois',             20.0, FALSE, 'Palette europeenne standard')
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 17. TRANSFERTS STOCK
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_transferts_stock CASCADE;
CREATE TABLE public.fl_transferts_stock (
  id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  article_id   TEXT NOT NULL DEFAULT '',
  article_nom  TEXT NOT NULL DEFAULT '',
  quantite     NUMERIC NOT NULL DEFAULT 0,
  sens         TEXT NOT NULL DEFAULT 'conforme_vers_defect',
  motif        TEXT NOT NULL DEFAULT '',
  operateur_id TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 18. MESSAGES / CHAT INTERNE
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_messages CASCADE;
CREATE TABLE public.fl_messages (
  id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  sender_id    TEXT NOT NULL DEFAULT '',
  sender_name  TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT '',
  text         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 19. NOTICES / RECLAMATIONS
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_notices CASCADE;
CREATE TABLE public.fl_notices (
  id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  titre        TEXT NOT NULL DEFAULT '',
  contenu      TEXT NOT NULL DEFAULT '',
  auteur_id    TEXT NOT NULL DEFAULT '',
  auteur_nom   TEXT NOT NULL DEFAULT '',
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  type         TEXT NOT NULL DEFAULT 'notice',  -- 'notice' | 'reclamation'
  statut       TEXT NOT NULL DEFAULT 'ouvert',  -- 'ouvert' | 'traite'
  destinataire TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 20. SIGNALEMENTS NON-ACHAT
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_non_achat_signalements CASCADE;
CREATE TABLE public.fl_non_achat_signalements (
  id           TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  date         DATE NOT NULL DEFAULT CURRENT_DATE,
  acheteur_id  TEXT NOT NULL DEFAULT '',
  acheteur_nom TEXT NOT NULL DEFAULT '',
  article_id   TEXT NOT NULL DEFAULT '',
  article_nom  TEXT NOT NULL DEFAULT '',
  besoin_qte   NUMERIC DEFAULT 0,
  motif        TEXT NOT NULL DEFAULT '',
  commentaire  TEXT,
  statut       TEXT NOT NULL DEFAULT 'signale',  -- 'signale' | 'pris_en_compte' | 'resolu'
  notifie_a    JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════
-- 21. MOTIFS RETOUR (configurables)
-- ══════════════════════════════════════════════════════════════
DROP TABLE IF EXISTS public.fl_motifs_retour CASCADE;
CREATE TABLE public.fl_motifs_retour (
  id         TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  label      TEXT NOT NULL,
  label_ar   TEXT NOT NULL DEFAULT '',
  actif      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.fl_motifs_retour (id, label, label_ar, actif) VALUES
  ('mr1', 'Qualite insuffisante',        'جودة غير كافية',       TRUE),
  ('mr2', 'Commande erronee',            'طلبية خاطئة',           TRUE),
  ('mr3', 'Client absent',               'العميل غائب',           TRUE),
  ('mr4', 'Prix conteste',               'خلاف على السعر',        TRUE),
  ('mr5', 'Quantite commandee excessive','الكمية المطلوبة مفرطة',  TRUE),
  ('mr6', 'Autre',                       'سبب آخر',               TRUE)
ON CONFLICT (id) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- 22. UPDATED_AT TRIGGERS (auto-update timestamps)
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fl_depots','fl_users','fl_fournisseurs','fl_articles','fl_livreurs',
    'fl_commandes','fl_bons_achat','fl_purchase_orders','fl_receptions',
    'fl_trips','fl_bons_livraison','fl_retours'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%s;
      CREATE TRIGGER trg_%s_updated_at
        BEFORE UPDATE ON public.%s
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    ', t, t, t, t);
  END LOOP;
END; $$;

-- ══════════════════════════════════════════════════════════════
-- 23. INDEX PERFORMANCES
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_commandes_date          ON public.fl_commandes(date);
CREATE INDEX IF NOT EXISTS idx_commandes_client        ON public.fl_commandes(client_id);
CREATE INDEX IF NOT EXISTS idx_commandes_commercial    ON public.fl_commandes(commercial_id);
CREATE INDEX IF NOT EXISTS idx_commandes_statut        ON public.fl_commandes(statut);
CREATE INDEX IF NOT EXISTS idx_bons_achat_date         ON public.fl_bons_achat(date);
CREATE INDEX IF NOT EXISTS idx_bons_achat_statut       ON public.fl_bons_achat(statut);
CREATE INDEX IF NOT EXISTS idx_bons_achat_depot        ON public.fl_bons_achat(depot_id);
CREATE INDEX IF NOT EXISTS idx_po_statut               ON public.fl_purchase_orders(statut);
CREATE INDEX IF NOT EXISTS idx_po_depot                ON public.fl_purchase_orders(depot_id);
CREATE INDEX IF NOT EXISTS idx_receptions_date         ON public.fl_receptions(date);
CREATE INDEX IF NOT EXISTS idx_receptions_bon          ON public.fl_receptions(bon_achat_id);
CREATE INDEX IF NOT EXISTS idx_receptions_po           ON public.fl_receptions(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_bl_trip                 ON public.fl_bons_livraison(trip_id);
CREATE INDEX IF NOT EXISTS idx_bl_valide_magasinier    ON public.fl_bons_livraison(valide_magasinier);
CREATE INDEX IF NOT EXISTS idx_trips_date              ON public.fl_trips(date);
CREATE INDEX IF NOT EXISTS idx_trips_livreur           ON public.fl_trips(livreur_id);
CREATE INDEX IF NOT EXISTS idx_users_role              ON public.fl_users(role);
CREATE INDEX IF NOT EXISTS idx_users_depot             ON public.fl_users(depot_id);
CREATE INDEX IF NOT EXISTS idx_visites_prevendeur      ON public.fl_visites(prevendeur_id);
CREATE INDEX IF NOT EXISTS idx_visites_date            ON public.fl_visites(date);

-- ══════════════════════════════════════════════════════════════
-- FIN DU SCRIPT
-- Supabase: nphrncmuxbwahqnzdyxp
-- ══════════════════════════════════════════════════════════════
