import { Router } from "express";
import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { requireDeviceApi } from "../lib/deviceGuard.js";

const router = Router();

const SB_URL =
  process.env.VITE_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://wnuilvamhygkzupvfnxz.supabase.co";

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.service_role ||
  process.env.SUPABASE_SERVICE_KEY ||
  "";

const ALLOWED_TABLES = new Set([
  "fl_users", "fl_clients", "fl_articles", "fl_fournisseurs",
  "fl_commandes", "fl_commandes_web", "fl_bons_livraison",
  "fl_bons_preparation", "fl_retours", "fl_trips",
  "fl_site_access", "fl_account_requests", "fl_prospects",
  "fl_company_contacts", "fl_depots", "fl_documents",
  "fl_bons_achat", "fl_purchase_orders", "fl_receptions",
  "fl_caisses_vides", "fl_charges", "fl_caisse_entries",
  "fl_salaries", "fl_actionnaires", "fl_livreurs",
  "fl_feedbacks", "fl_gift_materials", "fl_pa_historique",
  "fl_invoices", "fl_avoirs", "fl_wallet_transactions", "fl_paiements",
  "fl_referrals", "fl_referral_config", "fl_tracking",
  "fl_promotions", "fl_coupons", "fl_notifications",
  "fl_contrats", "fl_organisations",
  "fl_process_config", "fl_workflow_config", "fl_alert_config", "fl_email_config",
  "fl_intel_prix", "fl_conc_pv", "fl_conc_ventes_daily",
  "fl_notices",
]);

function getAdminClient() {
  return createClient(SB_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

router.get("/", async (req: Request, res: Response) => {
  if (requireDeviceApi(req)) {
    res.status(401).json({ ok: false, error: "Device non autorisé" });
    return;
  }
  if (!SERVICE_KEY) {
    res.status(500).json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante" });
    return;
  }
  const table = req.query["table"] as string | undefined;
  if (!table) {
    res.status(400).json({ ok: false, error: "table param manquante" });
    return;
  }
  if (!ALLOWED_TABLES.has(table)) {
    res.status(403).json({ ok: false, error: `Table non autorisée: ${table}` });
    return;
  }
  try {
    const sb = getAdminClient();
    const { data, error } = await sb
      .from(table)
      .select("id, payload")
      .limit(20000);
    if (error) {
      res.status(500).json({ ok: false, error: `${error.message} (code: ${error.code})` });
      return;
    }
    res.json({ ok: true, data: data ?? [] });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Erreur interne" });
  }
});

export default router;
