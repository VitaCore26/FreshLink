-- ════════════════════════════════════════════════════════════════════════════
-- Intelligence concurrent (import Excel Iziry) — tables PARTAGÉES entre appareils
-- Pattern JSONB standard : { id TEXT PK, payload JSONB, updated_at TIMESTAMPTZ }
-- Accès via /api/sync-write et /api/sync-read (service-role, bypass RLS).
-- Idempotent : peut être relancé sans risque.
-- ════════════════════════════════════════════════════════════════════════════

-- PA concurrent (synthèse achats) — alimente Pricing « PA vs PA concurrent »
create table if not exists public.fl_intel_prix (
  id          text primary key,
  payload     jsonb,
  updated_at  timestamptz default now()
);

-- PV concurrent (prix de vente, avec historique) — alimente Pricing « PV vs PV »
create table if not exists public.fl_conc_pv (
  id          text primary key,
  payload     jsonb,
  updated_at  timestamptz default now()
);

-- Facturation concurrent agrégée par jour — historique & prévision
create table if not exists public.fl_conc_ventes_daily (
  id          text primary key,
  payload     jsonb,
  updated_at  timestamptz default now()
);

-- RLS activé : le service_role (utilisé par /api/sync-*) bypass la RLS.
-- On ajoute une policy de lecture anon optionnelle (lecture seule) au cas où.
alter table public.fl_intel_prix        enable row level security;
alter table public.fl_conc_pv           enable row level security;
alter table public.fl_conc_ventes_daily enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'fl_intel_prix' and policyname = 'anon_read') then
    create policy anon_read on public.fl_intel_prix for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'fl_conc_pv' and policyname = 'anon_read') then
    create policy anon_read on public.fl_conc_pv for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'fl_conc_ventes_daily' and policyname = 'anon_read') then
    create policy anon_read on public.fl_conc_ventes_daily for select using (true);
  end if;
end $$;

grant select on public.fl_intel_prix, public.fl_conc_pv, public.fl_conc_ventes_daily to anon, authenticated;
