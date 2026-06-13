-- ════════════════════════════════════════════════════════════════════════
-- CREATE-fl_documents.sql
-- ════════════════════════════════════════════════════════════════════════
-- Devis / Contrats / Factures / BL archivés (écran « Devis & Contrats CHR »).
-- L'ancien code écrivait des colonnes plates (client_nom…) → erreur
-- "Could not find the 'client_nom' column of 'fl_documents' in the schema
-- cache". BODocuments lit/écrit maintenant via /api/sync-* au format JSONB
-- standard {id, payload, updated_at}. Cette table doit exister.
--
-- À exécuter dans Supabase → SQL Editor (projet wnuilvamhygkzupvfnxz).
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.fl_documents (
  id         TEXT PRIMARY KEY,
  payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_type   ON public.fl_documents ((payload->>'type_doc'));
CREATE INDEX IF NOT EXISTS idx_documents_client ON public.fl_documents ((payload->>'client_id'));
CREATE INDEX IF NOT EXISTS idx_documents_statut ON public.fl_documents ((payload->>'statut'));

ALTER TABLE public.fl_documents ENABLE ROW LEVEL SECURITY;

-- Vérif : Devis & Contrats → créer un devis → recharge sur un autre
-- appareil : il remonte. Plus d'erreur 'client_nom'.
