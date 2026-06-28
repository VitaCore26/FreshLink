-- ============================================================
-- FreshLink Pro — Migration Supabase complète
-- URL: https://nbcodflwqvcvcdbpguth.supabase.co
-- Exécuter dans: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ── Trigger updated_at helper ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============================================================
-- fl_users
-- ============================================================
create table if not exists public.fl_users (
  id                            text primary key,
  name                          text not null,
  email                         text not null unique,
  password_hash                 text not null default '',
  role                          text not null default 'prevendeur',
  access_type                   text,
  secteur                       text,
  phone                         text,
  telephone                     text,
  actif                         boolean not null default true,
  photo_url                     text,
  can_view_achat                boolean default false,
  can_view_commercial           boolean default false,
  can_view_logistique           boolean default false,
  can_view_stock                boolean default false,
  can_view_cash                 boolean default false,
  can_view_finance              boolean default false,
  can_view_recap                boolean default false,
  can_view_database             boolean default false,
  objectif_clients              integer,
  objectif_tonnage              numeric,
  objectif_journalier_ca        numeric,
  objectif_hebdomadaire_ca      numeric,
  objectif_mensuel_ca           numeric,
  objectif_journalier_clients   integer,
  objectif_hebdomadaire_clients integer,
  objectif_mensuel_clients      integer,
  notif_achat                   boolean default false,
  notif_commercial              boolean default false,
  notif_livraison               boolean default false,
  notif_recap                   boolean default false,
  notif_besoin_achat            boolean default false,
  fournisseur_id                text,
  client_id                     text,
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now()
);
alter table public.fl_users enable row level security;
drop policy if exists "fl_users_all" on public.fl_users;
create policy "fl_users_all" on public.fl_users for all using (true) with check (true);
drop trigger if exists fl_users_updated_at on public.fl_users;
create trigger fl_users_updated_at before update on public.fl_users
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_clients
-- ============================================================
create table if not exists public.fl_clients (
  id                  text primary key,
  nom                 text not null,
  secteur             text not null default '',
  zone                text not null default '',
  type                text not null default 'marchand',
  type_autre          text,
  taille              text,
  type_produits       text,
  rotation            text,
  modalite_paiement   text,
  plafond_credit      numeric,
  encours             numeric default 0,
  gps_lat             numeric,
  gps_lng             numeric,
  adresse             text,
  telephone           text,
  photo_devanture     text,
  actif               boolean not null default true,
  prevendeur_id       text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_clients enable row level security;
drop policy if exists "fl_clients_all" on public.fl_clients;
create policy "fl_clients_all" on public.fl_clients for all using (true) with check (true);
drop trigger if exists fl_clients_updated_at on public.fl_clients;
create trigger fl_clients_updated_at before update on public.fl_clients
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_articles
-- ============================================================
create table if not exists public.fl_articles (
  id                  text primary key,
  nom                 text not null,
  nom_ar              text,
  famille             text not null default 'Légumes',
  unite               text not null default 'kg',
  prix_achat          numeric not null default 0,
  methode_pv          text default 'marge',
  taux_marge          numeric default 30,
  prix_vente_ht       numeric default 0,
  tva                 numeric default 0,
  prix_vente_ttc      numeric default 0,
  stock_disponible    numeric default 0,
  stock_defect        numeric default 0,
  seuil_alerte        numeric default 50,
  photo               text,
  actif               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_articles enable row level security;
drop policy if exists "fl_articles_all" on public.fl_articles;
create policy "fl_articles_all" on public.fl_articles for all using (true) with check (true);
drop trigger if exists fl_articles_updated_at on public.fl_articles;
create trigger fl_articles_updated_at before update on public.fl_articles
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_fournisseurs
-- ============================================================
create table if not exists public.fl_fournisseurs (
  id          text primary key,
  nom         text not null,
  telephone   text,
  adresse     text,
  produits    text,
  actif       boolean default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.fl_fournisseurs enable row level security;
drop policy if exists "fl_fournisseurs_all" on public.fl_fournisseurs;
create policy "fl_fournisseurs_all" on public.fl_fournisseurs for all using (true) with check (true);
drop trigger if exists fl_fournisseurs_updated_at on public.fl_fournisseurs;
create trigger fl_fournisseurs_updated_at before update on public.fl_fournisseurs
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_commandes
-- ============================================================
create table if not exists public.fl_commandes (
  id              text primary key,
  date            text not null,
  client_id       text,
  client_nom      text not null default '',
  prevendeur_id   text,
  prevendeur_nom  text,
  zone            text,
  statut          text not null default 'en_attente',
  lignes          jsonb not null default '[]',
  total_ht        numeric default 0,
  total_ttc       numeric default 0,
  mode_paiement   text,
  gps_lat         numeric,
  gps_lng         numeric,
  notes           text,
  approved_by     text,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_commandes enable row level security;
drop policy if exists "fl_commandes_all" on public.fl_commandes;
create policy "fl_commandes_all" on public.fl_commandes for all using (true) with check (true);
drop trigger if exists fl_commandes_updated_at on public.fl_commandes;
create trigger fl_commandes_updated_at before update on public.fl_commandes
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_visites
-- ============================================================
create table if not exists public.fl_visites (
  id              text primary key,
  date            text not null,
  client_id       text,
  client_nom      text not null default '',
  prevendeur_id   text,
  motif           text,
  resultat        text,
  notes           text,
  gps_lat         numeric,
  gps_lng         numeric,
  created_at      timestamptz not null default now()
);
alter table public.fl_visites enable row level security;
drop policy if exists "fl_visites_all" on public.fl_visites;
create policy "fl_visites_all" on public.fl_visites for all using (true) with check (true);

-- ============================================================
-- fl_trips (tournées)
-- ============================================================
create table if not exists public.fl_trips (
  id              text primary key,
  date            text not null,
  livreur_id      text,
  livreur_nom     text,
  vehicule        text,
  statut          text default 'planifie',
  bons_ids        jsonb default '[]',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_trips enable row level security;
drop policy if exists "fl_trips_all" on public.fl_trips;
create policy "fl_trips_all" on public.fl_trips for all using (true) with check (true);
drop trigger if exists fl_trips_updated_at on public.fl_trips;
create trigger fl_trips_updated_at before update on public.fl_trips
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_bons_livraison
-- ============================================================
create table if not exists public.fl_bons_livraison (
  id              text primary key,
  numero          text,
  date            text not null,
  commande_id     text,
  client_id       text,
  client_nom      text not null default '',
  livreur_id      text,
  livreur_nom     text,
  trip_id         text,
  statut          text not null default 'en_attente',
  lignes          jsonb not null default '[]',
  total_ht        numeric default 0,
  total_ttc       numeric default 0,
  montant_encaisse numeric default 0,
  mode_paiement   text,
  signature       text,
  photo_livraison text,
  gps_lat         numeric,
  gps_lng         numeric,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_bons_livraison enable row level security;
drop policy if exists "fl_bons_livraison_all" on public.fl_bons_livraison;
create policy "fl_bons_livraison_all" on public.fl_bons_livraison for all using (true) with check (true);
drop trigger if exists fl_bons_livraison_updated_at on public.fl_bons_livraison;
create trigger fl_bons_livraison_updated_at before update on public.fl_bons_livraison
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_retours
-- ============================================================
create table if not exists public.fl_retours (
  id              text primary key,
  date            text not null,
  bon_livraison_id text,
  client_id       text,
  client_nom      text not null default '',
  livreur_id      text,
  lignes          jsonb not null default '[]',
  motif           text,
  statut          text default 'en_attente',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_retours enable row level security;
drop policy if exists "fl_retours_all" on public.fl_retours;
create policy "fl_retours_all" on public.fl_retours for all using (true) with check (true);
drop trigger if exists fl_retours_updated_at on public.fl_retours;
create trigger fl_retours_updated_at before update on public.fl_retours
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_bons_achat
-- ============================================================
create table if not exists public.fl_bons_achat (
  id              text primary key,
  numero          text,
  date            text not null,
  fournisseur_id  text,
  fournisseur_nom text,
  acheteur_id     text,
  statut          text default 'brouillon',
  lignes          jsonb not null default '[]',
  total_ht        numeric default 0,
  total_ttc       numeric default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_bons_achat enable row level security;
drop policy if exists "fl_bons_achat_all" on public.fl_bons_achat;
create policy "fl_bons_achat_all" on public.fl_bons_achat for all using (true) with check (true);
drop trigger if exists fl_bons_achat_updated_at on public.fl_bons_achat;
create trigger fl_bons_achat_updated_at before update on public.fl_bons_achat
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_purchase_orders (PO Consolidés)
-- ============================================================
create table if not exists public.fl_purchase_orders (
  id              text primary key,
  numero          text,
  date            text not null,
  fournisseur_id  text,
  fournisseur_nom text,
  statut          text default 'brouillon',
  lignes          jsonb not null default '[]',
  total_ht        numeric default 0,
  total_ttc       numeric default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_purchase_orders enable row level security;
drop policy if exists "fl_purchase_orders_all" on public.fl_purchase_orders;
create policy "fl_purchase_orders_all" on public.fl_purchase_orders for all using (true) with check (true);
drop trigger if exists fl_purchase_orders_updated_at on public.fl_purchase_orders;
create trigger fl_purchase_orders_updated_at before update on public.fl_purchase_orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_receptions
-- ============================================================
create table if not exists public.fl_receptions (
  id              text primary key,
  date            text not null,
  bon_achat_id    text,
  fournisseur_id  text,
  fournisseur_nom text,
  receptionnaire_id text,
  statut          text default 'en_cours',
  lignes          jsonb not null default '[]',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_receptions enable row level security;
drop policy if exists "fl_receptions_all" on public.fl_receptions;
create policy "fl_receptions_all" on public.fl_receptions for all using (true) with check (true);
drop trigger if exists fl_receptions_updated_at on public.fl_receptions;
create trigger fl_receptions_updated_at before update on public.fl_receptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_bons_preparation
-- ============================================================
create table if not exists public.fl_bons_preparation (
  id              text primary key,
  date            text not null,
  commande_id     text,
  preparateur_id  text,
  statut          text default 'en_attente',
  lignes          jsonb not null default '[]',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_bons_preparation enable row level security;
drop policy if exists "fl_bons_preparation_all" on public.fl_bons_preparation;
create policy "fl_bons_preparation_all" on public.fl_bons_preparation for all using (true) with check (true);
drop trigger if exists fl_bons_preparation_updated_at on public.fl_bons_preparation;
create trigger fl_bons_preparation_updated_at before update on public.fl_bons_preparation
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_transferts_stock
-- ============================================================
create table if not exists public.fl_transferts_stock (
  id              text primary key,
  date            text not null,
  article_id      text,
  article_nom     text,
  quantite        numeric not null,
  type            text not null,
  motif           text,
  user_id         text,
  created_at      timestamptz not null default now()
);
alter table public.fl_transferts_stock enable row level security;
drop policy if exists "fl_transferts_all" on public.fl_transferts_stock;
create policy "fl_transferts_all" on public.fl_transferts_stock for all using (true) with check (true);

-- ============================================================
-- fl_livreurs
-- ============================================================
create table if not exists public.fl_livreurs (
  id          text primary key,
  nom         text not null,
  telephone   text,
  vehicule    text,
  actif       boolean default true,
  created_at  timestamptz not null default now()
);
alter table public.fl_livreurs enable row level security;
drop policy if exists "fl_livreurs_all" on public.fl_livreurs;
create policy "fl_livreurs_all" on public.fl_livreurs for all using (true) with check (true);

-- ============================================================
-- fl_motifs_retour
-- ============================================================
create table if not exists public.fl_motifs_retour (
  id          text primary key,
  libelle     text not null,
  actif       boolean default true,
  created_at  timestamptz not null default now()
);
alter table public.fl_motifs_retour enable row level security;
drop policy if exists "fl_motifs_all" on public.fl_motifs_retour;
create policy "fl_motifs_all" on public.fl_motifs_retour for all using (true) with check (true);

-- ============================================================
-- fl_messages
-- ============================================================
create table if not exists public.fl_messages (
  id          text primary key,
  from_id     text,
  to_id       text,
  contenu     text not null,
  lu          boolean default false,
  created_at  timestamptz not null default now()
);
alter table public.fl_messages enable row level security;
drop policy if exists "fl_messages_all" on public.fl_messages;
create policy "fl_messages_all" on public.fl_messages for all using (true) with check (true);

-- ============================================================
-- fl_notices (annonces)
-- ============================================================
create table if not exists public.fl_notices (
  id          text primary key,
  titre       text not null,
  contenu     text not null,
  type        text default 'info',
  actif       boolean default true,
  created_at  timestamptz not null default now()
);
alter table public.fl_notices enable row level security;
drop policy if exists "fl_notices_all" on public.fl_notices;
create policy "fl_notices_all" on public.fl_notices for all using (true) with check (true);

-- ============================================================
-- fl_email_config
-- ============================================================
create table if not exists public.fl_email_config (
  id                    text primary key default 'singleton',
  achat                 text default 'appprojet2@gmail.com',
  commercial            text default 'appprojet2@gmail.com',
  recap                 text default 'appprojet2@gmail.com',
  besoin_achat          text default 'appprojet2@gmail.com',
  recap_heure           text default '18:00',
  recap_auto            boolean default false,
  besoin_auto           boolean default false,
  besoin_heure          text default '07:00',
  besoin_delai_minutes  integer default 0,
  besoin_push_auto      boolean default true,
  updated_at            timestamptz not null default now()
);
alter table public.fl_email_config enable row level security;
drop policy if exists "fl_email_config_all" on public.fl_email_config;
create policy "fl_email_config_all" on public.fl_email_config for all using (true) with check (true);
insert into public.fl_email_config (id) values ('singleton') on conflict (id) do nothing;

-- ============================================================
-- Indexes pour performances
-- ============================================================
create index if not exists fl_commandes_date_idx     on public.fl_commandes(date);
create index if not exists fl_commandes_statut_idx   on public.fl_commandes(statut);
create index if not exists fl_commandes_client_idx   on public.fl_commandes(client_id);
create index if not exists fl_bl_date_idx            on public.fl_bons_livraison(date);
create index if not exists fl_bl_livreur_idx         on public.fl_bons_livraison(livreur_id);
create index if not exists fl_clients_prevendeur_idx on public.fl_clients(prevendeur_id);
create index if not exists fl_users_role_idx         on public.fl_users(role);
create index if not exists fl_articles_famille_idx   on public.fl_articles(famille);

-- FIN DU SCRIPT
select 'Migration FreshLink Pro terminee avec succes!' as status;
