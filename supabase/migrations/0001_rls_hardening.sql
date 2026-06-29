-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION C1 — Durcissement RLS (Row Level Security)
-- ════════════════════════════════════════════════════════════════════════════
--
-- ⚠️  NE PAS APPLIQUER avant d'avoir terminé la PHASE 1 du plan
--     (docs/SECURITY-C1-RLS-HARDENING-PLAN.md) : migrer les ~17 accès Supabase
--     directs du navigateur (clé anon) vers l'API serveur authentifiée
--     (/api/sync-read, /api/sync-write). Sinon ces écrans casseront.
--
-- État AVANT : RLS DÉSACTIVÉ + GRANT ALL TO anon sur toutes les tables fl_*.
--   → La clé anon (publique, dans le bundle JS) donne lecture/écriture/suppression
--     totale à n'importe qui sur Internet (clients, salaires, factures…).
--
-- État APRÈS : RLS activé, anon n'a plus AUCUN droit d'écriture, seulement la
--   lecture du catalogue marketplace public. Tout le reste passe par le serveur
--   (service_role, qui contourne RLS).
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Activer RLS + révoquer anon/authenticated sur toutes les tables fl_* ──
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename LIKE 'fl_%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
    -- Plus aucun droit direct pour les rôles publics : tout passe par le serveur.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    -- service_role conserve tous les droits (il contourne RLS de toute façon).
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;

-- ── 2. Catalogue marketplace : lecture publique (le shop en a besoin) ────────
-- La vue n'expose que les colonnes publiques (jamais prixAchat, marge, stock réel).
GRANT SELECT ON public.v_marketplace_catalogue TO anon, authenticated;

-- ── 3. (Optionnel) Realtime : si certains écrans gardent un abonnement realtime
--      anon, accorder UNIQUEMENT SELECT sur les tables concernées via policy.
--      À décommenter table par table SEULEMENT si l'écran n'a pas été migré vers
--      l'API. Idéalement, viser zéro accès anon direct (cf. plan PHASE 1).
--
-- ALTER TABLE public.fl_commandes_web ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY anon_read_commandes_web ON public.fl_commandes_web
--   FOR SELECT TO anon USING (true);
-- GRANT SELECT ON public.fl_commandes_web TO anon;

COMMIT;

-- ── 4. Vérification post-migration (à lancer après COMMIT) ───────────────────
-- Doit retourner 0 ligne (aucune table fl_* sans RLS) :
--   SELECT tablename FROM pg_tables
--   WHERE schemaname='public' AND tablename LIKE 'fl_%' AND rowsecurity = false;
--
-- Doit ne lister que v_marketplace_catalogue pour anon en écriture/lecture libre :
--   SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE grantee = 'anon' AND table_schema = 'public';
