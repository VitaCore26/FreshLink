-- FreshLink Pro — Clients table
-- Supabase project: qlbubpjunhvveppbhxug

create table if not exists public.clients (
  id            text primary key,
  nom           text not null,
  secteur       text not null default '',
  zone          text not null default '',
  type          text not null default 'autre',
  type_autre    text,
  taille        text not null default '50-100kg',
  type_produits text not null default 'moyenne',
  rotation      text not null default 'journalier',
  modalite_paiement text,
  plafond_credit    numeric,
  gps_lat       double precision,
  gps_lng       double precision,
  telephone     text,
  email         text,
  adresse       text,
  ice           text,
  notes         text,
  created_by    text not null default '',
  created_at    timestamptz not null default now()
);

alter table public.clients enable row level security;

-- Allow full access with anon key (adjust if you add auth later)
create policy "allow_all_clients" on public.clients
  for all using (true) with check (true);
