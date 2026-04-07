-- =============================================================
-- FRESHLINK — SUPABASE COMPLETE SETUP SCRIPT
-- Version finale — à coller directement dans Supabase SQL Editor
-- =============================================================
-- ORDRE D'EXECUTION : copier tout ce fichier dans l'éditeur SQL
-- de votre projet Supabase puis cliquer sur "Run"
-- =============================================================


-- ─────────────────────────────────────────────────────────────
-- 0. EXTENSIONS
-- ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ─────────────────────────────────────────────────────────────
-- 1. CONFIG GLOBALE (vérification connexion)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_config (
  id          text primary key default 'singleton',
  app_name    text not null default 'FreshLink',
  version     text not null default '1.0.0',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

insert into fl_config (id, app_name, version)
values ('singleton', 'FreshLink', '1.0.0')
on conflict (id) do update set updated_at = now();


-- ─────────────────────────────────────────────────────────────
-- 2. UTILISATEURS (fl_users)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_users (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  email           text unique not null,
  password_hash   text not null,               -- bcrypt hash
  role            text not null,
  access_type     text default 'backoffice',   -- mobile | backoffice | both
  secteur         text,
  phone           text,
  depot_id        uuid,
  actif           boolean default true,

  -- Permissions BO
  can_view_achat          boolean default false,
  can_view_commercial     boolean default false,
  can_view_logistique     boolean default false,
  can_view_stock          boolean default false,
  can_view_cash           boolean default false,
  can_view_finance        boolean default false,
  can_view_recap          boolean default false,
  can_view_database       boolean default false,
  can_view_rh             boolean default false,
  can_view_external       boolean default false,
  can_create_commande_bo  boolean default false,

  -- Actionnaire
  est_actionnaire         boolean default false,
  taux_participation      numeric(5,2) default 0,  -- % bénéfices
  taux_salaire_bonus      numeric(5,2) default 0,  -- % bonus sur salaire

  -- Objectifs prevendeur
  objectif_clients        numeric default 0,
  objectif_tonnage        numeric default 0,
  objectif_ca_journalier  numeric default 0,
  objectif_ca_hebdo       numeric default 0,
  objectif_ca_mensuel     numeric default 0,

  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Index
create index if not exists idx_fl_users_email on fl_users(email);
create index if not exists idx_fl_users_role  on fl_users(role);

-- ── Comptes par défaut ──────────────────────────────────────
-- Mot de passe par défaut : superadmin2024
-- Hash généré avec bcrypt rounds=10
insert into fl_users (id, name, email, password_hash, role, access_type, actif,
  can_view_achat, can_view_commercial, can_view_logistique, can_view_stock,
  can_view_cash, can_view_finance, can_view_recap, can_view_database, can_view_rh,
  can_view_external, can_create_commande_bo)
values
  -- SUPER ADMIN
  (uuid_generate_v4(), 'Super Admin', 'superadmin@freshlink.ma',
   crypt('superadmin2024', gen_salt('bf', 10)),
   'super_admin', 'backoffice', true,
   true, true, true, true, true, true, true, true, true, true, true),

  -- OURAI (RH Manager)
  (uuid_generate_v4(), 'Ourai', 'ourai@freshlink.ma',
   crypt('ourai2024', gen_salt('bf', 10)),
   'rh_manager', 'backoffice', true,
   false, false, false, false, false, false, false, false, true, false, false),

  -- AZMI (Comptable)
  (uuid_generate_v4(), 'Azmi', 'azmi@freshlink.ma',
   crypt('azmi2024', gen_salt('bf', 10)),
   'comptable', 'backoffice', true,
   false, false, false, false, true, true, true, false, true, false, false),

  -- HICHAM (Admin)
  (uuid_generate_v4(), 'Hicham', 'hicham@freshlink.ma',
   crypt('hicham2024', gen_salt('bf', 10)),
   'admin', 'backoffice', true,
   true, true, true, true, true, true, true, true, false, true, true)

on conflict (email) do nothing;


-- ─────────────────────────────────────────────────────────────
-- 3. DÉPÔTS (fl_depots)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_depots (
  id          uuid primary key default uuid_generate_v4(),
  nom         text not null,
  adresse     text,
  actif       boolean default true,
  created_at  timestamptz default now()
);

insert into fl_depots (nom, adresse, actif) values
  ('Depot Principal', 'Casablanca — Principale', true),
  ('Depot Secondaire', 'Casablanca — Secondaire', true)
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────
-- 4. ARTICLES (fl_articles)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_articles (
  id              uuid primary key default uuid_generate_v4(),
  nom             text not null,
  nom_ar          text,
  famille         text,
  unite           text default 'kg',
  prix_achat      numeric(10,2) default 0,
  prix_vente      numeric(10,2) default 0,
  stock_actuel    numeric(10,2) default 0,
  stock_min       numeric(10,2) default 0,
  actif           boolean default true,
  image_url       text,
  depot_id        uuid references fl_depots(id) on delete set null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_fl_articles_famille on fl_articles(famille);
create index if not exists idx_fl_articles_actif   on fl_articles(actif);


-- ─────────────────────────────────────────────────────────────
-- 5. CLIENTS (fl_clients)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_clients (
  id              uuid primary key default uuid_generate_v4(),
  nom             text not null,
  telephone       text,
  adresse         text,
  ville           text,
  secteur         text,
  type_client     text default 'standard',
  solde_credit    numeric(10,2) default 0,
  actif           boolean default true,
  created_at      timestamptz default now()
);

create index if not exists idx_fl_clients_secteur on fl_clients(secteur);


-- ─────────────────────────────────────────────────────────────
-- 6. FOURNISSEURS (fl_fournisseurs)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_fournisseurs (
  id              uuid primary key default uuid_generate_v4(),
  nom             text not null,
  telephone       text,
  adresse         text,
  ville           text,
  solde_credit    numeric(10,2) default 0,
  actif           boolean default true,
  created_at      timestamptz default now()
);


-- ─────────────────────────────────────────────────────────────
-- 7. COMMANDES CLIENTS (fl_commandes)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_commandes (
  id              uuid primary key default uuid_generate_v4(),
  client_id       uuid references fl_clients(id) on delete restrict,
  client_nom      text not null,
  prevendeur_id   uuid references fl_users(id) on delete set null,
  prevendeur_nom  text,
  secteur         text,
  date            date not null default current_date,
  statut          text default 'en_attente',  -- en_attente | validee | en_preparation | livree | annulee
  montant_total   numeric(10,2) default 0,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists fl_commande_lignes (
  id            uuid primary key default uuid_generate_v4(),
  commande_id   uuid not null references fl_commandes(id) on delete cascade,
  article_id    uuid references fl_articles(id) on delete restrict,
  article_nom   text not null,
  unite         text default 'kg',
  quantite      numeric(10,2) not null,
  prix_unitaire numeric(10,2) not null,
  total         numeric(10,2) generated always as (quantite * prix_unitaire) stored
);

create index if not exists idx_fl_commandes_date    on fl_commandes(date);
create index if not exists idx_fl_commandes_statut  on fl_commandes(statut);
create index if not exists idx_fl_commandes_client  on fl_commandes(client_id);


-- ─────────────────────────────────────────────────────────────
-- 8. BONS D'ACHAT (fl_bons_achat)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_bons_achat (
  id              uuid primary key default uuid_generate_v4(),
  fournisseur_id  uuid references fl_fournisseurs(id) on delete restrict,
  fournisseur_nom text not null,
  acheteur_id     uuid references fl_users(id) on delete set null,
  acheteur_nom    text,
  date            date not null default current_date,
  statut          text default 'brouillon',   -- brouillon | valide | receptionne | annule
  cut_off_ok      boolean default false,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists fl_bon_achat_lignes (
  id            uuid primary key default uuid_generate_v4(),
  bon_achat_id  uuid not null references fl_bons_achat(id) on delete cascade,
  article_id    uuid references fl_articles(id) on delete restrict,
  article_nom   text not null,
  unite         text default 'kg',
  quantite      numeric(10,2) not null,
  prix_achat    numeric(10,2) not null,
  total         numeric(10,2) generated always as (quantite * prix_achat) stored
);

create index if not exists idx_fl_bons_achat_date   on fl_bons_achat(date);
create index if not exists idx_fl_bons_achat_statut on fl_bons_achat(statut);


-- ─────────────────────────────────────────────────────────────
-- 9. PURCHASE ORDERS (fl_purchase_orders)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_purchase_orders (
  id              uuid primary key default uuid_generate_v4(),
  fournisseur_id  uuid references fl_fournisseurs(id) on delete restrict,
  fournisseur_nom text not null,
  article_id      uuid references fl_articles(id) on delete restrict,
  article_nom     text not null,
  article_unite   text default 'kg',
  quantite        numeric(10,2) not null,
  prix_unitaire   numeric(10,2) not null,
  total           numeric(10,2) generated always as (quantite * prix_unitaire) stored,
  date            date not null default current_date,
  date_livraison  date,
  statut          text default 'ouvert',       -- ouvert | envoye | receptionne | annule
  acheteur_id     uuid references fl_users(id) on delete set null,
  notes           text,
  created_at      timestamptz default now()
);


-- ─────────────────────────────────────────────────────────────
-- 10. RÉCEPTIONS (fl_receptions)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_receptions (
  id              uuid primary key default uuid_generate_v4(),
  bon_achat_id    uuid references fl_bons_achat(id) on delete set null,
  po_id           uuid references fl_purchase_orders(id) on delete set null,
  magasinier_id   uuid references fl_users(id) on delete set null,
  magasinier_nom  text,
  date            date not null default current_date,
  statut          text default 'en_attente',   -- en_attente | partielle | complete
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists fl_reception_lignes (
  id              uuid primary key default uuid_generate_v4(),
  reception_id    uuid not null references fl_receptions(id) on delete cascade,
  article_id      uuid references fl_articles(id) on delete restrict,
  article_nom     text not null,
  unite           text default 'kg',
  qte_attendue    numeric(10,2) default 0,
  qte_recue_brut  numeric(10,2) default 0,
  -- Tares
  nb_caisse_gros  integer default 0,
  nb_caisse_demi  integer default 0,
  nb_dolly        integer default 0,
  nb_chariot      integer default 0,
  tare_totale_kg  numeric(10,2) default 0,
  qte_recue_net   numeric(10,2) default 0,     -- brut - tare
  prix_achat      numeric(10,2) default 0,
  motif_ecart     text
);

create index if not exists idx_fl_receptions_date on fl_receptions(date);


-- ─────────────────────────────────────────────────────────────
-- 11. BONS DE LIVRAISON (fl_bons_livraison)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_bons_livraison (
  id              uuid primary key default uuid_generate_v4(),
  commande_id     uuid references fl_commandes(id) on delete restrict,
  livreur_id      uuid references fl_users(id) on delete set null,
  livreur_nom     text,
  client_id       uuid references fl_clients(id) on delete restrict,
  client_nom      text not null,
  date            date not null default current_date,
  statut          text default 'prepare',      -- prepare | en_route | livre | retour | valide
  montant_total   numeric(10,2) default 0,
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists fl_bl_lignes (
  id            uuid primary key default uuid_generate_v4(),
  bl_id         uuid not null references fl_bons_livraison(id) on delete cascade,
  article_id    uuid references fl_articles(id) on delete restrict,
  article_nom   text not null,
  unite         text default 'kg',
  quantite      numeric(10,2) not null,
  prix_unitaire numeric(10,2) not null,
  total         numeric(10,2) generated always as (quantite * prix_unitaire) stored
);

create index if not exists idx_fl_bls_date   on fl_bons_livraison(date);
create index if not exists idx_fl_bls_statut on fl_bons_livraison(statut);


-- ─────────────────────────────────────────────────────────────
-- 12. RETOURS (fl_retours)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_retours (
  id              uuid primary key default uuid_generate_v4(),
  bl_id           uuid references fl_bons_livraison(id) on delete set null,
  client_id       uuid references fl_clients(id) on delete restrict,
  client_nom      text not null,
  date            date not null default current_date,
  motif           text,
  montant_total   numeric(10,2) default 0,
  statut          text default 'en_attente',
  created_at      timestamptz default now()
);

create table if not exists fl_retour_lignes (
  id            uuid primary key default uuid_generate_v4(),
  retour_id     uuid not null references fl_retours(id) on delete cascade,
  article_id    uuid references fl_articles(id) on delete restrict,
  article_nom   text not null,
  unite         text default 'kg',
  quantite      numeric(10,2) not null,
  prix_unitaire numeric(10,2) default 0
);


-- ─────────────────────────────────────────────────────────────
-- 13. STOCK MOUVEMENTS (fl_stock_mouvements)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_stock_mouvements (
  id              uuid primary key default uuid_generate_v4(),
  article_id      uuid references fl_articles(id) on delete restrict,
  article_nom     text not null,
  depot_id        uuid references fl_depots(id) on delete set null,
  type_mouvement  text not null,               -- reception | vente | retour | ajustement | transfert
  sens            text not null,               -- entree | sortie
  quantite        numeric(10,2) not null,
  reference_doc   text,
  operateur_id    uuid references fl_users(id) on delete set null,
  operateur_nom   text,
  date            date not null default current_date,
  notes           text,
  created_at      timestamptz default now()
);

create index if not exists idx_fl_stock_mv_article on fl_stock_mouvements(article_id);
create index if not exists idx_fl_stock_mv_date    on fl_stock_mouvements(date);


-- ─────────────────────────────────────────────────────────────
-- 14. CAISSES VIDES (fl_caisses_vides + mouvements)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_caisses_vides (
  id              uuid primary key default uuid_generate_v4(),
  type            text not null unique,        -- gros | demi | dolly | chariot
  nom             text not null,
  stock           integer default 0,
  en_circulation  integer default 0,
  seuil_alerte    integer default 10
);

insert into fl_caisses_vides (type, nom, stock, en_circulation) values
  ('gros',    'Caisse plastique gros',  0, 0),
  ('demi',    'Caisse demi (petit)',    0, 0),
  ('dolly',   'Dolly (bois)',           0, 0),
  ('chariot', 'Chariot',               0, 0)
on conflict (type) do nothing;

create table if not exists fl_caisses_mouvements (
  id              uuid primary key default uuid_generate_v4(),
  date            date not null default current_date,
  heure           text,
  type_operation  text not null,
  sens            text not null,               -- entree | sortie
  nb_caisse_gros  integer default 0,
  nb_caisse_demi  integer default 0,
  nb_dolly        integer default 0,
  nb_chariot      integer default 0,
  reference_doc   text,
  article_nom     text,
  operateur_id    uuid references fl_users(id) on delete set null,
  operateur_nom   text,
  notes           text,
  created_at      timestamptz default now()
);


-- ─────────────────────────────────────────────────────────────
-- 15. CONTENANTS / TARES (fl_contenants_tare)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_contenants_tare (
  id          text primary key,
  nom         text not null,
  poids_kg    numeric(6,2) not null,
  actif       boolean default true,
  notes       text
);

insert into fl_contenants_tare (id, nom, poids_kg, actif, notes) values
  ('ct1', 'Caisse plastique (gros)', 2.8,  true,  'Caisse standard 30kg'),
  ('ct2', 'Caisse demi (petit)',     1.5,  true,  'Demi-caisse 15kg'),
  ('ct3', 'Dolly (bois)',            4.5,  true,  'Caisse bois type dolly'),
  ('ct4', 'Chariot',                25.0, true,  'Tare chariot standard'),
  ('ct5', 'Palette bois',           20.0, false, 'Palette europeenne')
on conflict (id) do nothing;


-- ─────────────────────────────────────────────────────────────
-- 16. CASH / TRANSACTIONS (fl_cash)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_cash (
  id              uuid primary key default uuid_generate_v4(),
  date            date not null default current_date,
  type            text not null,               -- encaissement | decaissement | avance | remboursement
  montant         numeric(10,2) not null,
  client_id       uuid references fl_clients(id) on delete set null,
  client_nom      text,
  reference_doc   text,
  cash_man_id     uuid references fl_users(id) on delete set null,
  cash_man_nom    text,
  notes           text,
  created_at      timestamptz default now()
);

create index if not exists idx_fl_cash_date on fl_cash(date);


-- ─────────────────────────────────────────────────────────────
-- 17. RH — RÈGLES SALAIRES (fl_rh_regles)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_rh_regles (
  id              uuid primary key default uuid_generate_v4(),
  groupe          text not null,               -- prevendeur | logistique | achat | admin
  label           text not null,
  type            text not null,               -- fixe | bonus | malus
  valeur          numeric(10,2) not null,
  unite           text default 'DH',           -- DH | DH/T | DH/visite | % | DH/client
  condition       text,                        -- ex: "tonnage > 10"
  actif           boolean default true,
  modifiable_sa   boolean default true,        -- modifiable par super_admin seulement
  created_at      timestamptz default now()
);

insert into fl_rh_regles (groupe, label, type, valeur, unite) values
  ('prevendeur', 'Salaire fixe prevendeur',    'fixe',  3000, 'DH'),
  ('prevendeur', 'Prime par tonne vendue',     'bonus',   50, 'DH/T'),
  ('prevendeur', 'Prime par visite client',    'bonus',    5, 'DH/visite'),
  ('prevendeur', 'Prime nouveau client',       'bonus',  100, 'DH/client'),
  ('prevendeur', 'Malus par retour',           'malus',   20, 'DH/retour'),
  ('logistique', 'Salaire fixe logistique',    'fixe',  3000, 'DH'),
  ('logistique', 'Prime delai livraison',      'bonus',  200, 'DH'),
  ('logistique', 'Prime fiabilite stock',      'bonus',  150, 'DH'),
  ('logistique', 'Malus retard livraison',     'malus',  100, 'DH'),
  ('achat',      'Salaire fixe achat',         'fixe',  3500, 'DH'),
  ('achat',      'Prime respect cut-off',      'bonus',  300, 'DH'),
  ('achat',      'Prime 0 retour qualite',     'bonus',  200, 'DH'),
  ('achat',      'Malus retour qualite',       'malus',  150, 'DH')
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────
-- 18. RH — FICHES PAIE (fl_rh_fiches)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_rh_fiches (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid references fl_users(id) on delete restrict,
  user_nom            text not null,
  periode             text not null,           -- ex: "2025-01"
  salaire_fixe        numeric(10,2) default 0,
  total_bonus         numeric(10,2) default 0,
  total_malus         numeric(10,2) default 0,
  salaire_net         numeric(10,2) generated always as
                        (salaire_fixe + total_bonus - total_malus) stored,
  statut              text default 'brouillon', -- brouillon | valide_rh | valide_compta | paye
  transmis_azmi       boolean default false,
  transmis_at         timestamptz,
  notes_rh            text,
  notes_compta        text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table if not exists fl_rh_fiche_lignes (
  id            uuid primary key default uuid_generate_v4(),
  fiche_id      uuid not null references fl_rh_fiches(id) on delete cascade,
  type          text not null,                 -- fixe | bonus | malus
  label         text not null,
  montant       numeric(10,2) not null,
  regles_id     uuid references fl_rh_regles(id) on delete set null
);


-- ─────────────────────────────────────────────────────────────
-- 19. COMPTABILITE — CHARGES FIXES (fl_compta_charges)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_compta_charges (
  id          uuid primary key default uuid_generate_v4(),
  label       text not null,
  montant     numeric(10,2) not null,
  frequence   text default 'mensuel',          -- mensuel | annuel | ponctuel
  actif       boolean default true,
  created_at  timestamptz default now()
);

insert into fl_compta_charges (label, montant, frequence) values
  ('Loyer entrepot',        5000, 'mensuel'),
  ('Electricite + Eau',     1500, 'mensuel'),
  ('Carburant flotte',      3000, 'mensuel'),
  ('Assurances',            2000, 'mensuel'),
  ('Frais bancaires',        500, 'mensuel'),
  ('Maintenance vehicules', 1000, 'mensuel')
on conflict do nothing;


-- ─────────────────────────────────────────────────────────────
-- 20. COMPTABILITE — PÉRIODES (fl_compta_periodes)
-- ─────────────────────────────────────────────────────────────
create table if not exists fl_compta_periodes (
  id                    uuid primary key default uuid_generate_v4(),
  periode               text not null unique,  -- ex: "2025-01"
  ca_total              numeric(12,2) default 0,
  cout_achat_total      numeric(12,2) default 0,
  charges_fixes_total   numeric(12,2) default 0,
  masse_salariale       numeric(12,2) default 0,
  benefice_brut         numeric(12,2) generated always as
                          (ca_total - cout_achat_total) stored,
  benefice_net          numeric(12,2) generated always as
                          (ca_total - cout_achat_total - charges_fixes_total - masse_salariale) stored,
  statut                text default 'ouvert', -- ouvert | cloture
  created_at            timestamptz default now()
);


-- ─────────────────────────────────────────────────────────────
-- 21. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────

-- Activer RLS sur toutes les tables sensibles
alter table fl_users              enable row level security;
alter table fl_commandes          enable row level security;
alter table fl_bons_achat         enable row level security;
alter table fl_receptions         enable row level security;
alter table fl_bons_livraison     enable row level security;
alter table fl_cash               enable row level security;
alter table fl_rh_fiches          enable row level security;
alter table fl_compta_periodes    enable row level security;

-- Politique : accès complet pour service_role (backend / migrations)
-- Les autres tables utilisent la clé anon avec des politiques ouvertes
-- (à restreindre selon vos besoins en production)

create policy "service_role_all_users"
  on fl_users for all
  to service_role using (true) with check (true);

create policy "anon_select_users"
  on fl_users for select
  to anon using (actif = true);

create policy "service_role_all_commandes"
  on fl_commandes for all
  to service_role using (true) with check (true);

create policy "anon_select_commandes"
  on fl_commandes for select
  to anon using (true);

create policy "service_role_all_bons_achat"
  on fl_bons_achat for all
  to service_role using (true) with check (true);

create policy "anon_select_bons_achat"
  on fl_bons_achat for select
  to anon using (true);

create policy "service_role_all_receptions"
  on fl_receptions for all
  to service_role using (true) with check (true);

create policy "anon_select_receptions"
  on fl_receptions for select
  to anon using (true);

create policy "service_role_all_bls"
  on fl_bons_livraison for all
  to service_role using (true) with check (true);

create policy "anon_select_bls"
  on fl_bons_livraison for select
  to anon using (true);

create policy "service_role_all_cash"
  on fl_cash for all
  to service_role using (true) with check (true);

create policy "anon_select_cash"
  on fl_cash for select
  to anon using (true);

create policy "service_role_all_rh"
  on fl_rh_fiches for all
  to service_role using (true) with check (true);

create policy "service_role_all_compta"
  on fl_compta_periodes for all
  to service_role using (true) with check (true);


-- ─────────────────────────────────────────────────────────────
-- 22. VÉRIFICATION FINALE
-- ─────────────────────────────────────────────────────────────
-- Exécuter cette requête pour vérifier que tout est OK :
select
  (select count(*) from fl_config)           as "✓ config",
  (select count(*) from fl_users)            as "✓ users",
  (select count(*) from fl_depots)           as "✓ depots",
  (select count(*) from fl_contenants_tare)  as "✓ contenants",
  (select count(*) from fl_rh_regles)        as "✓ rh_regles",
  (select count(*) from fl_compta_charges)   as "✓ charges",
  (select count(*) from fl_caisses_vides)    as "✓ caisses_vides";

-- Si toutes les colonnes affichent un nombre >= 1, la base est opérationnelle.
-- Le super admin peut se connecter avec : superadmin@freshlink.ma / superadmin2024
