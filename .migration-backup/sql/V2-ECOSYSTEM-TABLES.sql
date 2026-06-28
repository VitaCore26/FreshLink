-- ════════════════════════════════════════════════════════════════════════════
-- VITA CORE ECOSYSTEM V2 — Nouvelles tables pour l'architecture unifiee
-- ════════════════════════════════════════════════════════════════════════════
-- A executer APRES le RESET-LIAISON.sql (tables de base)
-- Ajoute: RBAC hierarchique, factures, wallet, parrainage, tracking, portails
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- 1) FACTURES & AVOIRS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_invoices (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { numero, clientId, commandeId, montantHT, tva, montantTTC,
--            statut (brouillon|emise|payee|annulee), echeance, pdfUrl,
--            lignes:[{articleId, qte, prixUnit, montant}], createdAt }

CREATE TABLE IF NOT EXISTS public.fl_avoirs (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { numero, invoiceId, clientId, montant, motif, statut, createdAt }


-- ─────────────────────────────────────────────────────────────────────────────
-- 2) WALLET & PAIEMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_wallet_transactions (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { clientId, type (credit|debit|parrainage|promotion|paiement),
--            montant, soldeApres, reference, description, createdAt }

CREATE TABLE IF NOT EXISTS public.fl_paiements (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { clientId, invoiceId, commandeId, montant, methode (cash|cheque|virement|wallet),
--            reference, statut (en_attente|confirme|rejete), confirmedBy, createdAt }


-- ─────────────────────────────────────────────────────────────────────────────
-- 3) SYSTEME DE PARRAINAGE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_referrals (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { parrain_id, parrain_type (client|chr), filleul_id, filleul_type,
--            code, statut (en_attente|converti|expire), recompense_parrain:{type,montant},
--            recompense_filleul:{type,montant}, convertedAt, createdAt }

CREATE TABLE IF NOT EXISTS public.fl_referral_config (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- id=__config → payload: { enabled, rewardParrain:{type,montant}, rewardFilleul:{type,montant},
--                           codePrefix, expirationDays, minOrderAmount }


-- ─────────────────────────────────────────────────────────────────────────────
-- 4) TRACKING TEMPS REEL (livraisons)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_tracking (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { commandeId, livreurId, statut (recue|preparation|chargement|en_route|livree),
--            etapes:[{statut, timestamp, lat?, lng?, note?}],
--            eta_minutes, lat, lng, lastUpdate, clientNotified }


-- ─────────────────────────────────────────────────────────────────────────────
-- 5) PROMOTIONS & COUPONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_promotions (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { nom, type (pourcentage|montant|gratuite|bundle), valeur, codePromo,
--            dateDebut, dateFin, conditions:{minMontant, categories[], segments[]},
--            usageMax, usageActuel, actif, createdAt }

CREATE TABLE IF NOT EXISTS public.fl_coupons (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { code, promotionId, clientId, montant, utilise, usedAt, createdAt }


-- ─────────────────────────────────────────────────────────────────────────────
-- 6) NOTIFICATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_notifications (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { userId, type (commande|livraison|paiement|promotion|systeme),
--            titre, message, lien, lu, createdAt }


-- ─────────────────────────────────────────────────────────────────────────────
-- 7) CONTRATS CLIENT CHR
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_contrats (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { clientId, type (annuel|trimestriel|ponctuel), dateDebut, dateFin,
--            conditions:{remisePct, plafondCredit, delaiPaiement, frequenceLivraison},
--            statut (actif|expire|resilie), pdfUrl, signedAt, createdAt }


-- ─────────────────────────────────────────────────────────────────────────────
-- 8) ORGANISATION HIERARCHIQUE (Entreprise > Proprietaire > Gerant)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fl_organisations (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- payload: { nom, type (restaurant|hotel|cafe|epicerie|grossiste|...),
--            adresse, ville, ice, clientId (lien fl_clients),
--            proprietaireUserId, gerants:[userId,...],
--            parametres:{plafondCredit, delaiPaiement, frequenceLivraison},
--            actif, createdAt }


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — Activer sur toutes les nouvelles tables
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'fl_invoices','fl_avoirs','fl_wallet_transactions','fl_paiements',
    'fl_referrals','fl_referral_config','fl_tracking',
    'fl_promotions','fl_coupons','fl_notifications',
    'fl_contrats','fl_organisations'
  ])
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- Aucune politique anon — toutes les tables sont accessibles uniquement via service_role
-- (sauf les notifications qui pourraient avoir une politique basee sur l'user plus tard)


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────────────────────────────
SELECT 'fl_invoices'           AS "table", count(*) FROM public.fl_invoices
UNION ALL SELECT 'fl_avoirs',             count(*) FROM public.fl_avoirs
UNION ALL SELECT 'fl_wallet_transactions',count(*) FROM public.fl_wallet_transactions
UNION ALL SELECT 'fl_paiements',          count(*) FROM public.fl_paiements
UNION ALL SELECT 'fl_referrals',          count(*) FROM public.fl_referrals
UNION ALL SELECT 'fl_tracking',           count(*) FROM public.fl_tracking
UNION ALL SELECT 'fl_promotions',         count(*) FROM public.fl_promotions
UNION ALL SELECT 'fl_notifications',      count(*) FROM public.fl_notifications
UNION ALL SELECT 'fl_contrats',           count(*) FROM public.fl_contrats
UNION ALL SELECT 'fl_organisations',      count(*) FROM public.fl_organisations
ORDER BY 1;
