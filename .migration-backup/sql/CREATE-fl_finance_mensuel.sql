-- ════════════════════════════════════════════════════════════════════════
-- CREATE-fl_finance_mensuel.sql
-- Suivi de trésorerie mensuel AGRÉGÉ (dossier investisseurs).
-- ⚠ Ce n'est PAS un grand-livre : une ligne = un mois de synthèse
--   (volume, marge brute, transport, masse salariale, EBITDA), reflet du
--   VitaFresh_Dossier_Financier. Lu par le Dashboard Investisseur (onglet
--   « Réel P1 »). Aucune transaction individuelle n'est stockée ici.
-- id = "YYYY-MM" (ex: "2026-04"). À exécuter dans Supabase > SQL Editor
-- (instance wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.fl_finance_mensuel (
  id         TEXT PRIMARY KEY,          -- "2026-04"
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Écritures/lectures via le service-role (API /api/sync-*). Données confidentielles.
ALTER TABLE public.fl_finance_mensuel ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fl_finance_mensuel_updated ON public.fl_finance_mensuel (updated_at DESC);

-- ── Seed P1 (Mars → 19 juin 2026) — chiffres du dossier financier ──────────
-- Idempotent : ON CONFLICT met à jour le payload sans dupliquer.
INSERT INTO public.fl_finance_mensuel (id, payload) VALUES
  ('2026-03', '{"mois":"Mars 2026","volume":31200,"marge":34320,"transport":6500,"masse":43200,"ebitda":-15380}'),
  ('2026-04', '{"mois":"Avril 2026","volume":52000,"marge":57200,"transport":10400,"masse":43200,"ebitda":3600}'),
  ('2026-05', '{"mois":"Mai 2026","volume":52000,"marge":57200,"transport":10400,"masse":43200,"ebitda":3600}'),
  ('2026-06', '{"mois":"Juin 2026*","volume":24700,"marge":27170,"transport":4750,"masse":3737,"ebitda":18683}')
ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now();
