-- ════════════════════════════════════════════════════════════════════════
-- CREATE-fl_credits_fournisseurs.sql
-- ════════════════════════════════════════════════════════════════════════
-- Le crédit fournisseur (écran « Crédit Fournisseur ») n'existait qu'en
-- localStorage → invisible pour le rapport quotidien /api/ext/rapport-credit.
-- Cette table le synchronise. Schéma JSONB {id, payload, updated_at} :
--   payload = { fournisseurNom, date, montant, montantPaye, statut, motif? }
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.fl_credits_fournisseurs (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credits_f_statut ON public.fl_credits_fournisseurs ((payload->>'statut'));
CREATE INDEX IF NOT EXISTS idx_credits_f_date   ON public.fl_credits_fournisseurs ((payload->>'date'));

ALTER TABLE public.fl_credits_fournisseurs ENABLE ROW LEVEL SECURITY;

-- Vérif : écran Crédit Fournisseur → les lignes remontent dans le rapport crédit.
