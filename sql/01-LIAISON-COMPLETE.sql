-- ════════════════════════════════════════════════════════════════════════════
-- 01-LIAISON-COMPLETE.sql — Reconstruit toute la liaison Shop ↔ ERP ↔ Supabase
-- ----------------------------------------------------------------------------
-- Format unifié : { id TEXT PRIMARY KEY, payload JSONB, updated_at TIMESTAMPTZ }.
-- - Toutes les écritures app passent par /api/sync-write & /api/ext/* (service_role,
--   contourne la RLS) ; on n'ouvre l'anon QUE sur ce que le SITE WEB doit lire/écrire.
-- - Inclut notifications, cutoffs (alertes), compteur boutique.
-- - Les EMAILS passent par Resend (/api/send-email) → aucune table, mais cf. note finale.
-- Idempotent : relançable sans risque. Exécuter après 00-ECRASE-TOUT.sql (ou seul).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1) Création de toutes les tables (même schéma) + RLS activée ──────────────
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'fl_articles','fl_clients','fl_users','fl_fournisseurs','fl_livreurs',
    'fl_commandes','fl_commandes_web','fl_visites',
    'fl_bons_achat','fl_purchase_orders','fl_receptions','fl_pa_historique',
    'fl_bons_livraison','fl_bons_preparation','fl_retours','fl_trips','fl_transferts',
    'fl_caisses_vides','fl_charges','fl_caisse_entries','fl_charges_article',
    'fl_documents','fl_depots','fl_salaries','fl_actionnaires',
    'fl_site_access','fl_account_requests','fl_prospects','fl_feedbacks','fl_company_contacts',
    'fl_messages','fl_notices','fl_notifications','fl_cutoffs','fl_shop_analytics',
    'fl_gift_materials','fl_bonus_matrix','fl_credits_fournisseurs','fl_pricing_rules',
    'fl_invoices','fl_avoirs','fl_wallet_transactions','fl_paiements',
    'fl_referrals','fl_referral_config','fl_tracking','fl_promotions','fl_coupons',
    'fl_contrats','fl_organisations'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT ''{}''::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- ── 1bis) GRANTs OBLIGATOIRES — sinon "permission denied 42501" pour service_role ──
-- (Les tables fraîchement créées via SQL Editor n'ont pas les droits des rôles
--  Supabase ; la RLS protège les lignes, les GRANTs donnent l'accès table.)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ── 2) Accès ANON limité à ce que le SITE WEB a besoin de lire / écrire ───────
-- Catalogue (lecture)
DROP POLICY IF EXISTS anon_read_articles ON public.fl_articles;
CREATE POLICY anon_read_articles ON public.fl_articles FOR SELECT TO anon USING (true);
-- Coordonnées entreprise (pied de page)
DROP POLICY IF EXISTS anon_read_contacts ON public.fl_company_contacts;
CREATE POLICY anon_read_contacts ON public.fl_company_contacts FOR SELECT TO anon USING (true);
-- Avis : lecture + dépôt depuis le site
DROP POLICY IF EXISTS anon_read_feedbacks   ON public.fl_feedbacks;
CREATE POLICY anon_read_feedbacks   ON public.fl_feedbacks FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS anon_insert_feedbacks ON public.fl_feedbacks;
CREATE POLICY anon_insert_feedbacks ON public.fl_feedbacks FOR INSERT TO anon WITH CHECK (true);
-- Compteur boutique : l'anon lit UNIQUEMENT la config d'affichage (pas les agrégats)
DROP POLICY IF EXISTS anon_read_shop_config ON public.fl_shop_analytics;
CREATE POLICY anon_read_shop_config ON public.fl_shop_analytics FOR SELECT TO anon USING (id = '__config');
-- (Toutes les autres tables : aucune politique anon → réservées au service_role.)

-- ── 3) Vue catalogue marketplace (tier 1 de /api/ext/catalogue) ───────────────
CREATE OR REPLACE VIEW public.v_marketplace_catalogue AS
SELECT
  id,
  payload->>'nom'                 AS nom,
  payload->>'nomAr'               AS nom_ar,
  payload->>'famille'             AS famille,
  payload->>'unite'               AS unite,
  COALESCE((payload->>'marketplacePrixPublic')::numeric,
           (payload->>'prixVente')::numeric,
           (payload->>'prix')::numeric, 0)              AS prix_public,
  COALESCE((payload->>'stockDisponible')::int, 0)       AS stock_disponible,
  COALESCE((payload->>'marketplaceActif')::boolean,
           (payload->>'marketplace_actif')::boolean, false) AS marketplace_actif,
  COALESCE((payload->>'ordre')::int, 999)               AS ordre,
  payload->>'photo'               AS photo,
  payload                          AS payload,
  updated_at
FROM public.fl_articles
WHERE COALESCE((payload->>'marketplaceActif')::boolean,
               (payload->>'marketplace_actif')::boolean, false) = true;
GRANT SELECT ON public.v_marketplace_catalogue TO anon, authenticated;

-- ── 4) Index fréquents ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fl_articles_marketplace ON public.fl_articles ((payload->>'marketplaceActif'));
CREATE INDEX IF NOT EXISTS idx_fl_articles_famille     ON public.fl_articles ((payload->>'famille'));
CREATE INDEX IF NOT EXISTS idx_fl_articles_updated     ON public.fl_articles (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fl_commandes_clientid   ON public.fl_commandes ((payload->>'clientId'));
CREATE INDEX IF NOT EXISTS idx_fl_commandes_date       ON public.fl_commandes ((payload->>'date'));
CREATE INDEX IF NOT EXISTS idx_fl_clients_telephone    ON public.fl_clients ((payload->>'telephone'));
CREATE INDEX IF NOT EXISTS idx_fl_users_email          ON public.fl_users ((payload->>'email'));
CREATE INDEX IF NOT EXISTS idx_fl_notifications_updated ON public.fl_notifications (updated_at DESC);

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- APRÈS EXÉCUTION — liaison applicative à compléter côté Vercel (env vars) :
--   ERP (projet fresh-link) ET shop (projet vita-fresh) :
--     SUPABASE_SERVICE_ROLE_KEY = <clé service_role Supabase>   (OBLIGATOIRE écritures)
--     NEXT_PUBLIC_SUPABASE_URL  = https://wnuilvamhygkzupvfnxz.supabase.co
--     NEXT_PUBLIC_SUPABASE_ANON_KEY = <clé anon>
--   Notifications email (Resend) :
--     RESEND_API_KEY  = <clé Resend valide>
--     EMAIL_FROM      = Vita Fresh <support@vita-core.org>   (domaine vérifié dans Resend)
--   Sécurité (sinon valeurs par défaut publiques) :
--     AUTH_SECRET, DEVICE_SECRET, DEVICE_BYPASS_KEY
-- Le shop appelle /api/ext/* qui est proxifié vers l'ERP (cf. vercel.json du shop).
-- ════════════════════════════════════════════════════════════════════════════
