-- ════════════════════════════════════════════════════════════════════════
-- CREATE-fl_shop_analytics.sql
-- Compteur analytics de la boutique (shop.vita-core.org).
-- Une ligne par jour (id = "YYYY-MM-DD") + une ligne "__config" pour
-- l'affichage public. Alimenté par /api/ext/track, lu par /api/ext/shop-stats.
-- À exécuter dans Supabase > SQL Editor (instance wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.fl_shop_analytics (
  id         TEXT PRIMARY KEY,          -- "2026-06-16" ou "__config"
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Écritures/lectures exclusivement via le service-role (API /api/ext/*).
ALTER TABLE public.fl_shop_analytics ENABLE ROW LEVEL SECURITY;

-- Lecture publique de la seule config d'affichage (le widget du site la lit).
-- Les agrégats restent privés (service-role uniquement).
DROP POLICY IF EXISTS "anon read shop config" ON public.fl_shop_analytics;
CREATE POLICY "anon read shop config" ON public.fl_shop_analytics
  FOR SELECT TO anon USING (id = '__config');

CREATE INDEX IF NOT EXISTS idx_fl_shop_analytics_updated ON public.fl_shop_analytics (updated_at DESC);
