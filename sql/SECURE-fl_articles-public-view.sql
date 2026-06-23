-- ════════════════════════════════════════════════════════════════════════
-- SECURE-fl_articles-public-view.sql  (faille #4 — fuite prix d'achat/stock)
-- ════════════════════════════════════════════════════════════════════════
-- Constat : fl_articles est lisible en SELECT par le rôle "anon" (clé publique
-- embarquée dans le navigateur du site vitrine, pour le catalogue en direct +
-- le fallback temps réel quand /api/ext/catalogue est inaccessible). Cette
-- lecture directe renvoie le payload JSONB COMPLET, donc expose à n'importe
-- qui inspectant la clé anon : prixAchat (coût d'achat), stockDisponible réel,
-- chargeArticleId, source d'import, et tout autre champ interne.
--
-- Correctif : une vue publique ne renvoyant que les champs catalogue (prix de
-- vente public, stock WEB alloué, photo, nom...), jamais le coût ni le stock
-- réel ERP. L'accès direct anonyme à la table brute est fermé ; seule la vue
-- reste lisible par "anon".
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- Sans danger pour l'ERP/BO/mobile : ils lisent fl_articles via le
-- service-role (/api/sync-read), qui contourne RLS et n'est pas affecté.
-- ════════════════════════════════════════════════════════════════════════

-- 1) Vue publique : uniquement les champs nécessaires au catalogue web,
--    et uniquement les articles explicitement publiés (marketplaceActif=true).
CREATE OR REPLACE VIEW public.fl_articles_public AS
SELECT
  id,
  payload->>'nom'                                              AS nom,
  COALESCE(payload->>'nomAr', '')                               AS nom_ar,
  COALESCE(payload->>'unite', 'kg')                             AS unite,
  COALESCE(payload->>'photo', '')                               AS photo,
  COALESCE(payload->>'famille', '')                             AS famille,
  COALESCE(payload->>'marketplaceDescription', payload->>'marketplaceCommentaire', payload->>'famille', 'Maroc') AS description,
  COALESCE((payload->>'marketplacePrixPublic')::numeric,
           (payload->>'prixParticulier')::numeric,
           (payload->>'pvValeur')::numeric, 0)                  AS prix_public,
  COALESCE((payload->>'marketplaceStock')::numeric, 0)          AS stock_disponible,
  COALESCE(payload->>'marketplaceStatut', 'disponible')         AS statut,
  COALESCE(payload->'marketplaceTags', '[]'::jsonb)             AS tags,
  COALESCE((payload->>'marketplaceOrdre')::numeric, 999)        AS ordre,
  (payload->>'marketplaceActif')::boolean                       AS marketplace_actif,
  updated_at
FROM public.fl_articles
WHERE (payload->>'marketplaceActif')::boolean IS TRUE
  AND id NOT LIKE '\_\_%';

GRANT SELECT ON public.fl_articles_public TO anon, authenticated;

-- 2) Ferme l'accès direct anonyme à la table brute (qui expose prixAchat,
--    stock réel, etc.) en supprimant toute politique RLS qui autoriserait
--    encore "anon" à lire fl_articles directement.
ALTER TABLE public.fl_articles ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fl_articles'
      AND (cmd = 'SELECT' OR cmd = 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.fl_articles', pol.policyname);
  END LOOP;
END $$;

-- Vérif après exécution (depuis un terminal, PAS depuis l'app) :
--   curl "<SUPABASE_URL>/rest/v1/fl_articles?select=id&limit=1" -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--   → doit renvoyer [] (plus aucune ligne visible par anon)
--   curl "<SUPABASE_URL>/rest/v1/fl_articles_public?select=*&limit=1" -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
--   → doit renvoyer les champs catalogue (nom, prix_public, stock_disponible...), jamais prixAchat
