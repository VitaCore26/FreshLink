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
]);

function getAdminClient() {
  return createClient(SB_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

router.post("/", async (req: Request, res: Response) => {
  if (requireDeviceApi(req)) {
    res.status(401).json({ ok: false, errors: ["Device non autorisé"] });
    return;
  }
  if (!SERVICE_KEY) {
    res.status(500).json({ ok: false, errors: ["SUPABASE_SERVICE_ROLE_KEY manquante"] });
    return;
  }

  const body = req.body as {
    table: string;
    upserts?: Array<{ id: string; payload: unknown; updated_at: string }>;
    deletes?: string[];
    clearAll?: boolean;
    preserveId?: string;
  };

  if (!body.table) {
    res.status(400).json({ ok: false, errors: ["table manquante"] });
    return;
  }
  if (!ALLOWED_TABLES.has(body.table)) {
    res.status(403).json({ ok: false, errors: [`Table non autorisée: ${body.table}`] });
    return;
  }

  const errors: string[] = [];
  const sb = getAdminClient();

  try {
    if (body.clearAll) {
      const q = sb.from(body.table).delete().neq("id", body.preserveId ?? "");
      const { error } = await q;
      if (error) errors.push(`clearAll: ${error.message}`);
    }

    if (body.upserts?.length) {
      const { error } = await sb.from(body.table).upsert(body.upserts, { onConflict: "id" });
      if (error) errors.push(`upsert: ${error.message}`);
    }

    if (body.deletes?.length) {
      const { error } = await sb.from(body.table).delete().in("id", body.deletes);
      if (error) errors.push(`delete: ${error.message}`);
    }

    res.json({ ok: errors.length === 0, errors });
  } catch (e) {
    res.status(500).json({ ok: false, errors: [String(e)] });
  }
});

export default router;
