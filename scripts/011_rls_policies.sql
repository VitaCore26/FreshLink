-- ============================================================
-- FRESH LINK PRO — Politiques RLS (Row Level Security)
-- À appliquer dans Supabase Dashboard > SQL Editor
-- après avoir migré vers Supabase Auth
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. ACTIVER RLS SUR TOUTES LES TABLES
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.fl_users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_articles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_fournisseurs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_commandes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_bons_achat         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_purchase_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_receptions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_trips              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_bons_livraison     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_retours            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_visites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_bons_preparation   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_transferts_stock   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_notices            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_depots             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_livreurs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fl_motifs_retour      ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════════════
-- 2. FONCTION HELPER — récupère le rôle de l'utilisateur courant
-- ══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM public.fl_users WHERE id = auth.uid()::text LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.fl_users
    WHERE id = auth.uid()::text
    AND role IN ('super_admin', 'admin')
  );
$$;

-- ══════════════════════════════════════════════════════════════
-- 3. UTILISATEURS — admins voient tout, chacun voit son profil
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "users_select" ON public.fl_users;
CREATE POLICY "users_select" ON public.fl_users FOR SELECT
  USING (
    id = auth.uid()::text
    OR public.is_admin()
    OR public.get_current_user_role() IN ('resp_commercial', 'team_leader', 'rh_manager')
  );

DROP POLICY IF EXISTS "users_write" ON public.fl_users;
CREATE POLICY "users_write" ON public.fl_users FOR ALL
  USING (public.is_admin());

-- ══════════════════════════════════════════════════════════════
-- 4. ARTICLES — lecture pour tous les authentifiés, écriture admin/acheteur
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "articles_select" ON public.fl_articles;
CREATE POLICY "articles_select" ON public.fl_articles FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "articles_write" ON public.fl_articles;
CREATE POLICY "articles_write" ON public.fl_articles FOR ALL
  USING (
    public.get_current_user_role() IN ('super_admin', 'admin', 'acheteur', 'ctrl_achat', 'magasinier')
  );

-- ══════════════════════════════════════════════════════════════
-- 5. CLIENTS — prevendeurs voient leurs clients, managers voient tout
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "clients_select" ON public.fl_clients;
CREATE POLICY "clients_select" ON public.fl_clients FOR SELECT
  USING (
    prevendeur_id = auth.uid()::text
    OR public.get_current_user_role() IN (
      'super_admin', 'admin', 'resp_commercial', 'team_leader',
      'resp_logistique', 'financier', 'cash_man', 'dispatcheur', 'livreur'
    )
  );

DROP POLICY IF EXISTS "clients_write" ON public.fl_clients;
CREATE POLICY "clients_write" ON public.fl_clients FOR ALL
  USING (
    public.get_current_user_role() IN ('super_admin', 'admin', 'resp_commercial', 'prevendeur', 'team_leader')
  );

-- ══════════════════════════════════════════════════════════════
-- 6. COMMANDES — prevendeurs voient/créent les leurs, BO voit tout
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "commandes_select" ON public.fl_commandes;
CREATE POLICY "commandes_select" ON public.fl_commandes FOR SELECT
  USING (
    commercial_id = auth.uid()::text
    OR public.get_current_user_role() IN (
      'super_admin', 'admin', 'resp_commercial', 'team_leader',
      'resp_logistique', 'dispatcheur', 'livreur', 'magasinier',
      'financier', 'cash_man', 'ctrl_prep'
    )
  );

DROP POLICY IF EXISTS "commandes_write" ON public.fl_commandes;
CREATE POLICY "commandes_write" ON public.fl_commandes FOR ALL
  USING (
    commercial_id = auth.uid()::text
    OR public.get_current_user_role() IN ('super_admin', 'admin', 'resp_commercial', 'team_leader')
  );

-- ══════════════════════════════════════════════════════════════
-- 7. BONS D'ACHAT — acheteurs et managers
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "bons_achat_all" ON public.fl_bons_achat;
CREATE POLICY "bons_achat_all" ON public.fl_bons_achat FOR ALL
  USING (
    acheteur_id = auth.uid()::text
    OR public.get_current_user_role() IN ('super_admin', 'admin', 'resp_logistique', 'ctrl_achat', 'magasinier', 'financier')
  );

-- ══════════════════════════════════════════════════════════════
-- 8. FOURNISSEURS — lecture étendue, écriture restreinte
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "fournisseurs_select" ON public.fl_fournisseurs;
CREATE POLICY "fournisseurs_select" ON public.fl_fournisseurs FOR SELECT
  USING (
    public.get_current_user_role() IN (
      'super_admin', 'admin', 'acheteur', 'ctrl_achat',
      'resp_logistique', 'resp_commercial', 'financier'
    )
  );

DROP POLICY IF EXISTS "fournisseurs_write" ON public.fl_fournisseurs;
CREATE POLICY "fournisseurs_write" ON public.fl_fournisseurs FOR ALL
  USING (
    public.get_current_user_role() IN ('super_admin', 'admin', 'acheteur')
  );

-- ══════════════════════════════════════════════════════════════
-- 9. TRIPS — logistique
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "trips_all" ON public.fl_trips;
CREATE POLICY "trips_all" ON public.fl_trips FOR ALL
  USING (
    livreur_id = auth.uid()::text
    OR public.get_current_user_role() IN (
      'super_admin', 'admin', 'resp_logistique', 'dispatcheur',
      'resp_commercial', 'financier', 'cash_man'
    )
  );

-- ══════════════════════════════════════════════════════════════
-- 10. MESSAGES — tous les authentifiés
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "messages_select" ON public.fl_messages;
CREATE POLICY "messages_select" ON public.fl_messages FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "messages_insert" ON public.fl_messages;
CREATE POLICY "messages_insert" ON public.fl_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid()::text);

-- ══════════════════════════════════════════════════════════════
-- 11. MOTIFS RETOUR & DEPOTS — lecture pour tous, écriture admin
-- ══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "motifs_select" ON public.fl_motifs_retour;
CREATE POLICY "motifs_select" ON public.fl_motifs_retour FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "depots_select" ON public.fl_depots;
CREATE POLICY "depots_select" ON public.fl_depots FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "depots_write" ON public.fl_depots;
CREATE POLICY "depots_write" ON public.fl_depots FOR ALL
  USING (public.is_admin());

-- ══════════════════════════════════════════════════════════════
-- INDEX MANQUANTS (performances)
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_email ON public.fl_users(lower(email));
CREATE INDEX IF NOT EXISTS idx_clients_nom  ON public.fl_clients(nom text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_commandes_commercial_date ON public.fl_commandes(commercial_id, date);
CREATE INDEX IF NOT EXISTS idx_bl_date_statut ON public.fl_bons_livraison(date, statut_livraison);

-- ══════════════════════════════════════════════════════════════
-- CONTRAINTES CHECK sur les statuts critiques
-- PostgreSQL n'a pas ADD CONSTRAINT IF NOT EXISTS —
-- on supprime d'abord si elle existe, puis on recrée.
-- ══════════════════════════════════════════════════════════════
ALTER TABLE public.fl_commandes
  DROP CONSTRAINT IF EXISTS chk_commande_statut;
ALTER TABLE public.fl_commandes
  ADD CONSTRAINT chk_commande_statut
  CHECK (statut IN ('en_attente','approuve','refuse','prepare','livre','annule','en_cours'));

ALTER TABLE public.fl_bons_livraison
  DROP CONSTRAINT IF EXISTS chk_bl_statut_livraison;
ALTER TABLE public.fl_bons_livraison
  ADD CONSTRAINT chk_bl_statut_livraison
  CHECK (statut_livraison IN ('livre','premier_passage','deuxieme_passage','retour'));

ALTER TABLE public.fl_trips
  DROP CONSTRAINT IF EXISTS chk_trip_statut;
ALTER TABLE public.fl_trips
  ADD CONSTRAINT chk_trip_statut
  CHECK (statut IN ('planifie','en_cours','termine','annule'));
