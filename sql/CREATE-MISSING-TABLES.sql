-- ════════════════════════════════════════════════════════════════════════
-- CREATE-MISSING-TABLES.sql
-- ════════════════════════════════════════════════════════════════════════
-- Corrige les erreurs PGRST205 "Could not find the table ... in schema cache" :
--   • Notifications Cut-off → fl_cutoffs        (schéma PLAT)
--   • Cadeaux Incentives    → fl_gift_materials + fl_gift_attributions (PLAT)
--   • PA Historique         → fl_pa_historique, fl_pa_predit  (JSONB)
--   • Moteur commercial     → fl_config_globale               (JSONB)
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. CUTOFFS (schéma plat — attendu par /api/ext/cutoffs) ───────────────
CREATE TABLE IF NOT EXISTS public.fl_cutoffs (
  id                TEXT PRIMARY KEY,
  type              TEXT NOT NULL DEFAULT 'manuel',     -- manuel|auto_tonnage|auto_geo|auto_capacite
  cible             TEXT NOT NULL DEFAULT 'tous',        -- commande|achat|tous
  article_id        TEXT,
  fournisseur_id    TEXT,
  seuil_tonnage     NUMERIC DEFAULT 0,
  tonnage_actuel    NUMERIC DEFAULT 0,
  capacite_max_kg   NUMERIC DEFAULT 0,
  charge_actuelle_kg NUMERIC DEFAULT 0,
  actif             BOOLEAN NOT NULL DEFAULT false,
  motif             TEXT,
  active_par        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cutoffs_actif ON public.fl_cutoffs (actif);
CREATE INDEX IF NOT EXISTS idx_cutoffs_cible ON public.fl_cutoffs (cible);

-- ── 2. CADEAUX INCENTIVES (schéma plat — attendu par /api/ext/gifts) ──────
CREATE TABLE IF NOT EXISTS public.fl_gift_materials (
  id            TEXT PRIMARY KEY,
  nom           TEXT NOT NULL,
  segment       TEXT NOT NULL DEFAULT 'tous',           -- chr|marchand|particulier|tous
  seuil_type    TEXT DEFAULT 'commandes',               -- commandes|montant|tonnage
  seuil_valeur  NUMERIC DEFAULT 0,
  stock_qte     INTEGER NOT NULL DEFAULT 0,
  actif         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gift_mat_segment ON public.fl_gift_materials (segment);
CREATE INDEX IF NOT EXISTS idx_gift_mat_actif   ON public.fl_gift_materials (actif);

CREATE TABLE IF NOT EXISTS public.fl_gift_attributions (
  id                 TEXT PRIMARY KEY,
  client_id          TEXT NOT NULL,
  material_id        TEXT NOT NULL,
  segment            TEXT DEFAULT 'tous',
  statut             TEXT NOT NULL DEFAULT 'a_livrer',  -- a_livrer|livre|annule
  declenche_par_auto BOOLEAN DEFAULT false,
  attribue_le        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gift_attr_client  ON public.fl_gift_attributions (client_id);
CREATE INDEX IF NOT EXISTS idx_gift_attr_statut  ON public.fl_gift_attributions (statut);

-- ── 3. PA Prédit + Config globale (schéma JSONB) ──────────────────────────
-- NOTE : fl_pa_historique a un schéma PLAT (voir FIX-FLAT-TABLES.sql), pas JSONB.
CREATE TABLE IF NOT EXISTS public.fl_pa_predit      (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.fl_config_globale (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- ── 4. Caisse acheteur (flux d'argent) — pour la création en BO ───────────
CREATE TABLE IF NOT EXISTS public.fl_caisse_entries (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

-- ── 5. RLS : tout en service-role only (pas d'accès anon) ─────────────────
ALTER TABLE public.fl_cutoffs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_gift_materials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_gift_attributions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_pa_historique      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_pa_predit          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_config_globale     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_caisse_entries     ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Vérif : SELECT table_name FROM information_schema.tables
--          WHERE table_schema='public' AND table_name IN
--          ('fl_cutoffs','fl_gift_materials','fl_gift_attributions',
--           'fl_pa_historique','fl_pa_predit','fl_config_globale','fl_caisse_entries');
