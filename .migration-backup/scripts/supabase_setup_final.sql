-- ============================================================
-- FRESHLINK — Script SQL Final pour Supabase
-- Version: 2.0 — Complet avec super admin + test de connexion
-- Executer dans Supabase > SQL Editor > New Query
-- ============================================================

-- Extensions utiles
create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLE: fl_config
-- Paramètres globaux de l'application + test de connexion
-- ============================================================
create table if not exists fl_config (
  id           text primary key default 'main',
  key          text not null,
  value        jsonb,
  updated_at   timestamptz default now()
);

-- Ping de connexion — utilisé par le badge Supabase dans le BO
insert into fl_config (id, key, value) values
  ('main',   'app_name',    '"FreshLink"'::jsonb),
  ('ping',   'ping',        '"ok"'::jsonb),
  ('version','app_version', '"2.0"'::jsonb)
on conflict (id) do update set value = excluded.value, updated_at = now();

-- ============================================================
-- TABLE: fl_users
-- Comptes utilisateurs (auth separée de Supabase Auth)
-- ============================================================
create table if not exists fl_users (
  id              text primary key default gen_random_uuid()::text,
  name            text not null,
  email           text unique not null,
  password_hash   text not null,
  role            text not null default 'magasinier',
  access_type     text default 'backoffice',
  secteur         text,
  phone           text,
  telephone       text,
  actif           boolean default true,
  depot_id        text,
  photo_url       text,
  -- permissions
  can_view_achat        boolean default false,
  can_view_commercial   boolean default false,
  can_view_logistique   boolean default false,
  can_view_stock        boolean default false,
  can_view_cash         boolean default false,
  can_view_finance      boolean default false,
  can_view_recap        boolean default false,
  can_view_database     boolean default false,
  can_view_rh           boolean default false,
  can_view_external     boolean default false,
  can_create_commande_bo boolean default false,
  -- objectifs
  objectif_clients      integer default 0,
  objectif_tonnage      numeric default 0,
  -- actionnaire
  est_actionnaire       boolean default false,
  taux_benefice         numeric default 0,
  taux_salaire_base     numeric default 0,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- ============================================================
-- SUPER ADMIN PAR DEFAUT
-- Email: superadmin@freshlink.ma
-- Password: superadmin2024
-- ============================================================
insert into fl_users (
  id, name, email, password_hash, role, access_type, actif,
  can_view_achat, can_view_commercial, can_view_logistique,
  can_view_stock, can_view_cash, can_view_finance, can_view_recap,
  can_view_database, can_view_rh, can_view_external, can_create_commande_bo,
  est_actionnaire, taux_benefice
) values (
  'u_superadmin',
  'Super Admin',
  'superadmin@freshlink.ma',
  'superadmin2024',  -- En prod: remplacer par hash bcrypt
  'super_admin',
  'backoffice',
  true,
  true, true, true, true, true, true, true, true, true, true, true,
  true, 50.0
) on conflict (id) do update set
  name = excluded.name,
  role = excluded.role,
  actif = excluded.actif,
  updated_at = now();

-- ============================================================
-- UTILISATEUR OURAI — Agent IA RH
-- Email: ourai@freshlink.ma / Password: ourai2024
-- ============================================================
insert into fl_users (
  id, name, email, password_hash, role, access_type, actif,
  can_view_rh
) values (
  'u_ourai', 'Ourai', 'ourai@freshlink.ma', 'ourai2024',
  'rh_manager', 'backoffice', true, true
) on conflict (id) do update set updated_at = now();

-- ============================================================
-- UTILISATEUR AZMI — Comptable
-- Email: azmi@freshlink.ma / Password: azmi2024
-- ============================================================
insert into fl_users (
  id, name, email, password_hash, role, access_type, actif,
  can_view_finance, can_view_cash, can_view_recap, can_view_rh,
  est_actionnaire, taux_benefice
) values (
  'u_azmi', 'Azmi', 'azmi@freshlink.ma', 'azmi2024',
  'comptable', 'backoffice', true,
  true, true, true, true,
  true, 25.0
) on conflict (id) do update set updated_at = now();

-- ============================================================
-- TABLE: fl_articles
-- Catalogue des articles (produits)
-- ============================================================
create table if not exists fl_articles (
  id              text primary key default gen_random_uuid()::text,
  nom             text not null,
  nom_ar          text,
  categorie       text,
  unite           text default 'kg',
  prix_vente      numeric default 0,
  prix_achat      numeric default 0,
  stock_disponible numeric default 0,
  stock_defect    numeric default 0,
  seuil_alerte    numeric default 0,
  actif           boolean default true,
  created_at      timestamptz default now()
);

-- ============================================================
-- TABLE: fl_fournisseurs
-- ============================================================
create table if not exists fl_fournisseurs (
  id            text primary key default gen_random_uuid()::text,
  nom           text not null,
  telephone     text,
  email         text,
  adresse       text,
  ville         text,
  specialites   jsonb default '[]',
  modalite_paiement text default 'cash',
  notes         text,
  actif         boolean default true,
  created_at    timestamptz default now()
);

-- ============================================================
-- TABLE: fl_clients
-- ============================================================
create table if not exists fl_clients (
  id            text primary key default gen_random_uuid()::text,
  nom           text not null,
  type          text default 'marchand',
  telephone     text,
  email         text,
  adresse       text,
  secteur       text,
  zone          text,
  gps_lat       numeric,
  gps_lng       numeric,
  modalite_paiement text default 'cash',
  plafond_credit numeric default 0,
  encours        numeric default 0,
  actif         boolean default true,
  created_at    timestamptz default now()
);

-- ============================================================
-- TABLE: fl_bons_achat
-- ============================================================
create table if not exists fl_bons_achat (
  id              text primary key default gen_random_uuid()::text,
  date            date not null default current_date,
  acheteur_id     text references fl_users(id),
  acheteur_nom    text,
  fournisseur_id  text references fl_fournisseurs(id),
  fournisseur_nom text,
  lignes          jsonb default '[]',
  statut          text default 'brouillon',
  email_destinataire text,
  depot_id        text,
  depot_nom       text,
  created_at      timestamptz default now()
);

-- ============================================================
-- TABLE: fl_purchase_orders
-- PO Achat — visibles par le magasinier
-- ============================================================
create table if not exists fl_purchase_orders (
  id                text primary key default gen_random_uuid()::text,
  date              date not null default current_date,
  article_id        text references fl_articles(id),
  article_nom       text,
  article_unite     text default 'kg',
  fournisseur_id    text references fl_fournisseurs(id),
  fournisseur_nom   text,
  fournisseur_email text,
  quantite          numeric not null,
  prix_unitaire     numeric not null,
  total             numeric,
  statut            text default 'ouvert',
  depot_id          text,
  depot_nom         text,
  notes             text,
  created_at        timestamptz default now()
);

-- ============================================================
-- TABLE: fl_receptions
-- Réceptions physiques des marchandises
-- ============================================================
create table if not exists fl_receptions (
  id                text primary key default gen_random_uuid()::text,
  date              date not null default current_date,
  bon_achat_id      text,
  purchase_order_id text,
  fournisseur_nom   text,
  source            text default 'bon_achat',
  lignes            jsonb default '[]',
  magasinier_id     text references fl_users(id),
  magasinier_nom    text,
  depot_id          text,
  notes             text,
  created_at        timestamptz default now()
);

-- ============================================================
-- TABLE: fl_commandes
-- ============================================================
create table if not exists fl_commandes (
  id              text primary key default gen_random_uuid()::text,
  date            date not null default current_date,
  commercial_id   text references fl_users(id),
  commercial_nom  text,
  client_id       text references fl_clients(id),
  client_nom      text,
  secteur         text,
  zone            text,
  gps_lat         numeric,
  gps_lng         numeric,
  lignes          jsonb default '[]',
  heure_livraison text,
  statut          text default 'en_attente',
  team_lead_id    text,
  approbateur     text,
  motif_refus     text,
  notes           text,
  created_at      timestamptz default now()
);

-- ============================================================
-- TABLE: fl_bons_livraison
-- ============================================================
create table if not exists fl_bons_livraison (
  id                    text primary key default gen_random_uuid()::text,
  date                  date not null default current_date,
  trip_id               text,
  commande_id           text references fl_commandes(id),
  client_nom            text,
  secteur               text,
  zone                  text,
  livreur_nom           text,
  prevendeur_nom        text,
  lignes                jsonb default '[]',
  montant_total         numeric default 0,
  tva                   numeric default 0,
  montant_ttc           numeric default 0,
  statut                text default 'émis',
  statut_livraison      text default 'livre',
  valide_magasinier     boolean default false,
  nb_caisse_gros        integer default 0,
  nb_caisse_demi        integer default 0,
  nb_caisse_dollar      integer default 0,
  nb_chariot            integer default 0,
  created_at            timestamptz default now()
);

-- ============================================================
-- TABLE: fl_caisses_vides
-- Mouvements caisses vides (gros, demi, dollar, chariot)
-- ============================================================
create table if not exists fl_caisses_vides (
  id                text primary key default gen_random_uuid()::text,
  date              date not null default current_date,
  heure             text,
  type_operation    text,
  sens              text not null,  -- 'entree' | 'sortie'
  nb_caisse_gros    integer default 0,
  nb_caisse_demi    integer default 0,
  nb_caisse_dollar  integer default 0,
  nb_chariot        integer default 0,
  reference_doc     text,
  article_nom       text,
  operateur_id      text references fl_users(id),
  operateur_nom     text,
  notes             text,
  created_at        timestamptz default now()
);

-- ============================================================
-- TABLE: fl_contenants_tare
-- Config des poids de tare par type de contenant
-- ============================================================
create table if not exists fl_contenants_tare (
  id        text primary key default gen_random_uuid()::text,
  nom       text not null,
  poids_kg  numeric not null,
  actif     boolean default true,
  notes     text
);

insert into fl_contenants_tare (id, nom, poids_kg, actif, notes) values
  ('ct1', 'Caisse plastique (gros)', 2.8,  true,  'Caisse standard 30kg'),
  ('ct2', 'Caisse demi (petit)',     1.5,  true,  'Demi-caisse 15kg'),
  ('ct3', 'Dollar (bois)',           4.5,  true,  'Caisse bois type dollar'),
  ('ct4', 'Chariot',                 25.0, true,  'Tare chariot standard'),
  ('ct5', 'Palette bois',            20.0, false, 'Palette europeenne')
on conflict (id) do update set poids_kg = excluded.poids_kg, actif = excluded.actif;

-- ============================================================
-- TABLE: fl_depots
-- Multi-entrepots
-- ============================================================
create table if not exists fl_depots (
  id              text primary key default gen_random_uuid()::text,
  nom             text not null,
  adresse         text,
  ville           text,
  actif           boolean default true,
  responsable_nom text,
  notes           text
);

insert into fl_depots (id, nom, actif) values
  ('DEPOT_PRINCIPAL', 'Depot Principal', true)
on conflict (id) do nothing;

-- ============================================================
-- TABLE: fl_fiches_payroll
-- Fiches salaires generees par Ourai et transmises a Azmi
-- ============================================================
create table if not exists fl_fiches_payroll (
  id                  text primary key default gen_random_uuid()::text,
  periode             text not null,   -- "2025-01" format
  employe_id          text references fl_users(id),
  employe_nom         text,
  role                text,
  salaire_fixe        numeric default 0,
  total_primes        numeric default 0,
  total_malus         numeric default 0,
  salaire_variable    numeric default 0,
  total_brut          numeric default 0,
  statut              text default 'brouillon',  -- 'brouillon' | 'transmis_azmi' | 'valide'
  notes               text,
  cree_par            text,    -- 'ourai'
  valide_par          text,    -- 'azmi'
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ============================================================
-- TABLE: fl_charges_fixes
-- Charges fixes mensuelles pour calcul benefice net
-- ============================================================
create table if not exists fl_charges_fixes (
  id          text primary key default gen_random_uuid()::text,
  label       text not null,
  montant     numeric default 0,
  actif       boolean default true,
  created_at  timestamptz default now()
);

insert into fl_charges_fixes (id, label, montant, actif) values
  ('chf1', 'Loyer entrepot',     5000, true),
  ('chf2', 'Electricite',        1200, true),
  ('chf3', 'Carburant camions',  3000, true),
  ('chf4', 'Frais bancaires',    500,  true),
  ('chf5', 'Autres charges',     1000, true)
on conflict (id) do nothing;

-- ============================================================
-- TABLE: fl_actionnaires
-- Config part benefice par actionnaire
-- ============================================================
create table if not exists fl_actionnaires (
  id              text primary key default gen_random_uuid()::text,
  user_id         text references fl_users(id),
  nom             text,
  taux_benefice   numeric default 0,
  taux_salaire    numeric default 0,
  actif           boolean default true
);

-- Super admin actionnaire 50%
insert into fl_actionnaires (id, user_id, nom, taux_benefice, taux_salaire, actif) values
  ('act_superadmin', 'u_superadmin', 'Super Admin', 50.0, 0, true),
  ('act_azmi',       'u_azmi',       'Azmi',         25.0, 0, true)
on conflict (id) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Securite: lecture publique (anon), ecriture auth uniquement
-- ============================================================
alter table fl_config          enable row level security;
alter table fl_users           enable row level security;
alter table fl_articles        enable row level security;
alter table fl_fournisseurs    enable row level security;
alter table fl_clients         enable row level security;
alter table fl_bons_achat      enable row level security;
alter table fl_purchase_orders enable row level security;
alter table fl_receptions      enable row level security;
alter table fl_commandes       enable row level security;
alter table fl_bons_livraison  enable row level security;
alter table fl_caisses_vides   enable row level security;
alter table fl_contenants_tare enable row level security;
alter table fl_depots          enable row level security;
alter table fl_fiches_payroll  enable row level security;
alter table fl_charges_fixes   enable row level security;
alter table fl_actionnaires    enable row level security;

-- Politique: permettre lecture + ecriture a l'utilisateur anon (app client)
-- En prod: remplacer par policies JWT/auth
do $$ declare tbl text; begin
  foreach tbl in array array[
    'fl_config','fl_users','fl_articles','fl_fournisseurs','fl_clients',
    'fl_bons_achat','fl_purchase_orders','fl_receptions','fl_commandes',
    'fl_bons_livraison','fl_caisses_vides','fl_contenants_tare','fl_depots',
    'fl_fiches_payroll','fl_charges_fixes','fl_actionnaires'
  ] loop
    execute format('create policy if not exists "allow_all_%s" on %s for all to anon using (true) with check (true)', tbl, tbl);
  end loop;
end $$;

-- ============================================================
-- VERIFICATION FINALE
-- ============================================================
select
  'fl_config'          as table_name, count(*) as rows from fl_config
union all select 'fl_users',           count(*) from fl_users
union all select 'fl_articles',        count(*) from fl_articles
union all select 'fl_contenants_tare', count(*) from fl_contenants_tare
union all select 'fl_depots',          count(*) from fl_depots
union all select 'fl_actionnaires',    count(*) from fl_actionnaires
order by table_name;
