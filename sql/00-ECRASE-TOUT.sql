-- ════════════════════════════════════════════════════════════════════════════
-- 00-ECRASE-TOUT.sql  —  RESET TOTAL Supabase Vita Fresh / FreshLink
-- ----------------------------------------------------------------------------
-- ⚠️⚠️  DANGER : SUPPRIME TOUTES LES DONNÉES ET TABLES fl_* (catalogue, clients,
--               commandes, utilisateurs, tout). Aucune récupération possible.
-- À utiliser uniquement pour repartir de zéro, puis lancer 01-LIAISON-COMPLETE.sql.
-- Exécuter dans Supabase → SQL Editor (instance wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- Vue dépendante d'abord
DROP VIEW IF EXISTS public.v_marketplace_catalogue CASCADE;

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
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', t);
  END LOOP;
  -- Anciennes tables archivées au mauvais schéma (audit 2026-06-09)
  FOR t IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema='public' AND table_name LIKE 'fl_%legacy%'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE;', t);
  END LOOP;
END $$;

COMMIT;

-- ➡️  Enchaîner immédiatement avec  01-LIAISON-COMPLETE.sql
