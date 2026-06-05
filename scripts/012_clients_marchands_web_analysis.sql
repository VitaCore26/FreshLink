-- ════════════════════════════════════════════════════════════════════════════════════════
-- MIGRATION 012: Web Registration Analysis + Merchant Location Types
-- Date: 2026-06-05
-- Purpose: Add detailed client web registration tracking + merchant location classification
-- Status: READY FOR DEPLOYMENT
-- ════════════════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────────────────
-- SECTION 1: ADD COLUMNS TO fl_clients
-- ──────────────────────────────────────────────────────────────────────────────────────────

-- Web Registration Tracking
ALTER TABLE public.fl_clients
ADD COLUMN IF NOT EXISTS web_registration_date TIMESTAMPTZ COMMENT 'Date and time of web registration',
ADD COLUMN IF NOT EXISTS web_registration_source TEXT COMMENT 'Source of registration: website|app|direct',
ADD COLUMN IF NOT EXISTS web_registration_referrer TEXT COMMENT 'Who referred the client (email or name)',
ADD COLUMN IF NOT EXISTS web_analysis_visits INTEGER DEFAULT 0 COMMENT 'Number of visits before registration',
ADD COLUMN IF NOT EXISTS web_analysis_time_spent INTEGER DEFAULT 0 COMMENT 'Time spent on site (seconds)',
ADD COLUMN IF NOT EXISTS web_analysis_pages_viewed INTEGER DEFAULT 0 COMMENT 'Number of pages viewed',
ADD COLUMN IF NOT EXISTS web_profile_completion NUMERIC DEFAULT 0 COMMENT 'Profile completion percentage (0-100)',
ADD COLUMN IF NOT EXISTS web_document_uploads JSONB DEFAULT '[]' COMMENT 'Documents uploaded: [{type, filename, size, date}]',
ADD COLUMN IF NOT EXISTS web_verification_status TEXT DEFAULT 'pending' COMMENT 'pending|verified|rejected',
ADD COLUMN IF NOT EXISTS web_verification_date TIMESTAMPTZ COMMENT 'Date of verification',
ADD COLUMN IF NOT EXISTS web_verification_notes TEXT COMMENT 'Verification notes/comments';

-- Merchant Location Classification
ALTER TABLE public.fl_clients
ADD COLUMN IF NOT EXISTS lieu_type TEXT COMMENT 'Type of place: magasin|bidane|table|marche|kiosk|restaurant|depot|autre',
ADD COLUMN IF NOT EXISTS lieu_type_autre TEXT COMMENT 'Custom location type if "autre" selected',
ADD COLUMN IF NOT EXISTS lieu_description TEXT COMMENT 'Description of the place',
ADD COLUMN IF NOT EXISTS lieu_superficie NUMERIC COMMENT 'Area in square meters',
ADD COLUMN IF NOT EXISTS lieu_caracteristiques JSONB DEFAULT '[]' COMMENT 'Characteristics: [climatise, etageres, congelateur, etc]';

-- Client Acquisition & Decision Factors
ALTER TABLE public.fl_clients
ADD COLUMN IF NOT EXISTS source_acquisition TEXT COMMENT 'How client found FreshLink',
ADD COLUMN IF NOT EXISTS source_acquisition_detail TEXT COMMENT 'Details about source',
ADD COLUMN IF NOT EXISTS decision_factors JSONB DEFAULT '[]' COMMENT 'Factors in decision: [prix, qualite, facilite, livraison, credit, service]',
ADD COLUMN IF NOT EXISTS expected_annual_volume NUMERIC COMMENT 'Expected annual purchase volume (kg)',
ADD COLUMN IF NOT EXISTS expectations_text TEXT COMMENT 'Client expectations and requirements (free text)';

-- Timestamp tracking
ALTER TABLE public.fl_clients
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ──────────────────────────────────────────────────────────────────────────────────────────
-- SECTION 2: CREATE fl_web_registrations TABLE (Audit trail)
-- ──────────────────────────────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS public.fl_web_registrations CASCADE;

CREATE TABLE public.fl_web_registrations (
  -- Primary Key & Links
  id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
  client_id TEXT REFERENCES public.fl_clients(id) ON DELETE CASCADE,

  -- Session Tracking
  session_start TIMESTAMPTZ NOT NULL COMMENT 'When user arrived on website',
  session_end TIMESTAMPTZ COMMENT 'When user left website',
  duration_seconds INTEGER COMMENT 'Total session duration',

  -- Navigation Analysis
  first_page TEXT COMMENT 'First page visited',
  last_page TEXT COMMENT 'Last page visited before registration',
  pages_visited JSONB DEFAULT '[]' COMMENT 'Array of pages visited: [{page, time_spent, order}]',
  referrer TEXT COMMENT 'External referrer (Google, Facebook, etc)',

  -- Form Interaction
  form_started TIMESTAMPTZ COMMENT 'When user started registration form',
  form_completed TIMESTAMPTZ COMMENT 'When user submitted form',
  form_abandonments INTEGER DEFAULT 0 COMMENT 'Number of times form was abandoned and resumed',
  form_fields_filled JSONB DEFAULT '{}' COMMENT 'Which fields were filled: {field: true/false}',

  -- Document Upload Tracking
  documents_uploaded JSONB DEFAULT '[]' COMMENT 'Documents uploaded: [{type, filename, size, timestamp}]',

  -- Device/Browser Information
  browser_info TEXT COMMENT 'Browser name and version',
  device_type TEXT COMMENT 'Device type: desktop|mobile|tablet',
  ip_address TEXT COMMENT 'Client IP address (anonymized)',

  -- Result
  registration_status TEXT COMMENT 'completed|abandoned|error',
  registration_date TIMESTAMPTZ COMMENT 'When registration was finalized',

  -- Notes
  notes TEXT COMMENT 'Additional notes/observations',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_web_regs_client_id ON public.fl_web_registrations(client_id);
CREATE INDEX idx_web_regs_session_start ON public.fl_web_registrations(session_start DESC);
CREATE INDEX idx_web_regs_status ON public.fl_web_registrations(registration_status);

-- ──────────────────────────────────────────────────────────────────────────────────────────
-- SECTION 3: UPDATE fl_fournisseurs (Add location information)
-- ──────────────────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.fl_fournisseurs
ADD COLUMN IF NOT EXISTS lieu_type TEXT COMMENT 'Type of supplier place: magasin|ferme|grossiste|coopérative|autre',
ADD COLUMN IF NOT EXISTS lieu_type_autre TEXT COMMENT 'Custom type if "autre"',
ADD COLUMN IF NOT EXISTS lieu_description TEXT COMMENT 'Description of the location',
ADD COLUMN IF NOT EXISTS lieu_caracteristiques JSONB DEFAULT '[]' COMMENT 'Characteristics: [livraison, stockage, refrigere, etc]',
ADD COLUMN IF NOT EXISTS gps_lat NUMERIC COMMENT 'GPS Latitude',
ADD COLUMN IF NOT EXISTS gps_lng NUMERIC COMMENT 'GPS Longitude',
ADD COLUMN IF NOT EXISTS capacite_stock NUMERIC COMMENT 'Storage capacity in metric tons',
ADD COLUMN IF NOT EXISTS volume_hebdo NUMERIC COMMENT 'Typical weekly volume (kg)',
ADD COLUMN IF NOT EXISTS jours_livraison JSONB DEFAULT '[]' COMMENT 'Delivery days: [lundi, mardi, ...]',
ADD COLUMN IF NOT EXISTS horaires_livraison TEXT COMMENT 'Delivery times';

-- Add index for location type queries
CREATE INDEX idx_fournisseurs_lieu_type ON public.fl_fournisseurs(lieu_type);

-- ──────────────────────────────────────────────────────────────────────────────────────────
-- SECTION 4: ADD INDEXES FOR PERFORMANCE
-- ──────────────────────────────────────────────────────────────────────────────────────────

-- Client web analysis queries
CREATE INDEX IF NOT EXISTS idx_clients_web_registration ON public.fl_clients(web_registration_date DESC);
CREATE INDEX IF NOT EXISTS idx_clients_lieu_type ON public.fl_clients(lieu_type);
CREATE INDEX IF NOT EXISTS idx_clients_web_verification ON public.fl_clients(web_verification_status);
CREATE INDEX IF NOT EXISTS idx_clients_source_acquisition ON public.fl_clients(source_acquisition);

-- Fournisseurs location queries
CREATE INDEX IF NOT EXISTS idx_fournisseurs_specialites ON public.fl_fournisseurs USING GIN(specialites);

-- ──────────────────────────────────────────────────────────────────────────────────────────
-- SECTION 5: VERIFICATION
-- ──────────────────────────────────────────────────────────────────────────────────────────

-- Verify fl_clients new columns
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'fl_clients'
  AND column_name LIKE 'web_%'
  OR column_name LIKE 'lieu_%'
  OR column_name LIKE 'source_%'
  OR column_name LIKE 'decision_%'
  OR column_name LIKE 'expected_%'
  OR column_name = 'expectations_text'
ORDER BY ordinal_position DESC
LIMIT 25;

-- Verify fl_web_registrations table exists
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'fl_web_registrations'
ORDER BY ordinal_position;

-- Verify fl_fournisseurs new columns
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'fl_fournisseurs'
  AND (column_name LIKE 'lieu_%'
    OR column_name LIKE 'gps_%'
    OR column_name LIKE '%jours%'
    OR column_name LIKE '%horaires%')
ORDER BY ordinal_position;

-- ════════════════════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ════════════════════════════════════════════════════════════════════════════════════════

-- Summary
SELECT
  'Migration 012 Complete' as status,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'fl_web_registrations') as new_web_reg_columns,
  (SELECT COUNT(*) FROM public.fl_clients LIMIT 1) as existing_clients;

-- ─ End of Migration 012 ─
