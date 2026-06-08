-- ════════════════════════════════════════════════════════════════════════
-- FIX-CORE-TABLES-SCHEMA.sql
-- ════════════════════════════════════════════════════════════════════════
-- Date     : 2026-06-09
-- Auteur   : Audit ERP↔Supabase↔Boutique
-- Contexte : Les 17 tables core de FreshLink ont un schema "colonnes plates"
--            incompatible avec le code ERP qui attend partout le schema JSONB
--            {id TEXT PK, payload JSONB, updated_at TIMESTAMPTZ}.
--            Resultat : sync-read/sync-write echouent, le catalogue boutique
--            tombe en fallback hardcode, aucune commande boutique n'est ecrite.
--
-- Strategie : preserver l'eventuel contenu en renommant l'ancienne table en
--             <table>_legacy_2026_06_09, puis recreer une table propre.
--             Si tu veux retro-porter des donnees apres, le _legacy reste
--             accessible dans la base.
--
-- A executer dans Supabase > SQL Editor sur l'instance wnuilvamhygkzupvfnxz.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Backup en renommant les tables au mauvais schema ────────────────────
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'fl_articles', 'fl_clients', 'fl_users', 'fl_commandes',
    'fl_fournisseurs', 'fl_purchase_orders', 'fl_receptions',
    'fl_bons_achat', 'fl_bons_livraison', 'fl_visites',
    'fl_trips', 'fl_retours', 'fl_livreurs',
    'fl_feedbacks', 'fl_company_contacts'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Si l'ancienne table existe ET n'a PAS de colonne payload, on l'archive
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t)
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'payload'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, t || '_legacy_2026_06_09');
      RAISE NOTICE 'Renamed % to %_legacy_2026_06_09', t, t;
    END IF;
  END LOOP;
END $$;

-- ── 2. Recreer chaque table avec le schema JSONB standard ──────────────────
-- (helper repete pour clarte ; chaque table herite des memes regles RLS)

CREATE TABLE IF NOT EXISTS public.fl_articles (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_clients (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_users (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_commandes (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_fournisseurs (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_purchase_orders (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_receptions (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_bons_achat (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_bons_livraison (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_visites (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_trips (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_retours (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_livreurs (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_feedbacks (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_company_contacts (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. Creer les tables manquantes ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_messages (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fl_non_achats (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 4. Index utiles pour les queries fréquentes ────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fl_articles_marketplace ON public.fl_articles ((payload->>'marketplaceActif'));
CREATE INDEX IF NOT EXISTS idx_fl_articles_updated     ON public.fl_articles (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fl_commandes_clientid   ON public.fl_commandes ((payload->>'clientId'));
CREATE INDEX IF NOT EXISTS idx_fl_commandes_telephone  ON public.fl_commandes ((payload->>'telephone'));
CREATE INDEX IF NOT EXISTS idx_fl_commandes_updated    ON public.fl_commandes (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fl_clients_telephone    ON public.fl_clients ((payload->>'telephone'));
CREATE INDEX IF NOT EXISTS idx_fl_users_email          ON public.fl_users ((payload->>'email'));
CREATE INDEX IF NOT EXISTS idx_fl_users_telephone      ON public.fl_users ((payload->>'telephone'));

-- ── 5. RLS — bloquer l'anon partout par defaut ─────────────────────────────
-- Le code ERP utilise systematiquement /api/sync-* (service-role).
-- Les seules tables qui doivent etre lisibles par l'anon sont fl_articles
-- (catalogue boutique), fl_company_contacts (pieds de page), fl_feedbacks.

ALTER TABLE public.fl_articles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_clients             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_commandes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_fournisseurs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_purchase_orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_receptions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_bons_achat          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_bons_livraison      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_visites             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_trips               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_retours             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_livreurs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_feedbacks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_company_contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_non_achats          ENABLE ROW LEVEL SECURITY;

-- Lecture anonyme autorisee uniquement sur ces 3 tables publiques
DROP POLICY IF EXISTS "anon read articles"  ON public.fl_articles;
DROP POLICY IF EXISTS "anon read contacts"  ON public.fl_company_contacts;
DROP POLICY IF EXISTS "anon read feedbacks" ON public.fl_feedbacks;

CREATE POLICY "anon read articles"  ON public.fl_articles
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read contacts"  ON public.fl_company_contacts
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon read feedbacks" ON public.fl_feedbacks
  FOR SELECT TO anon USING (true);

-- ── 6. Vue v_marketplace_catalogue (tier 1 du catalogue endpoint) ─────────
-- Optionnelle : si absente, le code retombe sur fl_articles direct.
-- Avec la vue, le catalogue boutique beneficie d'un cache postgres et de
-- la possibilite d'ajouter d'autres regles d'affichage en SQL.

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
           (payload->>'marketplace_actif')::boolean,
           false)                                       AS marketplace_actif,
  COALESCE((payload->>'ordre')::int, 999)               AS ordre,
  payload->>'photo'               AS photo,
  payload->>'conditionnement'     AS conditionnement,
  payload                          AS payload,
  updated_at
FROM public.fl_articles
WHERE COALESCE((payload->>'marketplaceActif')::boolean,
               (payload->>'marketplace_actif')::boolean,
               false) = true;

GRANT SELECT ON public.v_marketplace_catalogue TO anon, authenticated;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════
-- VERIFICATION post-execution (a lancer separement) :
--
--   SELECT table_name FROM information_schema.tables
--    WHERE table_schema='public' AND table_name LIKE 'fl_%' ORDER BY 1;
--
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE table_schema='public' AND column_name='payload' ORDER BY 1;
--
-- Si tout est OK, recharger l'ERP et essayer une commande sur la boutique.
-- ════════════════════════════════════════════════════════════════════════
