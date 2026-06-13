-- ════════════════════════════════════════════════════════════════════════
-- CREATE-RH-SYNC-TABLES.sql
-- ════════════════════════════════════════════════════════════════════════
-- Les réglages RH (règles bonus/malus, grilles salariales, fiches paie)
-- étaient localStorage-only. BOResources les synchronise maintenant via
-- /api/sync-write + /api/sync-read. Ces 3 tables doivent exister, sinon la
-- synchronisation échoue silencieusement (les données restent locales).
-- Schéma JSONB standard {id, payload, updated_at}.
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.fl_regles_bonus (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_grilles_salaire (
  id         TEXT PRIMARY KEY,        -- = userId
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_fiches_payroll (
  id         TEXT PRIMARY KEY,        -- = id ou `${userId}_${periode}`
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fl_regles_bonus    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_grilles_salaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_fiches_payroll  ENABLE ROW LEVEL SECURITY;

-- Vérif : RH → Règles bonus / Grilles salariales → modifie puis recharge
-- sur un autre appareil : les réglages remontent.
