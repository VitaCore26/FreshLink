-- ════════════════════════════════════════════════════════════════════════
-- FIX-FLAT-TABLES.sql
-- ════════════════════════════════════════════════════════════════════════
-- Corrige deux tables qui DOIVENT avoir un schéma PLAT (les endpoints
-- requêtent des colonnes précises, pas un payload JSONB) :
--   • Moteur commercial → fl_pricing_rules   (col. priorite, cible_segment…)
--   • PA Historique     → fl_pa_historique    (col. date_marche, article_id…)
--
-- Erreurs corrigées :
--   PGRST205 "Could not find the table public.fl_pricing_rules"
--   42703    "column fl_pa_historique.date_marche does not exist"
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- Sans perte : si une ancienne version JSONB existe, on l'archive.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. fl_pa_historique : si créée en JSONB par erreur, l'archiver ────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='fl_pa_historique' AND column_name='payload')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='fl_pa_historique' AND column_name='date_marche')
  THEN
    ALTER TABLE public.fl_pa_historique RENAME TO fl_pa_historique_jsonb_old;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.fl_pa_historique (
  id             TEXT PRIMARY KEY,
  article_id     TEXT NOT NULL,
  fournisseur_id TEXT,
  pa             NUMERIC DEFAULT 0,            -- prix d'achat
  volume_kg      NUMERIC DEFAULT 0,
  date_marche    DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pa_hist_article ON public.fl_pa_historique (article_id);
CREATE INDEX IF NOT EXISTS idx_pa_hist_date    ON public.fl_pa_historique (date_marche DESC);

-- ── 2. fl_pricing_rules (Moteur commercial — gratuités + remises) ─────────
CREATE TABLE IF NOT EXISTS public.fl_pricing_rules (
  id             TEXT PRIMARY KEY,
  nom            TEXT NOT NULL,
  type           TEXT NOT NULL,                -- gratuite_palier|remise_pct|remise_montant|remise_cascade
  cible_segment  TEXT NOT NULL DEFAULT 'tous', -- chr|marchand|particulier|tous
  cible_famille  TEXT,
  cible_article  TEXT,
  palier_qte     NUMERIC DEFAULT 0,
  palier_offert  NUMERIC DEFAULT 0,
  remise_valeur  NUMERIC DEFAULT 0,
  date_debut     DATE,
  date_fin       DATE,
  priorite       INTEGER NOT NULL DEFAULT 100,
  actif          BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pricing_priorite ON public.fl_pricing_rules (priorite);
CREATE INDEX IF NOT EXISTS idx_pricing_segment  ON public.fl_pricing_rules (cible_segment);
CREATE INDEX IF NOT EXISTS idx_pricing_actif    ON public.fl_pricing_rules (actif);

-- ── 3. RLS service-role only ──────────────────────────────────────────────
ALTER TABLE public.fl_pa_historique ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_pricing_rules ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Vérif : recharger Moteur commercial + PA Historique → plus d'erreur.
