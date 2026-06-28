-- ════════════════════════════════════════════════════════════════════════
-- VERIF-PRICING-FAMILLE.sql
-- ════════════════════════════════════════════════════════════════════════
-- Date     : 2026-06-15
-- Contexte : Apres l'ajout du "Pricing par famille" (BO) qui sync vers
--            Supabase via /api/sync-write (fl_articles, schema JSONB).
--            Ce script NE cree aucune table metier nouvelle : il s'assure
--            juste que fl_articles a le bon schema, ajoute des index utiles,
--            et fournit des requetes de verification.
--
-- Instance : wnuilvamhygkzupvfnxz
-- Ou        : Supabase > SQL Editor
-- Sur       : tout est idempotent (CREATE ... IF NOT EXISTS) -> rejouable.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. S'assurer que fl_articles est au schema JSONB standard ──────────────
CREATE TABLE IF NOT EXISTS public.fl_articles (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fl_articles ENABLE ROW LEVEL SECURITY;

-- La boutique (anon) doit pouvoir lire le catalogue
DROP POLICY IF EXISTS "anon read articles" ON public.fl_articles;
CREATE POLICY "anon read articles" ON public.fl_articles
  FOR SELECT TO anon USING (true);

-- ── 2. Index utiles pour le pricing par famille + le catalogue ─────────────
CREATE INDEX IF NOT EXISTS idx_fl_articles_famille
  ON public.fl_articles ((payload->>'famille'));

CREATE INDEX IF NOT EXISTS idx_fl_articles_marketplace
  ON public.fl_articles ((payload->>'marketplaceActif'));

CREATE INDEX IF NOT EXISTS idx_fl_articles_updated
  ON public.fl_articles (updated_at DESC);

-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION (a lancer apres avoir applique une regle de famille en BO)
-- ════════════════════════════════════════════════════════════════════════

-- NB : les ::numeric sont proteges par un guard regex (^-?\d+(\.\d+)?$).
-- Une valeur non numerique (chaine vide, texte) devient NULL au lieu de
-- faire planter la requete avec "invalid input syntax for type numeric".

-- A. Vue d'ensemble par famille : nb articles + prix moyens par segment
WITH a AS (
  SELECT
    payload->>'famille' AS famille,
    CASE WHEN payload->>'prixAchat'      ~ '^-?\d+(\.\d+)?$' THEN (payload->>'prixAchat')::numeric      END AS pa,
    CASE WHEN payload->>'prixCHR'         ~ '^-?\d+(\.\d+)?$' THEN (payload->>'prixCHR')::numeric         END AS pv_chr,
    CASE WHEN payload->>'prixMarchand'    ~ '^-?\d+(\.\d+)?$' THEN (payload->>'prixMarchand')::numeric    END AS pv_marchand,
    CASE WHEN payload->>'prixParticulier' ~ '^-?\d+(\.\d+)?$' THEN (payload->>'prixParticulier')::numeric END AS pv_particulier
  FROM public.fl_articles
  WHERE id NOT LIKE '\_\_%'
)
SELECT
  famille,
  COUNT(*)                      AS nb_articles,
  ROUND(AVG(pa), 2)             AS pa_moyen,
  ROUND(AVG(pv_chr), 2)         AS pv_chr_moyen,
  ROUND(AVG(pv_marchand), 2)    AS pv_marchand_moyen,
  ROUND(AVG(pv_particulier), 2) AS pv_particulier_moyen
FROM a
GROUP BY famille
ORDER BY famille;

-- B. Detail d'une famille (ex: Fruits rouges) : PA -> PV + marge CHR %
WITH a AS (
  SELECT
    payload->>'nom' AS article,
    CASE WHEN payload->>'prixAchat'      ~ '^-?\d+(\.\d+)?$' THEN (payload->>'prixAchat')::numeric      END AS pa,
    CASE WHEN payload->>'prixCHR'         ~ '^-?\d+(\.\d+)?$' THEN (payload->>'prixCHR')::numeric         END AS pv_chr,
    CASE WHEN payload->>'prixMarchand'    ~ '^-?\d+(\.\d+)?$' THEN (payload->>'prixMarchand')::numeric    END AS pv_marchand,
    CASE WHEN payload->>'prixParticulier' ~ '^-?\d+(\.\d+)?$' THEN (payload->>'prixParticulier')::numeric END AS pv_particulier
  FROM public.fl_articles
  WHERE payload->>'famille' = 'Fruits rouges'
)
SELECT
  article, pa, pv_chr, pv_marchand, pv_particulier,
  ROUND(100*(pv_chr / NULLIF(pa,0) - 1), 0) AS marge_chr_pct
FROM a
ORDER BY article;

-- C. Sanity : confirmer que fl_articles a bien la colonne payload (schema OK)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='fl_articles'
ORDER BY ordinal_position;
