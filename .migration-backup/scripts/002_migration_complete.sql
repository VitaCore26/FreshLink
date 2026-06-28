-- ============================================================
-- FreshLink Pro — Migration complète Supabase
-- Script 002 : Toutes les tables, RLS, index
-- Exécuter dans l'éditeur SQL Supabase (une seule fois)
-- ============================================================

-- ── EXTENSIONS ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── USERS (profils applicatifs — séparé de auth.users) ───────
create table if not exists public.fl_users (
  id            text primary key,
  name          text not null,
  email         text not null unique,
  password_hash text not null default '',  -- bcrypt si auth custom, vide si Supabase Auth
  role          text not null default 'prevendeur',
  access_type   text,
  secteur       text,
  phone         text,
  telephone     text,
  actif         boolean not null default true,
  photo_url     text,
  -- permissions
  can_view_achat      boolean default false,
  can_view_commercial boolean default false,
  can_view_logistique boolean default false,
  can_view_stock      boolean default false,
  can_view_cash       boolean default false,
  can_view_finance    boolean default false,
  can_view_recap      boolean default false,
  can_view_database   boolean default false,
  -- objectifs prevendeur
  objectif_clients          integer,
  objectif_tonnage          numeric,
  objectif_journalier_ca    numeric,
  objectif_hebdomadaire_ca  numeric,
  objectif_mensuel_ca       numeric,
  objectif_journalier_clients  integer,
  objectif_hebdomadaire_clients integer,
  objectif_mensuel_clients  integer,
  -- notifications
  notif_achat       boolean default false,
  notif_commercial  boolean default false,
  notif_livraison   boolean default false,
  notif_recap       boolean default false,
  notif_besoin_achat boolean default false,
  -- portal linking
  fournisseur_id  text,
  client_id       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_users enable row level security;
create policy "fl_users_all" on public.fl_users for all using (true) with check (true);
create index if not exists fl_users_role_idx on public.fl_users(role);
create index if not exists fl_users_email_idx on public.fl_users(email);

-- ── CLIENTS ───────────────────────────────────────────────────
-- (déjà existante en script 001, on ajoute les champs manquants)
alter table public.clients add column if not exists prevendeur_id text;
alter table public.clients add column if not exists team_lead_id  text;
alter table public.clients add column if not exists telephone     text;
alter table public.clients add column if not exists modalite_paiement text;
alter table public.clients add column if not exists plafond_credit    numeric;
create index if not exists clients_secteur_idx    on public.clients(secteur);
create index if not exists clients_prevendeur_idx on public.clients(prevendeur_id);

-- ── ARTICLES ──────────────────────────────────────────────────
create table if not exists public.fl_articles (
  id                text primary key,
  nom               text not null,
  nom_ar            text not null default '',
  famille           text not null default '',
  unite             text not null default 'kg',
  um                text,              -- libelle UM ex: Caisse
  colisage_par_um   numeric,           -- kg par UM
  stock_disponible  numeric not null default 0,
  stock_defect      numeric not null default 0,
  prix_achat        numeric not null default 0,
  pv_methode        text not null default 'pourcentage',
  pv_valeur         numeric not null default 0,
  photo             text,
  historique_prix_achat jsonb default '[]'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.fl_articles enable row level security;
create policy "fl_articles_all" on public.fl_articles for all using (true) with check (true);
create index if not exists fl_articles_famille_idx on public.fl_articles(famille);

-- ── FOURNISSEURS ──────────────────────────────────────────────
create table if not exists public.fl_fournisseurs (
  id                text primary key,
  nom               text not null,
  contact           text not null default '',
  telephone         text,
  email             text not null default '',
  adresse           text,
  ville             text,
  region            text,
  specialites       jsonb default '[]'::jsonb,
  modalite_paiement text,
  delai_paiement    integer,
  ice               text,
  rc                text,
  notes             text,
  itineraires       jsonb default '[]'::jsonb,
  created_at        timestamptz not null default now()
);
alter table public.fl_fournisseurs enable row level security;
create policy "fl_fournisseurs_all" on public.fl_fournisseurs for all using (true) with check (true);

-- ── LIVREURS ──────────────────────────────────────────────────
create table if not exists public.fl_livreurs (
  id                text primary key,
  type              text not null default 'interne',
  nom               text not null,
  prenom            text not null default '',
  telephone         text not null default '',
  cin               text,
  type_vehicule     text,
  marque_vehicule   text,
  matricule         text,
  capacite_caisses  integer,
  capacite_tonnage  numeric,
  societe           text,
  notes             text,
  actif             boolean not null default true,
  created_at        timestamptz not null default now()
);
alter table public.fl_livreurs enable row level security;
create policy "fl_livreurs_all" on public.fl_livreurs for all using (true) with check (true);

-- ── MOTIFS RETOUR ─────────────────────────────────────────────
create table if not exists public.fl_motifs_retour (
  id        text primary key,
  label     text not null,
  label_ar  text not null default '',
  actif     boolean not null default true
);
alter table public.fl_motifs_retour enable row level security;
create policy "fl_motifs_retour_all" on public.fl_motifs_retour for all using (true) with check (true);

-- ── COMMANDES ─────────────────────────────────────────────────
create table if not exists public.fl_commandes (
  id                  text primary key,
  date                text not null,
  commercial_id       text not null,
  commercial_nom      text not null,
  client_id           text not null,
  client_nom          text not null,
  secteur             text not null default '',
  zone                text not null default '',
  gps_lat             double precision default 0,
  gps_lng             double precision default 0,
  lignes              jsonb not null default '[]'::jsonb,
  heure_livraison     text not null default '',
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
create policy "fl_commandes_all" on public.fl_commandes for all using (true) with check (true);
create index if not exists fl_commandes_date_idx         on public.fl_commandes(date);
create index if not exists fl_commandes_commercial_idx   on public.fl_commandes(commercial_id);
create index if not exists fl_commandes_client_idx       on public.fl_commandes(client_id);
create index if not exists fl_commandes_statut_idx       on public.fl_commandes(statut);

-- ── VISITES PREVENDEUR ────────────────────────────────────────
create table if not exists public.fl_visites (
  id              text primary key,
  date            text not null,
  prevendeur_id   text not null,
  prevendeur_nom  text not null,
  client_id       text not null,
  client_nom      text not null,
  commande_id     text,
  resultat        text not null default 'sans_commande',
  raison_sans_commande text,
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.fl_visites enable row level security;
create policy "fl_visites_all" on public.fl_visites for all using (true) with check (true);
create index if not exists fl_visites_date_idx        on public.fl_visites(date);
create index if not exists fl_visites_prevendeur_idx  on public.fl_visites(prevendeur_id);

-- ── BONS D'ACHAT ──────────────────────────────────────────────
create table if not exists public.fl_bons_achat (
  id                  text primary key,
  date                text not null,
  acheteur_id         text not null,
  acheteur_nom        text not null,
  fournisseur_id      text not null,
  fournisseur_nom     text not null,
  lignes              jsonb not null default '[]'::jsonb,
  statut              text not null default 'brouillon',
  email_destinataire  text not null default '',
  created_at          timestamptz not null default now()
);
alter table public.fl_bons_achat enable row level security;
create policy "fl_bons_achat_all" on public.fl_bons_achat for all using (true) with check (true);
create index if not exists fl_bons_achat_date_idx on public.fl_bons_achat(date);

-- ── PURCHASE ORDERS ───────────────────────────────────────────
create table if not exists public.fl_purchase_orders (
  id                text primary key,
  date              text not null,
  article_id        text not null,
  article_nom       text not null,
  article_unite     text not null,
  fournisseur_id    text not null,
  fournisseur_nom   text not null,
  fournisseur_email text not null default '',
  quantite          numeric not null default 0,
  prix_unitaire     numeric not null default 0,
  total             numeric not null default 0,
  statut            text not null default 'ouvert',
  notes             text not null default '',
  created_by        text not null,
  commande_qty      numeric,
  stock_qty         numeric,
  retour_qty        numeric,
  created_at        timestamptz not null default now()
);
alter table public.fl_purchase_orders enable row level security;
create policy "fl_purchase_orders_all" on public.fl_purchase_orders for all using (true) with check (true);
create index if not exists fl_purchase_orders_date_idx on public.fl_purchase_orders(date);

-- ── RECEPTIONS ────────────────────────────────────────────────
create table if not exists public.fl_receptions (
  id                  text primary key,
  date                text not null,
  bon_achat_id        text not null default '',
  purchase_order_id   text,
  fournisseur_nom     text,
  source              text not null default 'manuel',
  lignes              jsonb not null default '[]'::jsonb,
  statut              text not null default 'en_attente',
  operateur_id        text not null,
  notes               text,
  created_at          timestamptz not null default now()
);
alter table public.fl_receptions enable row level security;
create policy "fl_receptions_all" on public.fl_receptions for all using (true) with check (true);

-- ── TRIPS ─────────────────────────────────────────────────────
create table if not exists public.fl_trips (
  id              text primary key,  -- T001, T002…
  date            text not null,
  livreur_id      text not null,
  livreur_nom     text not null,
  vehicule        text not null default '',
  commande_ids    jsonb not null default '[]'::jsonb,
  statut          text not null default 'planifié',
  itineraire      jsonb not null default '[]'::jsonb,
  sequence_mode   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_trips enable row level security;
create policy "fl_trips_all" on public.fl_trips for all using (true) with check (true);
create index if not exists fl_trips_date_idx     on public.fl_trips(date);
create index if not exists fl_trips_statut_idx   on public.fl_trips(statut);

-- ── BONS DE LIVRAISON ─────────────────────────────────────────
create table if not exists public.fl_bons_livraison (
  id                    text primary key,  -- BL-260324-001
  date                  text not null,
  trip_id               text not null,
  commande_id           text not null,
  client_nom            text not null,
  secteur               text not null default '',
  zone                  text not null default '',
  livreur_nom           text not null,
  prevendeur_nom        text not null,
  lignes                jsonb not null default '[]'::jsonb,
  montant_total         numeric not null default 0,
  tva                   numeric not null default 0,
  montant_ttc           numeric not null default 0,
  statut                text not null default 'émis',
  statut_livraison      text not null default 'livre',
  motif_retour          text,
  valide_magasinier     boolean default false,
  heure_livraison_reelle text,
  nb_colis              integer,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
alter table public.fl_bons_livraison enable row level security;
create policy "fl_bons_livraison_all" on public.fl_bons_livraison for all using (true) with check (true);
create index if not exists fl_bons_livraison_date_idx    on public.fl_bons_livraison(date);
create index if not exists fl_bons_livraison_trip_idx    on public.fl_bons_livraison(trip_id);
create index if not exists fl_bons_livraison_commande_idx on public.fl_bons_livraison(commande_id);

-- ── RETOURS ───────────────────────────────────────────────────
create table if not exists public.fl_retours (
  id              text primary key,
  date            text not null,
  trip_id         text not null,
  livreur_nom     text not null,
  lignes          jsonb not null default '[]'::jsonb,
  statut          text not null default 'en_attente',
  valide_par      text,
  date_validation text,
  created_at      timestamptz not null default now()
);
alter table public.fl_retours enable row level security;
create policy "fl_retours_all" on public.fl_retours for all using (true) with check (true);
create index if not exists fl_retours_date_idx on public.fl_retours(date);

-- ── BONS DE PRÉPARATION ───────────────────────────────────────
create table if not exists public.fl_bons_preparation (
  id              text primary key,
  nom             text not null,
  date            text not null,
  mode            text not null default 'par_trip',
  type            text not null default 'cross_dock',
  format          text not null default 'papier',
  trip_id         text,
  client_ids      jsonb not null default '[]'::jsonb,
  clients_info    jsonb default '[]'::jsonb,
  sequence_mode   text,
  lignes          jsonb not null default '[]'::jsonb,
  statut          text not null default 'brouillon',
  created_by      text not null,
  validated_at    text,
  validated_by    text,
  created_at      timestamptz not null default now()
);
alter table public.fl_bons_preparation enable row level security;
create policy "fl_bons_preparation_all" on public.fl_bons_preparation for all using (true) with check (true);

-- ── TRANSFERTS STOCK ──────────────────────────────────────────
create table if not exists public.fl_transferts_stock (
  id          text primary key,
  date        text not null,
  article_id  text not null,
  article_nom text not null,
  quantite    numeric not null,
  sens        text not null,
  motif       text not null,
  operateur_id text not null,
  created_at  timestamptz not null default now()
);
alter table public.fl_transferts_stock enable row level security;
create policy "fl_transferts_stock_all" on public.fl_transferts_stock for all using (true) with check (true);

-- ── FINANCE — CHARGES ─────────────────────────────────────────
create table if not exists public.fl_charges (
  id          text primary key,
  date        text not null,
  libelle     text not null,
  categorie   text not null,
  montant     numeric not null,
  recurrente  boolean not null default false,
  created_by  text not null,
  created_at  timestamptz not null default now()
);
alter table public.fl_charges enable row level security;
create policy "fl_charges_all" on public.fl_charges for all using (true) with check (true);

-- ── FINANCE — CAISSE ──────────────────────────────────────────
create table if not exists public.fl_caisse_entries (
  id          text primary key,
  date        text not null,
  libelle     text not null,
  type        text not null,
  categorie   text not null,
  montant     numeric not null,
  reference   text,
  created_by  text not null,
  created_at  timestamptz not null default now()
);
alter table public.fl_caisse_entries enable row level security;
create policy "fl_caisse_all" on public.fl_caisse_entries for all using (true) with check (true);
create index if not exists fl_caisse_date_idx on public.fl_caisse_entries(date);

-- ── FINANCE — ACTIONNAIRES ────────────────────────────────────
create table if not exists public.fl_actionnaires (
  id                    text primary key,
  nom                   text not null,
  prenom                text not null,
  telephone             text,
  cotisation            numeric not null default 0,
  date_entree           text not null,
  periode_distribution  text not null default 'mensuel',
  actif                 boolean not null default true
);
alter table public.fl_actionnaires enable row level security;
create policy "fl_actionnaires_all" on public.fl_actionnaires for all using (true) with check (true);

-- ── FINANCE — SALARIES ────────────────────────────────────────
create table if not exists public.fl_salaries (
  id              text primary key,
  nom             text not null,
  prenom          text not null,
  poste           text not null,
  telephone       text,
  cin             text,
  cnss            text,
  date_embauche   text not null,
  type_contrat    text not null default 'cdi',
  salaire_brut    numeric not null default 0,
  avances         numeric not null default 0,
  statut          text not null default 'actif',
  notes           text
);
alter table public.fl_salaries enable row level security;
create policy "fl_salaries_all" on public.fl_salaries for all using (true) with check (true);

-- ── MESSAGES (WhatsApp / chat interne) ───────────────────────
create table if not exists public.fl_messages (
  id          text primary key,
  sender_id   text not null,
  sender_name text not null,
  role        text not null,
  text        text not null,
  created_at  timestamptz not null default now()
);
alter table public.fl_messages enable row level security;
create policy "fl_messages_all" on public.fl_messages for all using (true) with check (true);
create index if not exists fl_messages_created_idx on public.fl_messages(created_at desc);

-- ── NOTICES / RÉCLAMATIONS ────────────────────────────────────
create table if not exists public.fl_notices (
  id            text primary key,
  titre         text not null,
  contenu       text not null,
  auteur_id     text not null,
  auteur_nom    text not null,
  date          text not null,
  type          text not null default 'notice',
  statut        text not null default 'ouvert',
  destinataire  text not null default '',
  created_at    timestamptz not null default now()
);
alter table public.fl_notices enable row level security;
create policy "fl_notices_all" on public.fl_notices for all using (true) with check (true);

-- ── CAISSES VIDES ─────────────────────────────────────────────
create table if not exists public.fl_caisses_vides (
  id                text primary key,
  type              text not null,
  libelle           text not null,
  capacite_kg       numeric not null,
  capacite_unites   integer,
  stock             integer not null default 0,
  en_circulation    integer not null default 0,
  prix_unitaire     numeric,
  notes             text
);
alter table public.fl_caisses_vides enable row level security;
create policy "fl_caisses_vides_all" on public.fl_caisses_vides for all using (true) with check (true);

-- ── COMPANY CONFIG (single row) ───────────────────────────────
create table if not exists public.fl_company_config (
  id                  integer primary key default 1,
  nom                 text not null default 'FreshLink Pro',
  adresse             text not null default '',
  ville               text not null default '',
  pays                text not null default 'Maroc',
  telephone           text not null default '',
  email               text not null default '',
  site_web            text,
  ice                 text,
  rc                  text,
  if_fiscal           text,
  tp                  text,
  cnss                text,
  logo                text,
  couleur_entete      text,
  mentions_bl         text,
  mentions_facture    text,
  updated_at          timestamptz not null default now(),
  constraint fl_company_config_single check (id = 1)
);
alter table public.fl_company_config enable row level security;
create policy "fl_company_config_all" on public.fl_company_config for all using (true) with check (true);

-- ── WORKFLOW CONFIG (single row) ─────────────────────────────
create table if not exists public.fl_workflow_config (
  id                    integer primary key default 1,
  validation_commande   text not null default 'direct',
  constraint fl_workflow_config_single check (id = 1)
);
alter table public.fl_workflow_config enable row level security;
create policy "fl_workflow_config_all" on public.fl_workflow_config for all using (true) with check (true);

-- ── updated_at auto-trigger (shared function) ─────────────────
create or replace function public.fl_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply trigger to tables that have updated_at
do $$
declare t text;
begin
  foreach t in array array[
    'fl_users','fl_articles','fl_commandes','fl_trips','fl_bons_livraison'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.fl_set_updated_at();',
      t, t
    );
  end loop;
end;
$$;
