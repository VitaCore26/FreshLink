-- ════════════════════════════════════════════════════════════════════════════
-- 02-RESET-SAUF-CLIENTS-ARTICLES.sql
-- ----------------------------------------------------------------------------
-- ✅ GARDE  : fl_articles (catalogue) + fl_clients (base clients)
--            + le compte super_super_admin (pour ne PAS être verrouillé)
-- ♻️ EFFACE : démos, comptes créés par défaut, et TOUTES les autres données
--            (commandes, bons, caisses, visites, docs, notifications, etc.)
-- À lancer dans Supabase → SQL Editor. Idempotent.
-- ⚠️ Les tables doivent déjà exister (sinon lancer d'abord 01-LIAISON-COMPLETE.sql).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 1) Utilisateurs : on ne garde QUE le super administrateur (évite le lockout).
--    Tous les comptes démo + créés par défaut + autres rôles sont supprimés.
DELETE FROM public.fl_users
WHERE COALESCE(payload->>'role', '') <> 'super_super_admin';

-- 2) Toutes les autres tables de données → vidées (sauf articles, clients, users).
DO $$
DECLARE
  wipe TEXT[] := ARRAY[
    'fl_commandes','fl_commandes_web','fl_visites',
    'fl_bons_achat','fl_purchase_orders','fl_receptions','fl_pa_historique',
    'fl_bons_livraison','fl_bons_preparation','fl_retours','fl_trips','fl_transferts',
    'fl_caisses_vides','fl_charges','fl_caisse_entries','fl_charges_article',
    'fl_documents','fl_depots','fl_salaries','fl_actionnaires',
    'fl_site_access','fl_account_requests','fl_prospects','fl_feedbacks',
    'fl_messages','fl_notices','fl_notifications','fl_cutoffs','fl_shop_analytics',
    'fl_gift_materials','fl_bonus_matrix','fl_credits_fournisseurs','fl_pricing_rules',
    'fl_invoices','fl_avoirs','fl_wallet_transactions','fl_paiements',
    'fl_referrals','fl_referral_config','fl_tracking','fl_promotions','fl_coupons',
    'fl_contrats','fl_organisations'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY wipe LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('TRUNCATE TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;

-- 3) fl_company_contacts : on garde la fiche entreprise (id='main'), on purge le reste.
DELETE FROM public.fl_company_contacts WHERE id <> 'main';

COMMIT;

-- Vérif : SELECT count(*) FROM fl_articles;  SELECT count(*) FROM fl_clients;
--         SELECT id, payload->>'role' FROM fl_users;   (doit ne lister que le super admin)
--
-- ⚠️ Code : les comptes démo/par défaut sont aussi SEMÉS côté application
--    (DEFAULT_USERS dans lib/store.ts) et réapparaissent sur un appareil au
--    localStorage vide. Pour qu'ils ne reviennent pas, il faut aussi désactiver
--    ce seed côté code (me le demander) + vider le localStorage des appareils.
