-- ════════════════════════════════════════════════════════════════════════════
--  SUPABASE-A-Z.sql  —  SCRIPT UNIQUE & COMPLET  (FreshLink ERP + Shop Vita Fresh)
--  Instance : wnuilvamhygkzupvfnxz
-- ----------------------------------------------------------------------------
--  Ce SEUL fichier (re)met en place TOUTE la liaison :
--    1) toutes les tables {id TEXT PK, payload JSONB, updated_at} + RLS
--    2) LES DROITS D'ACCÈS (GRANTs) — sans eux : "permission denied 42501" / BD offline
--    3) les politiques ANON (ce que le SITE WEB peut lire/écrire)
--    4) la vue catalogue marketplace
--    5) les index fréquents
--    + tables PROCESS / CONFIG (process_config, workflow, alertes, intelligence…)
--
--  ✅ IDEMPOTENT & NON DESTRUCTIF : relançable autant de fois que voulu, ne supprime
--     AUCUNE donnée (CREATE IF NOT EXISTS). À lancer dans Supabase › SQL Editor.
--  ⚠️ Pour repartir de zéro (TOUT effacer) : décommenter la SECTION 0 ci-dessous.
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
--  SECTION 0 — RESET TOTAL (OPTIONNEL, DANGER : décommenter pour TOUT effacer)
-- ════════════════════════════════════════════════════════════════════════════
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   DROP VIEW IF EXISTS public.v_marketplace_catalogue CASCADE;
--   FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'fl_%'
--   LOOP EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', r.tablename); END LOOP;
-- END $$;

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
--  SECTION 1 — TABLES (schéma unifié) + RLS
-- ════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    -- Référentiels
    'fl_articles','fl_clients','fl_users','fl_fournisseurs','fl_livreurs',
    -- Commandes & ventes
    'fl_commandes','fl_commandes_web','fl_visites',
    -- Achat / réception / stock
    'fl_bons_achat','fl_purchase_orders','fl_receptions','fl_pa_historique','fl_demandes_achat',
    -- Logistique
    'fl_bons_livraison','fl_bons_preparation','fl_retours','fl_trips','fl_transferts','fl_trip_charges',
    -- Caisse / charges / contenants
    'fl_caisses_vides','fl_charges','fl_caisse_entries','fl_charges_article','fl_contenants_tare',
    -- Documents / structure
    'fl_documents','fl_depots','fl_salaries','fl_actionnaires',
    -- Accès / demandes / CRM
    'fl_site_access','fl_account_requests','fl_prospects','fl_feedbacks','fl_company_contacts',
    -- Communication / alertes / compteur
    'fl_messages','fl_notices','fl_notifications','fl_cutoffs','fl_shop_analytics',
    -- Programmes / pricing
    'fl_gift_materials','fl_bonus_matrix','fl_credits_fournisseurs','fl_pricing_rules',
    -- Finance V2
    'fl_invoices','fl_avoirs','fl_wallet_transactions','fl_paiements',
    -- Parrainage / tracking / promos
    'fl_referrals','fl_referral_config','fl_tracking','fl_promotions','fl_coupons',
    -- Contrats / organisation
    'fl_contrats','fl_organisations',
    -- PROCESS & CONFIG (étapes de prise de commande, workflow, alertes, emails)
    'fl_process_config','fl_workflow_config','fl_alert_config','fl_email_config',
    -- INTELLIGENCE CONCURRENCE (relevés prix + flux/trajectoires)
    'fl_intel_prix','fl_intel_flux'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS public.%I (id TEXT PRIMARY KEY, payload JSONB NOT NULL DEFAULT ''{}''::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now());', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
--  SECTION 2 — DROITS D'ACCÈS (OBLIGATOIRE) ★★★
--  Les tables créées via le SQL Editor n'héritent PAS automatiquement des droits
--  des rôles Supabase. Sans ces GRANTs : service_role (écritures /api/sync-write,
--  /api/ext/*) et anon (lecture site) reçoivent "permission denied" (42501).
--  La RLS protège les LIGNES ; les GRANTs donnent l'accès TABLE.
-- ════════════════════════════════════════════════════════════════════════════
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES  IN SCHEMA public TO anon, authenticated, service_role;

-- Les objets créés plus tard hériteront automatiquement de ces droits :
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES  TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
--  SECTION 3 — POLITIQUES ANON (uniquement ce que le SITE WEB doit voir)
--  Tout le reste reste réservé au service_role (aucune politique anon).
-- ════════════════════════════════════════════════════════════════════════════
-- Catalogue (lecture publique)
DROP POLICY IF EXISTS anon_read_articles ON public.fl_articles;
CREATE POLICY anon_read_articles ON public.fl_articles FOR SELECT TO anon USING (true);
-- Coordonnées entreprise (pied de page du site)
DROP POLICY IF EXISTS anon_read_contacts ON public.fl_company_contacts;
CREATE POLICY anon_read_contacts ON public.fl_company_contacts FOR SELECT TO anon USING (true);
-- Avis : lecture + dépôt depuis le site
DROP POLICY IF EXISTS anon_read_feedbacks   ON public.fl_feedbacks;
CREATE POLICY anon_read_feedbacks   ON public.fl_feedbacks FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS anon_insert_feedbacks ON public.fl_feedbacks;
CREATE POLICY anon_insert_feedbacks ON public.fl_feedbacks FOR INSERT TO anon WITH CHECK (true);
-- Compteur boutique : l'anon ne lit QUE la config d'affichage (id='__config'), pas les agrégats
DROP POLICY IF EXISTS anon_read_shop_config ON public.fl_shop_analytics;
CREATE POLICY anon_read_shop_config ON public.fl_shop_analytics FOR SELECT TO anon USING (id = '__config');

-- ════════════════════════════════════════════════════════════════════════════
--  SECTION 4 — VUE CATALOGUE MARKETPLACE (tier 1 de /api/ext/catalogue)
-- ════════════════════════════════════════════════════════════════════════════
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
GRANT SELECT ON public.v_marketplace_catalogue TO anon, authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════════════
--  SECTION 5 — INDEX FRÉQUENTS
-- ════════════════════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_fl_articles_marketplace ON public.fl_articles ((payload->>'marketplaceActif'));
CREATE INDEX IF NOT EXISTS idx_fl_articles_famille     ON public.fl_articles ((payload->>'famille'));
CREATE INDEX IF NOT EXISTS idx_fl_articles_updated     ON public.fl_articles (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fl_commandes_clientid   ON public.fl_commandes ((payload->>'clientId'));
CREATE INDEX IF NOT EXISTS idx_fl_commandes_date       ON public.fl_commandes ((payload->>'date'));
CREATE INDEX IF NOT EXISTS idx_fl_commandes_statut     ON public.fl_commandes ((payload->>'statut'));
CREATE INDEX IF NOT EXISTS idx_fl_clients_telephone    ON public.fl_clients ((payload->>'telephone'));
CREATE INDEX IF NOT EXISTS idx_fl_clients_prevendeur   ON public.fl_clients ((payload->>'prevendeurId'));
CREATE INDEX IF NOT EXISTS idx_fl_users_email          ON public.fl_users ((payload->>'email'));
CREATE INDEX IF NOT EXISTS idx_fl_notifications_updated ON public.fl_notifications (updated_at DESC);

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
--  APRÈS EXÉCUTION — VÉRIFICATIONS RAPIDES (doivent renvoyer un nombre, pas 42501)
-- ════════════════════════════════════════════════════════════════════════════
--   SELECT count(*) FROM public.fl_articles;
--   SELECT count(*) FROM public.fl_clients;
--   SELECT count(*) FROM public.fl_commandes;
--
--  VARIABLES D'ENV VERCEL (sinon écritures/emails KO) :
--   ERP (projet fresh-link) ET shop (projet vita-fresh) :
--     SUPABASE_SERVICE_ROLE_KEY = <clé service_role>            (OBLIGATOIRE écritures)
--     NEXT_PUBLIC_SUPABASE_URL  = https://wnuilvamhygkzupvfnxz.supabase.co
--     NEXT_PUBLIC_SUPABASE_ANON_KEY = <clé anon>
--   Emails (Resend) :
--     RESEND_API_KEY = <clé valide> ; EMAIL_FROM = Vita Fresh <support@vita-core.org>
--   Sécurité (sinon valeurs par défaut publiques) :
--     AUTH_SECRET, DEVICE_SECRET, DEVICE_BYPASS_KEY ; SHOP_ADMIN_PASSWORD (actualités)
--
--  MODÈLE D'ACCÈS :
--   • App ERP + endpoints /api/sync-write, /api/sync-read, /api/ext/*  → service_role (bypass RLS)
--   • Site web (lecture catalogue/contacts/avis + dépôt avis + config compteur) → anon (RLS ci-dessus)
--   • Le shop appelle /api/ext/* (proxifié vers l'ERP, cf. vercel.json du shop)
-- ════════════════════════════════════════════════════════════════════════════
