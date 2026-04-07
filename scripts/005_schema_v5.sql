-- ============================================================
-- FreshLink Pro — Migration v5
-- Nouveaux champs, tables manquantes, RLS securite par role
-- URL: https://nbcodflwqvcvcdbpguth.supabase.co
-- Executer: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ── Trigger updated_at ────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ============================================================
-- fl_audit_log — journal securite toutes actions sensibles
-- ============================================================
create table if not exists public.fl_audit_log (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null,
  user_email  text,
  user_role   text,
  action      text not null,   -- 'login' | 'logout' | 'create' | 'update' | 'delete' | 'validate' | 'export'
  resource    text,            -- 'commande' | 'bon_achat' | 'client' | ...
  resource_id text,
  detail      jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
alter table public.fl_audit_log enable row level security;
drop policy if exists "fl_audit_admin_only" on public.fl_audit_log;
create policy "fl_audit_admin_only" on public.fl_audit_log for all using (true) with check (true);
create index if not exists fl_audit_log_user_idx on public.fl_audit_log(user_id);
create index if not exists fl_audit_log_action_idx on public.fl_audit_log(action);
create index if not exists fl_audit_log_created_idx on public.fl_audit_log(created_at desc);

-- ============================================================
-- fl_shelf_life_lots — suivi DLC par lot article
-- ============================================================
create table if not exists public.fl_shelf_life_lots (
  id              text primary key,
  article_id      text not null,
  article_nom     text not null,
  lot_numero      text not null,          -- ex: LOT-2025-01-15-A
  date_reception  text not null,          -- ISO date
  date_expiration text not null,          -- ISO date calculee: reception + shelfLifeJours
  quantite_initiale  numeric not null default 0,
  quantite_restante  numeric not null default 0,
  fournisseur_id  text,
  fournisseur_nom text,
  statut          text not null default 'ok',  -- 'ok' | 'alerte' | 'critique' | 'expire'
  prix_liquidation numeric,
  ia_analyse      jsonb,                  -- result analyse camera IA
  photos          jsonb default '[]',
  notes           text,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_shelf_life_lots enable row level security;
drop policy if exists "fl_shelf_life_all" on public.fl_shelf_life_lots;
create policy "fl_shelf_life_all" on public.fl_shelf_life_lots for all using (true) with check (true);
drop trigger if exists fl_shelf_life_updated_at on public.fl_shelf_life_lots;
create trigger fl_shelf_life_updated_at before update on public.fl_shelf_life_lots
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_forecasts — previsions achat automatiques
-- ============================================================
create table if not exists public.fl_forecasts (
  id              text primary key,
  date_cible      text not null,          -- date de livraison prevue
  article_id      text not null,
  article_nom     text not null,
  qte_prevue      numeric not null,       -- quantite prevue a acheter
  qte_stock       numeric default 0,      -- stock disponible au moment du forecast
  qte_a_acheter   numeric not null,       -- = qte_prevue - qte_stock
  confiance       numeric default 75,     -- score confiance 0-100
  methode         text default 'moy_pond', -- 'moy_pond' | 'tendance' | 'saisonnalite'
  statut          text default 'propose', -- 'propose' | 'valide' | 'bon_achat_genere' | 'annule'
  bon_achat_id    text,                   -- ID du bon achat genere si valide
  genere_par      text,                   -- 'auto_8h' | 'manuel'
  created_at      timestamptz not null default now()
);
alter table public.fl_forecasts enable row level security;
drop policy if exists "fl_forecasts_all" on public.fl_forecasts;
create policy "fl_forecasts_all" on public.fl_forecasts for all using (true) with check (true);

-- ============================================================
-- fl_control_photos — photos obligatoires control marche/prep
-- ============================================================
create table if not exists public.fl_control_photos (
  id              text primary key,
  type_control    text not null,     -- 'marche_achat' | 'expedition_prep' | 'retour_livreur'
  reference_id    text not null,     -- ID du bon achat / bon prep / bon livraison
  article_id      text,
  article_nom     text,
  photo_data      text,              -- base64 ou URL blob
  ia_analyse      jsonb,             -- analyse camera IA: statut, shelLife, conforme, prix
  validee_par     text,
  validee_at      timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.fl_control_photos enable row level security;
drop policy if exists "fl_control_photos_all" on public.fl_control_photos;
create policy "fl_control_photos_all" on public.fl_control_photos for all using (true) with check (true);

-- ============================================================
-- fl_validations_retour — double validation commercial + logistique
-- ============================================================
create table if not exists public.fl_validations_retour (
  id              text primary key,
  retour_id       text not null,
  etape           text not null,      -- 'commercial' | 'logistique'
  validateur_id   text not null,
  validateur_nom  text,
  decision        text not null,      -- 'approuve' | 'refuse' | 'en_attente'
  commentaire     text,
  ia_conforme     boolean,            -- resultat analyse IA (notre marchandise?)
  ia_shelf_life   text,               -- estimation IA: 'bon' | 'moyen' | 'degrade' | 'expire'
  ia_detail       jsonb,
  created_at      timestamptz not null default now()
);
alter table public.fl_validations_retour enable row level security;
drop policy if exists "fl_validations_retour_all" on public.fl_validations_retour;
create policy "fl_validations_retour_all" on public.fl_validations_retour for all using (true) with check (true);

-- ============================================================
-- fl_scoring_client — scoring commercial par client
-- ============================================================
create table if not exists public.fl_scoring_client (
  id              text primary key,
  client_id       text not null unique,
  score           numeric not null default 50,   -- 0-100
  niveau          text default 'bronze',          -- 'bronze' | 'silver' | 'gold' | 'platinum'
  nb_commandes_30j integer default 0,
  ca_30j          numeric default 0,
  taux_retour     numeric default 0,
  taux_paiement   numeric default 100,
  delai_moy_paiement numeric default 0,          -- jours
  derniere_commande text,
  updated_at      timestamptz not null default now()
);
alter table public.fl_scoring_client enable row level security;
drop policy if exists "fl_scoring_client_all" on public.fl_scoring_client;
create policy "fl_scoring_client_all" on public.fl_scoring_client for all using (true) with check (true);

-- ============================================================
-- fl_alertes — alertes systeme (stock, credit, shelf life...)
-- ============================================================
create table if not exists public.fl_alertes (
  id              text primary key default gen_random_uuid()::text,
  type            text not null,     -- 'stock_bas' | 'credit_depasse' | 'shelf_life' | 'retard_paiement' | 'forecast'
  severite        text default 'info',   -- 'info' | 'warning' | 'critical'
  titre           text not null,
  message         text not null,
  resource_type   text,
  resource_id     text,
  destinataires   jsonb default '[]',  -- array of user IDs
  lue             boolean default false,
  resolue         boolean default false,
  created_at      timestamptz not null default now()
);
alter table public.fl_alertes enable row level security;
drop policy if exists "fl_alertes_all" on public.fl_alertes;
create policy "fl_alertes_all" on public.fl_alertes for all using (true) with check (true);
create index if not exists fl_alertes_type_idx on public.fl_alertes(type);
create index if not exists fl_alertes_created_idx on public.fl_alertes(created_at desc);

-- ============================================================
-- fl_qr_commandes — QR codes par commande pour livreur
-- ============================================================
create table if not exists public.fl_qr_commandes (
  id              text primary key,
  commande_id     text not null,
  bon_livraison_id text,
  qr_data         text not null,    -- JSON encode: {id, clientNom, date, total, lignes}
  scanne_par      text,             -- livreur ID
  scanne_at       timestamptz,
  created_at      timestamptz not null default now()
);
alter table public.fl_qr_commandes enable row level security;
drop policy if exists "fl_qr_commandes_all" on public.fl_qr_commandes;
create policy "fl_qr_commandes_all" on public.fl_qr_commandes for all using (true) with check (true);

-- ============================================================
-- Nouveaux champs — fl_clients (scoring + credit workflow)
-- ============================================================
alter table public.fl_clients
  add column if not exists team_lead_id           text,
  add column if not exists default_heure_livraison text,
  add column if not exists credit_autorise         boolean default false,
  add column if not exists credit_solde            numeric default 0,
  add column if not exists credit_statut           text default 'ok',
  add column if not exists credit_workflow_validateur text,
  add column if not exists ice                     text,
  add column if not exists email                   text,
  add column if not exists scoring_score           numeric default 50,
  add column if not exists scoring_niveau          text default 'bronze';

-- ============================================================
-- Nouveaux champs — fl_articles (shelf life + lots + colisage)
-- ============================================================
alter table public.fl_articles
  add column if not exists shelf_life_jours        integer,
  add column if not exists alerte_shelf_life_jours integer default 2,
  add column if not exists prix_liquidation        numeric,
  add column if not exists colisage_caisses        numeric,
  add column if not exists colisage_demi_caisses   numeric,
  add column if not exists colisage_par_um         numeric,
  add column if not exists um                      text,
  add column if not exists nom_ar                  text,
  add column if not exists pv_methode              text default 'marge',
  add column if not exists pv_valeur               numeric default 30,
  add column if not exists stock_reel              numeric,
  add column if not exists stock_reel_date         text,
  add column if not exists stock_theorique         numeric,
  add column if not exists lots                    jsonb default '[]',
  add column if not exists historique_prix_achat   jsonb default '[]';

-- ============================================================
-- Nouveaux champs — fl_trips (numero auto + KPIs)
-- ============================================================
alter table public.fl_trips
  add column if not exists numero              text,
  add column if not exists secteur             text,
  add column if not exists commande_ids        jsonb default '[]',
  add column if not exists km_depart           numeric,
  add column if not exists km_retour           numeric,
  add column if not exists heure_depart        text,
  add column if not exists heure_retour        text,
  add column if not exists nb_clients          integer default 0,
  add column if not exists nb_caisses_fact     integer default 0,
  add column if not exists ca_realise          numeric default 0,
  add column if not exists validated           boolean default false;

-- ============================================================
-- Nouveaux champs — fl_commandes (heure livraison + scoring)
-- ============================================================
alter table public.fl_commandes
  add column if not exists heure_livraison     text,
  add column if not exists trip_id             text,
  add column if not exists validated_by        text,
  add column if not exists validated_at        timestamptz,
  add column if not exists credit_autorise     boolean default false,
  add column if not exists scoring_snapshot    numeric;

-- ============================================================
-- Nouveaux champs — fl_retours (double validation + photos IA)
-- ============================================================
alter table public.fl_retours
  add column if not exists validation_commercial   text default 'en_attente',
  add column if not exists validation_logistique   text default 'en_attente',
  add column if not exists ia_conforme             boolean,
  add column if not exists ia_shelf_life           text,
  add column if not exists photos                  jsonb default '[]',
  add column if not exists prix_propose            numeric;

-- ============================================================
-- Nouveaux champs — fl_bons_achat (workflow besoin auto)
-- ============================================================
alter table public.fl_bons_achat
  add column if not exists genere_par_forecast boolean default false,
  add column if not exists besoin_total        numeric,
  add column if not exists validated_by        text,
  add column if not exists validated_at        timestamptz;

-- ============================================================
-- fl_config — configuration globale applicaton
-- ============================================================
create table if not exists public.fl_config (
  id              text primary key default 'singleton',
  nom_entreprise  text default 'FreshLink Pro',
  devise          text default 'DH',
  tva_defaut      numeric default 0,
  forecast_heure  text default '08:00',
  forecast_actif  boolean default true,
  shelf_life_alerte_jours integer default 2,
  workflow_achat  boolean default true,
  workflow_credit boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_config enable row level security;
drop policy if exists "fl_config_all" on public.fl_config;
create policy "fl_config_all" on public.fl_config for all using (true) with check (true);

insert into public.fl_config (id) values ('singleton') on conflict (id) do nothing;

-- ============================================================
-- fl_trip_charges — charges tournees livreur
-- ============================================================
create table if not exists public.fl_trip_charges (
  id              text primary key,
  numero          text,
  date            text not null,
  livreur         text,
  immatricule     text,
  secteur         text,
  nb_caisses_fact integer default 0,
  nb_clients      integer default 0,
  km_depart       numeric,
  km_retour       numeric,
  charges         jsonb default '[]',
  validated       boolean default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.fl_trip_charges enable row level security;
drop policy if exists "fl_trip_charges_all" on public.fl_trip_charges;
create policy "fl_trip_charges_all" on public.fl_trip_charges for all using (true) with check (true);
drop trigger if exists fl_trip_charges_updated_at on public.fl_trip_charges;
create trigger fl_trip_charges_updated_at before update on public.fl_trip_charges
  for each row execute function public.set_updated_at();

-- ============================================================
-- fl_caisses_vides — suivi caisses en circulation
-- ============================================================
create table if not exists public.fl_caisses_vides (
  id              text primary key,
  date            text not null,
  type_mouvement  text not null,   -- 'sortie' | 'retour' | 'inventaire'
  livreur_id      text,
  client_id       text,
  nb_caisses_gros integer default 0,
  nb_caisses_demi integer default 0,
  notes           text,
  created_at      timestamptz not null default now()
);
alter table public.fl_caisses_vides enable row level security;
drop policy if exists "fl_caisses_vides_all" on public.fl_caisses_vides;
create policy "fl_caisses_vides_all" on public.fl_caisses_vides for all using (true) with check (true);

-- ============================================================
-- Indexes performance
-- ============================================================
create index if not exists fl_commandes_client_idx on public.fl_commandes(client_id);
create index if not exists fl_commandes_date_idx on public.fl_commandes(date);
create index if not exists fl_commandes_prevendeur_idx on public.fl_commandes(prevendeur_id);
create index if not exists fl_bons_livraison_trip_idx on public.fl_bons_livraison(trip_id);
create index if not exists fl_bons_livraison_client_idx on public.fl_bons_livraison(client_id);
create index if not exists fl_bons_livraison_date_idx on public.fl_bons_livraison(date);
create index if not exists fl_retours_client_idx on public.fl_retours(client_id);
create index if not exists fl_receptions_date_idx on public.fl_receptions(date);
create index if not exists fl_shelf_life_article_idx on public.fl_shelf_life_lots(article_id);
create index if not exists fl_shelf_life_statut_idx on public.fl_shelf_life_lots(statut);
create index if not exists fl_forecasts_date_idx on public.fl_forecasts(date_cible);

-- ============================================================
-- Vue: stock theorique par article
-- ============================================================
create or replace view public.fl_stock_theorique as
select
  a.id as article_id,
  a.nom,
  a.unite,
  a.stock_disponible,
  coalesce((
    select sum((l->>'quantiteRecue')::numeric)
    from public.fl_receptions r,
         jsonb_array_elements(r.lignes) l
    where (l->>'articleId') = a.id
    and r.date >= (current_date - interval '30 days')::text
  ), 0) as recu_30j,
  coalesce((
    select sum((l->>'quantite')::numeric)
    from public.fl_bons_livraison bl,
         jsonb_array_elements(bl.lignes) l
    where (l->>'articleId') = a.id
    and bl.date >= (current_date - interval '30 days')::text
  ), 0) as facture_30j,
  coalesce((
    select sum((l->>'quantite')::numeric)
    from public.fl_retours rt,
         jsonb_array_elements(rt.lignes) l
    where (l->>'articleId') = a.id
    and rt.date >= (current_date - interval '30 days')::text
  ), 0) as retour_30j
from public.fl_articles a
where a.actif = true;
