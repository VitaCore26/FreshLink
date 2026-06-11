-- ════════════════════════════════════════════════════════════════════════
-- CREATE-MISSING-TABLES-V2.sql
-- ════════════════════════════════════════════════════════════════════════
-- Crée les 3 tables manquantes signalées par /api/test-sync :
--   fl_transferts_stock · fl_demandes_achat · fl_demandes_acces
-- Schéma JSONB standard {id, payload, updated_at} (pattern sync-read/write).
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS public.fl_transferts_stock (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.fl_demandes_achat   (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.fl_demandes_acces   (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());

ALTER TABLE public.fl_transferts_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_demandes_achat   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_demandes_acces   ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Vérif : recharger Test connectivité Supabase → 24/24 tables, 0 manquante.
