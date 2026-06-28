-- ════════════════════════════════════════════════════════════════════════
-- CREATE-fl_site_access.sql
-- ════════════════════════════════════════════════════════════════════════
-- Crée la table manquante fl_site_access (signalée par /api/test-sync :
-- "missing": ["fl_site_access"]).
--
-- Rôle : pipeline d'approbation des appareils (device guard). Chaque appareil
-- qui demande l'accès à l'ERP crée une ligne ici ; l'admin l'autorise depuis
-- 🛡️ Accès Appareils (BODeviceAccess) → le device reçoit son cookie au poll
-- suivant (check-and-token). Schéma JSONB standard {id, payload, updated_at}
-- (id = fingerprint de l'appareil).
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.fl_site_access (
  id         TEXT PRIMARY KEY,                       -- fingerprint appareil
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,     -- { statut, label, demandeLe, autoriseLe, ... }
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fl_site_access_statut  ON public.fl_site_access ((payload->>'statut'));
CREATE INDEX IF NOT EXISTS idx_fl_site_access_updated ON public.fl_site_access (updated_at DESC);

-- RLS : seul le service-role (API serveur) lit/écrit cette table. Pas d'accès anon.
ALTER TABLE public.fl_site_access ENABLE ROW LEVEL SECURITY;

-- (Optionnel) Vérification :
--   SELECT count(*) FROM public.fl_site_access;
--   puis recharger /api/test-sync → "missing" doit être vide, exist 5/5.
