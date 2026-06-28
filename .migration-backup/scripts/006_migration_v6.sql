-- ============================================================
-- FreshLink Pro — Migration v6
-- URL: https://nbcodflwqvcvcdbpguth.supabase.co
-- Executer dans: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── fl_users : ajout require_camera_auth ─────────────────────────────────────
alter table public.fl_users
  add column if not exists require_camera_auth boolean default false;

-- ── fl_trips : KM + caisses par article ──────────────────────────────────────
alter table public.fl_trips
  add column if not exists km_depart          numeric,
  add column if not exists km_arrivee         numeric,
  add column if not exists km_total           numeric,
  add column if not exists km_depart_confirme boolean default false,
  add column if not exists caisses_validees   boolean default false,
  add column if not exists nb_caisses_by_article jsonb default '{}'::jsonb;

-- ── fl_receptions : quantite_facturee et prix_facture par ligne ───────────────
-- Les lignes reception sont stockees en JSONB (tableau) donc on ne modifie
-- pas les colonnes mais on documente le nouveau schema attendu:
--
--   lignes[].quantite_facturee  numeric  -- qty sur facture fournisseur
--   lignes[].ecart_qte          numeric  -- auto: quantite_recue - quantite_facturee
--   lignes[].prix_facture       numeric  -- prix sur facture
--   lignes[].ecart_prix         numeric  -- auto: prix_facture - prix_achat
--
-- Aucune migration DDL requise car la colonne `lignes` est deja JSONB.
-- L'application mettra a jour le schema au prochain upsert.

-- ── fl_purchase_orders : notification status ─────────────────────────────────
-- Le champ statut existant gere deja "ouvert"/"envoye"/"receptionne"/"annule"
-- Aucune modification DDL requise.

-- ── Politique RLS — s'assurer qu'elles existent bien ─────────────────────────
do $$ begin
  -- fl_trips
  if not exists (
    select 1 from pg_policies where tablename = 'fl_trips' and policyname = 'fl_trips_all'
  ) then
    execute 'create policy "fl_trips_all" on public.fl_trips for all using (true) with check (true)';
  end if;

  -- fl_receptions
  if not exists (
    select 1 from pg_policies where tablename = 'fl_receptions' and policyname = 'fl_receptions_all'
  ) then
    execute 'create policy "fl_receptions_all" on public.fl_receptions for all using (true) with check (true)';
  end if;

  -- fl_purchase_orders
  if not exists (
    select 1 from pg_policies where tablename = 'fl_purchase_orders' and policyname = 'fl_purchase_orders_all'
  ) then
    execute 'create policy "fl_purchase_orders_all" on public.fl_purchase_orders for all using (true) with check (true)';
  end if;
end $$;

-- ── Commentaires ─────────────────────────────────────────────────────────────
comment on column public.fl_trips.km_depart          is 'KM compteur au depart — obligatoire avant validation chargement';
comment on column public.fl_trips.km_arrivee         is 'KM compteur a l'arrivee — saisi par livreur';
comment on column public.fl_trips.km_total           is 'KM parcourus = km_arrivee - km_depart';
comment on column public.fl_trips.km_depart_confirme is 'True une fois le controleur a confirme le KM depart';
comment on column public.fl_trips.caisses_validees   is 'True une fois toutes les caisses par article sont saisies';
comment on column public.fl_trips.nb_caisses_by_article is 'Map articleId => {gros, demi, articleNom}';
comment on column public.fl_users.require_camera_auth is 'Super admin: oblige cet utilisateur a activer camera+micro';
