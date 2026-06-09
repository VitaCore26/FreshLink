import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════
// /api/ext/site-config — Configuration GLOBALE du site vitrine
//
// Résout le problème « la config est locale au navigateur » :
//   - GET  → renvoie la config partagée (contact, maintenance, appUrl…)
//            lue depuis fl_company_contacts (id="main") via service-role.
//            Tous les visiteurs lisent la MÊME config.
//   - POST → met à jour la config (protégé par un token admin).
//
// Public (passe par le proxy /api/* du site statique). Pas de clé Supabase
// exposée côté navigateur : tout passe par le service-role serveur.
// ══════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY || ""
// Token admin pour autoriser l'écriture. Réutilise la clé bypass par défaut.
const ADMIN_TOKEN = process.env.SITE_CONFIG_TOKEN || process.env.DEVICE_BYPASS_KEY || "vita-bypass-2026"

const ROW_ID = "main"

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
  }
}

export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}

// Forme par défaut renvoyée si aucune config enregistrée
const DEFAULT_CONFIG = {
  contact: {
    wa: "212681736910",
    email: "commercial@vita-core.org",
    addr: "Zone Industrielle, Casablanca, Maroc",
    appUrl: "https://vitafresh.vitacore.ma/",
    fb: "",
    ig: "",
  },
  maintenance: { active: false, msg: "Site en maintenance — de retour très bientôt 🌿" },
}

async function readRow() {
  const res = await fetch(
    `${SB_URL}/rest/v1/fl_company_contacts?id=eq.${ROW_ID}&select=id,payload&limit=1`,
    { headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }, cache: "no-store" },
  )
  if (!res.ok) return null
  const rows = await res.json()
  return rows[0]?.payload ?? null
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json(DEFAULT_CONFIG, { headers: cors(origin) })
  try {
    const payload = await readRow()
    if (!payload) return NextResponse.json(DEFAULT_CONFIG, { headers: cors(origin) })
    // Merge sur les valeurs par défaut pour garantir la forme complète
    return NextResponse.json(
      {
        contact: { ...DEFAULT_CONFIG.contact, ...(payload.contact ?? {}) },
        maintenance: { ...DEFAULT_CONFIG.maintenance, ...(payload.maintenance ?? {}) },
        updatedAt: payload.updatedAt ?? null,
      },
      { headers: cors(origin) },
    )
  } catch {
    return NextResponse.json(DEFAULT_CONFIG, { headers: cors(origin) })
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ error: "service-role unavailable" }, { status: 500, headers: cors(origin) })

  // Auth : token admin
  const token = req.headers.get("x-admin-token") ?? ""
  if (token !== ADMIN_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: cors(origin) })
  }

  let body: { contact?: Record<string, unknown>; maintenance?: Record<string, unknown> }
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: cors(origin) }) }

  const prev = (await readRow()) ?? {}
  const now = new Date().toISOString()
  const payload = {
    ...prev,
    contact: { ...DEFAULT_CONFIG.contact, ...(prev as any).contact, ...(body.contact ?? {}) },
    maintenance: { ...DEFAULT_CONFIG.maintenance, ...(prev as any).maintenance, ...(body.maintenance ?? {}) },
    updatedAt: now,
  }

  const res = await fetch(`${SB_URL}/rest/v1/fl_company_contacts`, {
    method: "POST",
    headers: {
      apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id: ROW_ID, payload, updated_at: now }),
  })
  if (!res.ok) {
    const detail = await res.text()
    return NextResponse.json({ error: "upsert failed", detail }, { status: 500, headers: cors(origin) })
  }
  return NextResponse.json({ ok: true, payload }, { headers: cors(origin) })
}
