import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireDeviceApi } from "@/lib/auth/requireDeviceApi"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
// Accept multiple env var names (legacy projects use lowercase "service_role")
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
                  || process.env.service_role
                  || process.env.SUPABASE_SERVICE_KEY
                  || ""

// Use the supabase-js admin client (service_role) which correctly sets
// the PostgreSQL role and bypasses RLS at the connection level.
// Raw fetch was not reliably bypassing RLS in some Supabase project configs.

function getAdminClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function POST(req: NextRequest) {
  // 🔒 Auth : refuse les écritures sans cookie d'appareil à signature HMAC valide
  // (empêche tout tiers d'écrire/supprimer/vider la base via service_role).
  const denied = requireDeviceApi(req)
  if (denied) return denied

  if (!SERVICE_KEY) {
    return NextResponse.json(
      { ok: false, errors: ["SUPABASE_SERVICE_ROLE_KEY manquante"] },
      { status: 500 }
    )
  }

  try {
    const body = (await req.json()) as {
      table: string
      upserts?: Array<{ id: string; payload: unknown; updated_at: string }>
      deletes?: string[]
      clearAll?: boolean          // ← supprime TOUTES les lignes (reset)
      preserveId?: string         // ← ID à préserver lors du clearAll (ex: super_admin)
    }

    if (!body.table) {
      return NextResponse.json({ ok: false, errors: ["table manquante"] }, { status: 400 })
    }

    // ── Whitelist des tables autorisées ───────────────────────────────────────
    const ALLOWED_TABLES = [
      "fl_users", "fl_clients", "fl_articles", "fl_fournisseurs",
      "fl_commandes", "fl_commandes_web", "fl_bons_livraison",
      "fl_bons_preparation", "fl_retours", "fl_trips",
      "fl_site_access", "fl_account_requests", "fl_prospects",
      "fl_company_contacts", "fl_depots", "fl_documents",
      "fl_bons_achat", "fl_purchase_orders", "fl_receptions",
      "fl_caisses_vides", "fl_charges", "fl_caisse_entries",
      "fl_salaries", "fl_actionnaires", "fl_livreurs",
      "fl_feedbacks", "fl_gift_materials", "fl_pa_historique",
      // V2 ecosystem tables
      "fl_invoices", "fl_avoirs", "fl_wallet_transactions", "fl_paiements",
      "fl_referrals", "fl_referral_config", "fl_tracking",
      "fl_promotions", "fl_coupons", "fl_notifications",
      "fl_contrats", "fl_organisations",
      // Process / config (lignes uniques id="config")
      "fl_process_config", "fl_workflow_config", "fl_alert_config", "fl_email_config",
      // Intelligence concurrent (import Excel Iziry) — partagé entre appareils
      "fl_intel_prix", "fl_conc_pv", "fl_conc_ventes_daily",
      // Suivi financier mensuel agrégé (dossier investisseurs — pas un grand-livre)
      "fl_finance_mensuel",
      // Opérationnel synchronisé (messagerie, notices, visites, flux achat/stock)
      // — requis pour autoSync + messagerie cross-device + reset complet.
      "fl_messages", "fl_notices", "fl_visites",
      "fl_transferts_stock", "fl_demandes_achat", "fl_non_achats",
      // Credits fournisseurs + charges de revient — table existante en Supabase
      // mais jusqu'ici absente de la whitelist (upserts silencieusement rejetés).
      "fl_credits_fournisseurs", "fl_charges_article",
    ]
    if (!ALLOWED_TABLES.includes(body.table)) {
      return NextResponse.json({ ok: false, errors: [`Table non autorisée: ${body.table}`] }, { status: 403 })
    }

    const { table, upserts, deletes, clearAll, preserveId } = body
    const errors: string[] = []
    const sb = getAdminClient()

    // ── Suppression complète de la table (service role bypass RLS) ────────────
    if (clearAll) {
      let q = sb.from(table).delete()
      if (preserveId) {
        // @ts-ignore — PostgREST filter chaining
        q = q.neq("id", preserveId)
      } else {
        // @ts-ignore
        q = q.not("id", "is", null)
      }
      const { error } = await q
      if (error) errors.push(`clearAll ${table}: ${error.message}`)
      return NextResponse.json({ ok: errors.length === 0, errors })
    }

    if (upserts && upserts.length > 0) {
      // Déduplication par id — Postgres rejette un upsert qui touche 2× la même
      // ligne dans la même commande ("ON CONFLICT DO UPDATE command cannot
      // affect row a second time", code 21000). On garde la dernière occurrence.
      const byId = new Map<string, { id: string; payload: unknown; updated_at: string }>()
      for (const u of upserts) if (u && u.id != null) byId.set(String(u.id), u)
      const deduped = [...byId.values()]
      const { error } = await sb
        .from(table)
        .upsert(deduped, { onConflict: "id" })
      if (error) errors.push(`upsert: ${error.message} (code: ${error.code})`)
    }

    if (deletes && deletes.length > 0) {
      for (const id of deletes) {
        const { error } = await sb.from(table).delete().eq("id", id)
        if (error) errors.push(`delete ${id}: ${error.message}`)
      }
    }

    return NextResponse.json({ ok: errors.length === 0, errors })
  } catch (e) {
    return NextResponse.json({ ok: false, errors: [String(e)] }, { status: 500 })
  }
}
