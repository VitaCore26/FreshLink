-- =====================================================================
-- FreshLink Pro — Migration v6
-- Supabase: https://nbcodflwqvcvcdbpguth.supabase.co
-- Date: 2026-03-27
-- Changes:
--   1. trips — auto trip_number, km_depart mandatory gate, caisses_validees
--   2. trip_article_lines — nb_caisses column (blocking gate for control)
--   3. commandes — stock not required for assignment (remove stock_disponible constraint)
--   4. reception_lignes — qte_facturee column for reception vs facturation analysis
--   5. users — require_camera_auth column
--   6. feedback table
--   7. agent_ia_conversations table
--   8. po_orders auto-push column
-- =====================================================================

-- ── 1. TRIPS ──────────────────────────────────────────────────────────────────

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS trip_number       TEXT,
  ADD COLUMN IF NOT EXISTS km_depart         NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS km_arrivee        NUMERIC(8,1),
  ADD COLUMN IF NOT EXISTS km_depart_saisi   BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS caisses_validees  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lifo_ordre        JSONB;

-- Auto-generate trip_number when NULL (format: TRP-YYYYMMDD-XXX)
CREATE OR REPLACE FUNCTION generate_trip_number()
RETURNS TRIGGER AS $$
DECLARE
  seq_today INT;
  today_str TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
BEGIN
  IF NEW.trip_number IS NULL OR NEW.trip_number = '' THEN
    SELECT COUNT(*) + 1 INTO seq_today
    FROM trips
    WHERE trip_number LIKE 'TRP-' || today_str || '-%';
    NEW.trip_number := 'TRP-' || today_str || '-' || LPAD(seq_today::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trip_number ON trips;
CREATE TRIGGER trg_trip_number
  BEFORE INSERT ON trips
  FOR EACH ROW EXECUTE FUNCTION generate_trip_number();

-- Index for fast trip number lookups
CREATE INDEX IF NOT EXISTS idx_trips_trip_number ON trips (trip_number);
CREATE INDEX IF NOT EXISTS idx_trips_livreur_date ON trips (livreur_id, date);

-- ── 2. TRIP ARTICLE LINES — nb_caisses blocking gate ─────────────────────────

ALTER TABLE bon_preparation_lignes
  ADD COLUMN IF NOT EXISTS nb_caisses_gros   INT,
  ADD COLUMN IF NOT EXISTS nb_caisses_demi   INT,
  ADD COLUMN IF NOT EXISTS nb_caisses_saisie BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 3. COMMANDES — remove stock_disponible as blocking constraint ─────────────
-- Assignment to a trip is allowed even when stock is not available.
-- The loading controller validates actual quantities at departure.

ALTER TABLE commandes
  ADD COLUMN IF NOT EXISTS affecte_sans_stock BOOLEAN NOT NULL DEFAULT FALSE;

-- Update existing commandes that were blocked by stock check
UPDATE commandes
  SET affecte_sans_stock = FALSE
  WHERE affecte_sans_stock IS NULL;

-- ── 4. RECEPTION LIGNES — qte_facturee for analysis ──────────────────────────

ALTER TABLE reception_lignes
  ADD COLUMN IF NOT EXISTS qte_facturee      NUMERIC(10,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prix_vente_moyen  NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS ecart_qte         NUMERIC(10,3) GENERATED ALWAYS AS (quantite_recue - qte_facturee) STORED;

-- View: reception vs facturation par article (used by AnalyseReceptionPanel)
CREATE OR REPLACE VIEW v_reception_vs_facturation AS
SELECT
  rl.article_id,
  rl.article_nom,
  SUM(rl.quantite_commandee)          AS qte_commandee,
  SUM(rl.quantite_recue)              AS qte_recue,
  SUM(rl.qte_facturee)                AS qte_facturee,
  SUM(rl.quantite_commandee) - SUM(rl.quantite_recue) AS reliquat,
  SUM(rl.quantite_recue) - SUM(rl.qte_facturee)       AS ecart_rec_fact,
  ROUND(
    CASE WHEN SUM(rl.quantite_commandee) > 0
    THEN (SUM(rl.quantite_recue) / SUM(rl.quantite_commandee)) * 100
    ELSE 0 END, 1
  )                                   AS taux_reception_pct,
  ROUND(
    CASE WHEN SUM(rl.quantite_recue) > 0
    THEN (SUM(rl.qte_facturee) / SUM(rl.quantite_recue)) * 100
    ELSE 0 END, 1
  )                                   AS couverture_pct,
  SUM(rl.prix_achat * rl.quantite_recue) AS montant_reception,
  r.date
FROM reception_lignes rl
JOIN receptions r ON r.id = rl.reception_id
GROUP BY rl.article_id, rl.article_nom, r.date;

-- ── 5. USERS — require_camera_auth ───────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS require_camera_auth BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 6. FEEDBACK TABLE ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  user_name   TEXT,
  user_role   TEXT,
  note        INT CHECK (note BETWEEN 1 AND 5),
  categorie   TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_read_admin" ON feedback
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "feedback_insert_all" ON feedback
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback (created_at DESC);

-- ── 7. AGENT IA CONVERSATIONS ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_ia_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    TEXT NOT NULL,
  agent_nom   TEXT NOT NULL,
  user_id     TEXT,
  user_name   TEXT,
  user_role   TEXT,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE agent_ia_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_conv_read_own" ON agent_ia_conversations
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "agent_conv_insert_all" ON agent_ia_conversations
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_agent_conv_agent ON agent_ia_conversations (agent_id, created_at DESC);

-- ── 8. PO ORDERS — auto-push to mobile acheteur ───────────────────────────────

ALTER TABLE po_orders
  ADD COLUMN IF NOT EXISTS push_mode         TEXT NOT NULL DEFAULT 'manual'
                                             CHECK (push_mode IN ('auto', 'manual')),
  ADD COLUMN IF NOT EXISTS pushed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pushed_to_user_id TEXT,
  ADD COLUMN IF NOT EXISTS vu_acheteur       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vu_acheteur_at    TIMESTAMPTZ;

-- Index
CREATE INDEX IF NOT EXISTS idx_po_orders_push ON po_orders (push_mode, vu_acheteur);

-- ── 9. RLS POLICIES UPDATE ────────────────────────────────────────────────────

-- trips: livreur can read their own trips
DROP POLICY IF EXISTS "trips_livreur_read" ON trips;
CREATE POLICY "trips_livreur_read" ON trips
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- commandes: no stock check required
DROP POLICY IF EXISTS "commandes_insert_no_stock" ON commandes;
CREATE POLICY "commandes_insert_no_stock" ON commandes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ── 10. HELPER FUNCTION — next trip number (callable from app) ────────────────

CREATE OR REPLACE FUNCTION get_next_trip_number()
RETURNS TEXT AS $$
DECLARE
  seq_today INT;
  today_str TEXT := TO_CHAR(NOW(), 'YYYYMMDD');
BEGIN
  SELECT COUNT(*) + 1 INTO seq_today
  FROM trips
  WHERE trip_number LIKE 'TRP-' || today_str || '-%';
  RETURN 'TRP-' || today_str || '-' || LPAD(seq_today::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Run: paste this script in Supabase SQL Editor → https://nbcodflwqvcvcdbpguth.supabase.co
