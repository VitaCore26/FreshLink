-- ════════════════════════════════════════════════════════════════════════
-- CREATE-fl_bonus_matrix.sql
-- ════════════════════════════════════════════════════════════════════════
-- Corrige l'erreur Moteur commercial :
--   PGRST205 "Could not find the table public.fl_bonus_matrix"
-- Schéma PLAT (matrice segment × famille) attendu par /api/ext/bonus-matrix.
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.fl_bonus_matrix (
  id            TEXT PRIMARY KEY,
  segment       TEXT NOT NULL,                 -- chr|marchand|particulier|tous
  famille       TEXT NOT NULL DEFAULT 'TOUTES',
  taux_ca       NUMERIC NOT NULL DEFAULT 0,    -- % du CA
  taux_tonnage  NUMERIC NOT NULL DEFAULT 0,    -- bonus / tonne
  coef_marge    NUMERIC NOT NULL DEFAULT 1,
  actif         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_bonus_segment_famille UNIQUE (segment, famille)
);
CREATE INDEX IF NOT EXISTS idx_bonus_segment ON public.fl_bonus_matrix (segment);

ALTER TABLE public.fl_bonus_matrix ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Vérif : recharger Moteur commercial → plus d'erreur fl_bonus_matrix.
