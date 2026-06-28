-- ============================================================
-- FreshLink Pro — Schema complet v3
-- Toutes les tables, RLS open (petite équipe), index, triggers
-- Exécuter UNE SEULE FOIS dans Supabase SQL Editor
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm"; -- pour recherche full-text rapide

-- ── Trigger updated_at helper ─────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============================================================
-- TABLE: fl_users  (profils applicatifs)
-- ============================================================
create table if not exists public.fl_users (
  id                            text primary key,
  name                          text not null,
  email                         text not null,
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
create index if not exists fl_users_role_idx  on public.fl_users(role);
create index if not exists fl_users_email_idx on public.fl_users(email);
drop trigger if exists fl_users_updated_at on public.fl_users;
create trigger fl_users_updated_at before update on public.fl_users
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_clients
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
  gps_lat             numeric,
  gps_lng             numeric,
  telephone           text,
  email               text,
  adresse             text,
  ice                 text,
  notes               text,
  prevendeur_id       text,
  team_lead_id        text,
  created_by          text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_clients enable row level security;
drop policy if exists "fl_clients_all" on public.fl_clients;
create policy "fl_clients_all" on public.fl_clients for all using (true) with check (true);
create index if not exists fl_clients_secteur_idx     on public.fl_clients(secteur);
create index if not exists fl_clients_prevendeur_idx  on public.fl_clients(prevendeur_id);
create index if not exists fl_clients_nom_trgm        on public.fl_clients using gin(nom gin_trgm_ops);
drop trigger if exists fl_clients_updated_at on public.fl_clients;
create trigger fl_clients_updated_at before update on public.fl_clients
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_articles
-- ============================================================
create table if not exists public.fl_articles (
  id                  text primary key,
  nom                 text not null,
  nom_ar              text not null default '',
  famille             text not null default '',
  unite               text not null default 'kg',
  um                  text,
  colisage_par_um     numeric,
  stock_disponible    numeric not null default 0,
  stock_defect        numeric not null default 0,
  prix_achat          numeric not null default 0,
  pv_methode          text not null default 'pourcentage',
  pv_valeur           numeric not null default 20,
  marge_methode       text,
  historique_pa       jsonb default '[]',
  photo               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_articles enable row level security;
drop policy if exists "fl_articles_all" on public.fl_articles;
create policy "fl_articles_all" on public.fl_articles for all using (true) with check (true);
create index if not exists fl_articles_famille_idx on public.fl_articles(famille);
create index if not exists fl_articles_nom_trgm    on public.fl_articles using gin(nom gin_trgm_ops);
drop trigger if exists fl_articles_updated_at on public.fl_articles;
create trigger fl_articles_updated_at before update on public.fl_articles
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_fournisseurs
-- ============================================================
create table if not exists public.fl_fournisseurs (
  id                  text primary key,
  nom                 text not null,
  contact             text not null default '',
  telephone           text,
  email               text not null default '',
  adresse             text,
  ville               text,
  region              text,
  specialites         jsonb default '[]',
  modalite_paiement   text,
  delai_paiement      integer,
  ice                 text,
  rc                  text,
  notes               text,
  itineraires         jsonb default '[]',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_fournisseurs enable row level security;
drop policy if exists "fl_fournisseurs_all" on public.fl_fournisseurs;
create policy "fl_fournisseurs_all" on public.fl_fournisseurs for all using (true) with check (true);
drop trigger if exists fl_fournisseurs_updated_at on public.fl_fournisseurs;
create trigger fl_fournisseurs_updated_at before update on public.fl_fournisseurs
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_livreurs
-- ============================================================
create table if not exists public.fl_livreurs (
  id                  text primary key,
  type                text not null default 'interne',
  nom                 text not null,
  prenom              text not null default '',
  telephone           text not null default '',
  cin                 text,
  photo_cin           text,
  photo_perso         text,
  type_vehicule       text,
  marque_vehicule     text,
  matricule           text,
  capacite_caisses    integer,
  capacite_tonnage    numeric,
  photo_cart_grise    text,
  photo_permis        text,
  societe             text,
  notes               text,
  actif               boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_livreurs enable row level security;
drop policy if exists "fl_livreurs_all" on public.fl_livreurs;
create policy "fl_livreurs_all" on public.fl_livreurs for all using (true) with check (true);
drop trigger if exists fl_livreurs_updated_at on public.fl_livreurs;
create trigger fl_livreurs_updated_at before update on public.fl_livreurs
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_motifs_retour
-- ============================================================
create table if not exists public.fl_motifs_retour (
  id        text primary key,
  label     text not null,
  label_ar  text not null default '',
  actif     boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.fl_motifs_retour enable row level security;
drop policy if exists "fl_motifs_retour_all" on public.fl_motifs_retour;
create policy "fl_motifs_retour_all" on public.fl_motifs_retour for all using (true) with check (true);

-- ============================================================
-- TABLE: fl_commandes
-- ============================================================
create table if not exists public.fl_commandes (
  id                  text primary key,
  date                text not null,
  commercial_id       text not null,
  commercial_nom      text not null default '',
  client_id           text not null,
  client_nom          text not null default '',
  secteur             text not null default '',
  zone                text not null default '',
  gps_lat             numeric default 0,
  gps_lng             numeric default 0,
  lignes              jsonb not null default '[]',
  heurelivraison      text not null default '',
  statut              text not null default 'en_attente',
  email_destinataire  text not null default '',
  team_lead_id        text,
  team_lead_nom       text,
  approbateur         text,
  approbateur_id      text,
  date_approbation    text,
  motif_refus         text,
  commentaire         text,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_commandes enable row level security;
drop policy if exists "fl_commandes_all" on public.fl_commandes;
create policy "fl_commandes_all" on public.fl_commandes for all using (true) with check (true);
create index if not exists fl_commandes_date_idx         on public.fl_commandes(date);
create index if not exists fl_commandes_commercial_idx   on public.fl_commandes(commercial_id);
create index if not exists fl_commandes_client_idx       on public.fl_commandes(client_id);
create index if not exists fl_commandes_statut_idx       on public.fl_commandes(statut);
drop trigger if exists fl_commandes_updated_at on public.fl_commandes;
create trigger fl_commandes_updated_at before update on public.fl_commandes
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_visites
-- ============================================================
create table if not exists public.fl_visites (
  id              text primary key,
  date            text not null,
  prevendeur_id   text not null,
  prevendeur_nom  text not null default '',
  client_id       text not null,
  client_nom      text not null default '',
  commande_id     text,
  resultat        text not null default 'commande',
  raison_sans_commande text,
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.fl_visites enable row level security;
drop policy if exists "fl_visites_all" on public.fl_visites;
create policy "fl_visites_all" on public.fl_visites for all using (true) with check (true);
create index if not exists fl_visites_date_idx        on public.fl_visites(date);
create index if not exists fl_visites_prevendeur_idx  on public.fl_visites(prevendeur_id);

-- ============================================================
-- TABLE: fl_bons_achat
-- ============================================================
create table if not exists public.fl_bons_achat (
  id                  text primary key,
  date                text not null,
  acheteur_id         text not null,
  acheteur_nom        text not null default '',
  fournisseur_id      text not null,
  fournisseur_nom     text not null default '',
  lignes              jsonb not null default '[]',
  statut              text not null default 'brouillon',
  email_destinataire  text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_bons_achat enable row level security;
drop policy if exists "fl_bons_achat_all" on public.fl_bons_achat;
create policy "fl_bons_achat_all" on public.fl_bons_achat for all using (true) with check (true);
create index if not exists fl_bons_achat_date_idx on public.fl_bons_achat(date);
drop trigger if exists fl_bons_achat_updated_at on public.fl_bons_achat;
create trigger fl_bons_achat_updated_at before update on public.fl_bons_achat
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_purchase_orders
-- ============================================================
create table if not exists public.fl_purchase_orders (
  id                text primary key,
  date              text not null,
  article_id        text not null,
  article_nom       text not null default '',
  article_unite     text not null default 'kg',
  fournisseur_id    text not null,
  fournisseur_nom   text not null default '',
  fournisseur_email text not null default '',
  quantite          numeric not null default 0,
  prix_unitaire     numeric not null default 0,
  total             numeric not null default 0,
  statut            text not null default 'ouvert',
  notes             text default '',
  created_by        text not null default '',
  commande_qty      numeric,
  stock_qty         numeric,
  retour_qty        numeric,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.fl_purchase_orders enable row level security;
drop policy if exists "fl_purchase_orders_all" on public.fl_purchase_orders;
create policy "fl_purchase_orders_all" on public.fl_purchase_orders for all using (true) with check (true);
create index if not exists fl_po_date_idx on public.fl_purchase_orders(date);
drop trigger if exists fl_purchase_orders_updated_at on public.fl_purchase_orders;
create trigger fl_purchase_orders_updated_at before update on public.fl_purchase_orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_receptions
-- ============================================================
create table if not exists public.fl_receptions (
  id                  text primary key,
  date                text not null,
  bon_achat_id        text not null default '',
  purchase_order_id   text,
  fournisseur_nom     text,
  source              text not null default 'manuel',
  lignes              jsonb not null default '[]',
  statut              text not null default 'en_attente',
  operateur_id        text not null,
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
alter table public.fl_receptions enable row level security;
drop policy if exists "fl_receptions_all" on public.fl_receptions;
create policy "fl_receptions_all" on public.fl_receptions for all using (true) with check (true);
create index if not exists fl_receptions_date_idx on public.fl_receptions(date);
drop trigger if exists fl_receptions_updated_at on public.fl_receptions;
create trigger fl_receptions_updated_at before update on public.fl_receptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_trips
-- ============================================================
create table if not exists public.fl_trips (
  id              text primary key,
  date            text not null,
  livreur_id      text not null,
  livreur_nom     text not null default '',
  vehicule        text not null default '',
  commande_ids    jsonb not null default '[]',
  statut          text not null default 'planifié',
  itineraire      jsonb not null default '[]',
  sequence_mode   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_trips enable row level security;
drop policy if exists "fl_trips_all" on public.fl_trips;
create policy "fl_trips_all" on public.fl_trips for all using (true) with check (true);
create index if not exists fl_trips_date_idx     on public.fl_trips(date);
create index if not exists fl_trips_livreur_idx  on public.fl_trips(livreur_id);
drop trigger if exists fl_trips_updated_at on public.fl_trips;
create trigger fl_trips_updated_at before update on public.fl_trips
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_bons_livraison
-- ============================================================
create table if not exists public.fl_bons_livraison (
  id                    text primary key,
  date                  text not null,
  trip_id               text not null,
  commande_id           text not null,
  client_nom            text not null default '',
  secteur               text not null default '',
  zone                  text not null default '',
  livreur_nom           text not null default '',
  prevendeur_nom        text not null default '',
  lignes                jsonb not null default '[]',
  montant_total         numeric not null default 0,
  tva                   numeric not null default 0,
  montant_ttc           numeric not null default 0,
  statut                text not null default 'émis',
  statut_livraison      text not null default 'livre',
  motif_retour          text,
  valide_magasinier     boolean default false,
  heure_livraison_reelle text,
  heure_effective       text,
  nb_colis              integer,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.fl_bons_livraison enable row level security;
drop policy if exists "fl_bons_livraison_all" on public.fl_bons_livraison;
create policy "fl_bons_livraison_all" on public.fl_bons_livraison for all using (true) with check (true);
create index if not exists fl_bl_date_idx        on public.fl_bons_livraison(date);
create index if not exists fl_bl_trip_idx        on public.fl_bons_livraison(trip_id);
create index if not exists fl_bl_commande_idx    on public.fl_bons_livraison(commande_id);
drop trigger if exists fl_bl_updated_at on public.fl_bons_livraison;
create trigger fl_bl_updated_at before update on public.fl_bons_livraison
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_retours
-- ============================================================
create table if not exists public.fl_retours (
  id               text primary key,
  date             text not null,
  trip_id          text not null,
  livreur_nom      text not null default '',
  lignes           jsonb not null default '[]',
  statut           text not null default 'en_attente',
  valide_par       text,
  date_validation  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.fl_retours enable row level security;
drop policy if exists "fl_retours_all" on public.fl_retours;
create policy "fl_retours_all" on public.fl_retours for all using (true) with check (true);
create index if not exists fl_retours_date_idx    on public.fl_retours(date);
create index if not exists fl_retours_trip_idx    on public.fl_retours(trip_id);
drop trigger if exists fl_retours_updated_at on public.fl_retours;
create trigger fl_retours_updated_at before update on public.fl_retours
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_bons_preparation
-- ============================================================
create table if not exists public.fl_bons_preparation (
  id             text primary key,
  nom            text not null,
  date           text not null,
  mode           text not null default 'par_trip',
  type           text not null default 'cross_dock',
  format         text not null default 'papier',
  trip_id        text,
  client_ids     jsonb not null default '[]',
  clients_info   jsonb default '[]',
  sequence_mode  text,
  lignes         jsonb not null default '[]',
  statut         text not null default 'brouillon',
  created_by     text not null,
  validated_at   text,
  validated_by   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.fl_bons_preparation enable row level security;
drop policy if exists "fl_bons_preparation_all" on public.fl_bons_preparation;
create policy "fl_bons_preparation_all" on public.fl_bons_preparation for all using (true) with check (true);
create index if not exists fl_bons_prep_date_idx on public.fl_bons_preparation(date);
drop trigger if exists fl_bons_prep_updated_at on public.fl_bons_preparation;
create trigger fl_bons_prep_updated_at before update on public.fl_bons_preparation
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_transferts_stock
-- ============================================================
create table if not exists public.fl_transferts_stock (
  id           text primary key,
  date         text not null,
  article_id   text not null,
  article_nom  text not null default '',
  quantite     numeric not null default 0,
  sens         text not null,
  motif        text not null default '',
  operateur_id text not null,
  created_at   timestamptz not null default now()
);
alter table public.fl_transferts_stock enable row level security;
drop policy if exists "fl_transferts_all" on public.fl_transferts_stock;
create policy "fl_transferts_all" on public.fl_transferts_stock for all using (true) with check (true);
create index if not exists fl_transferts_date_idx on public.fl_transferts_stock(date);

-- ============================================================
-- TABLE: fl_charges (finance)
-- ============================================================
create table if not exists public.fl_charges (
  id           text primary key,
  date         text not null,
  categorie    text not null,
  libelle      text not null,
  montant      numeric not null default 0,
  mode_paiement text,
  justificatif text,
  saisi_par    text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.fl_charges enable row level security;
drop policy if exists "fl_charges_all" on public.fl_charges;
create policy "fl_charges_all" on public.fl_charges for all using (true) with check (true);
create index if not exists fl_charges_date_idx on public.fl_charges(date);
drop trigger if exists fl_charges_updated_at on public.fl_charges;
create trigger fl_charges_updated_at before update on public.fl_charges
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_caisse_entries (cash)
-- ============================================================
create table if not exists public.fl_caisse_entries (
  id             text primary key,
  date           text not null,
  type           text not null,
  montant        numeric not null default 0,
  reference      text,
  client_nom     text,
  bl_id          text,
  notes          text,
  saisi_par      text,
  valide_par     text,
  date_validation text,
  statut         text not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.fl_caisse_entries enable row level security;
drop policy if exists "fl_caisse_all" on public.fl_caisse_entries;
create policy "fl_caisse_all" on public.fl_caisse_entries for all using (true) with check (true);
create index if not exists fl_caisse_date_idx on public.fl_caisse_entries(date);
drop trigger if exists fl_caisse_updated_at on public.fl_caisse_entries;
create trigger fl_caisse_updated_at before update on public.fl_caisse_entries
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_actionnaires
-- ============================================================
create table if not exists public.fl_actionnaires (
  id           text primary key,
  nom          text not null,
  prenom       text not null,
  telephone    text,
  cotisation   numeric not null default 0,
  date_entree  text not null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.fl_actionnaires enable row level security;
drop policy if exists "fl_actionnaires_all" on public.fl_actionnaires;
create policy "fl_actionnaires_all" on public.fl_actionnaires for all using (true) with check (true);
drop trigger if exists fl_actionnaires_updated_at on public.fl_actionnaires;
create trigger fl_actionnaires_updated_at before update on public.fl_actionnaires
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_salaries
-- ============================================================
create table if not exists public.fl_salaries (
  id           text primary key,
  user_id      text,
  nom          text not null,
  poste        text not null default '',
  salaire_base numeric not null default 0,
  date_entree  text not null,
  actif        boolean not null default true,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.fl_salaries enable row level security;
drop policy if exists "fl_salaries_all" on public.fl_salaries;
create policy "fl_salaries_all" on public.fl_salaries for all using (true) with check (true);
drop trigger if exists fl_salaries_updated_at on public.fl_salaries;
create trigger fl_salaries_updated_at before update on public.fl_salaries
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_messages (WhatsApp/internal chat)
-- ============================================================
create table if not exists public.fl_messages (
  id          text primary key,
  sender_id   text not null,
  sender_name text not null,
  role        text not null,
  text        text not null,
  created_at  timestamptz not null default now()
);
alter table public.fl_messages enable row level security;
drop policy if exists "fl_messages_all" on public.fl_messages;
create policy "fl_messages_all" on public.fl_messages for all using (true) with check (true);
create index if not exists fl_messages_created_idx on public.fl_messages(created_at desc);

-- ============================================================
-- TABLE: fl_notices
-- ============================================================
create table if not exists public.fl_notices (
  id           text primary key,
  titre        text not null,
  contenu      text not null,
  auteur_id    text not null,
  auteur_nom   text not null,
  date         text not null,
  type         text not null default 'notice',
  statut       text not null default 'ouvert',
  destinataire text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.fl_notices enable row level security;
drop policy if exists "fl_notices_all" on public.fl_notices;
create policy "fl_notices_all" on public.fl_notices for all using (true) with check (true);
drop trigger if exists fl_notices_updated_at on public.fl_notices;
create trigger fl_notices_updated_at before update on public.fl_notices
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_caisses_vides
-- ============================================================
create table if not exists public.fl_caisses_vides (
  id              text primary key,
  type            text not null,
  libelle         text not null,
  capacite_kg     numeric not null default 0,
  capacite_unites integer,
  stock           integer not null default 0,
  en_circulation  integer not null default 0,
  prix_unitaire   numeric,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_caisses_vides enable row level security;
drop policy if exists "fl_caisses_vides_all" on public.fl_caisses_vides;
create policy "fl_caisses_vides_all" on public.fl_caisses_vides for all using (true) with check (true);
drop trigger if exists fl_caisses_vides_updated_at on public.fl_caisses_vides;
create trigger fl_caisses_vides_updated_at before update on public.fl_caisses_vides
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_company_config
-- ============================================================
create table if not exists public.fl_company_config (
  id              text primary key default 'singleton',
  nom             text,
  logo            text,
  adresse         text,
  telephone       text,
  email           text,
  ice             text,
  rc              text,
  taux_tva        numeric default 20,
  devise          text default 'DH',
  updated_at      timestamptz not null default now()
);
alter table public.fl_company_config enable row level security;
drop policy if exists "fl_config_all" on public.fl_company_config;
create policy "fl_config_all" on public.fl_company_config for all using (true) with check (true);
drop trigger if exists fl_config_updated_at on public.fl_company_config;
create trigger fl_config_updated_at before update on public.fl_company_config
  for each row execute function public.set_updated_at();

-- ============================================================
-- TABLE: fl_workflow_config
-- ============================================================
create table if not exists public.fl_workflow_config (
  id              text primary key default 'singleton',
  validation_mode text not null default 'direct',
  updated_at      timestamptz not null default now()
);
alter table public.fl_workflow_config enable row level security;
drop policy if exists "fl_workflow_all" on public.fl_workflow_config;
create policy "fl_workflow_all" on public.fl_workflow_config for all using (true) with check (true);

-- ============================================================
-- Default data: motifs retour
-- ============================================================
insert into public.fl_motifs_retour (id, label, label_ar, actif)
values
  ('motif-1', 'Qualité insuffisante', 'جودة غير كافية', true),
  ('motif-2', 'Surplus / Trop commandé', 'فائض / طلب زائد', true),
  ('motif-3', 'Client absent', 'الزبون غائب', true),
  ('motif-4', 'Problème de prix', 'مشكلة في السعر', true),
  ('motif-5', 'Erreur de livraison', 'خطأ في التسليم', true),
  ('motif-6', 'Produit non conforme', 'المنتج غير مطابق', true)
on conflict (id) do nothing;

-- ============================================================
-- Default workflow config
-- ============================================================
insert into public.fl_workflow_config (id, validation_mode)
values ('singleton', 'direct')
on conflict (id) do nothing;

-- ============================================================
-- Default company config
-- ============================================================
insert into public.fl_company_config (id)
values ('singleton')
on conflict (id) do nothing;

-- Done
select 'FreshLink Pro schema v3 — OK' as status;
