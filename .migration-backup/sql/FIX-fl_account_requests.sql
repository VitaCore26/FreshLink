-- ════════════════════════════════════════════════════════════════════════
-- FIX-fl_account_requests.sql
-- ════════════════════════════════════════════════════════════════════════
-- Corrige l'erreur « Erreur d'enregistrement des règles » sur Demandes de
-- compte (et le journal des demandes). La table fl_account_requests existe
-- avec un schéma plat sans colonne `payload`, alors que le code attend le
-- schéma JSONB {id, payload, updated_at}.
--   Erreur : "column fl_account_requests.payload does not exist (42703)"
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- Sans perte : l'ancienne table est archivée si elle a le mauvais schéma.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='fl_account_requests')
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='fl_account_requests' AND column_name='payload')
  THEN
    ALTER TABLE public.fl_account_requests RENAME TO fl_account_requests_legacy_2026_06_10;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.fl_account_requests (
  id         TEXT PRIMARY KEY,                    -- id demande ou "__autoapprove" (config)
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { type, sousType, statut, enabled, autoTypes, ... }
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acc_req_statut ON public.fl_account_requests ((payload->>'statut'));

ALTER TABLE public.fl_account_requests ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Vérif : recharger Demandes de compte → enregistrement des règles OK.
