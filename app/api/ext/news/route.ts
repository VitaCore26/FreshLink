import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════════
// /api/ext/news — Actualités de la boutique (persistées en Supabase)
//   GET            → { ok, items }            (public — le site les lit)
//   POST { items, password } → publie         (mot de passe admin requis)
// Stocké dans fl_notices, ligne id = "site_news", payload = { items }.
// Mot de passe vérifié côté serveur : env SHOP_ADMIN_PASSWORD (jamais en clair
// dans le code). Si l'env n'est pas définie, la publication est refusée.
// ══════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""
const ADMIN_PWD = process.env.SHOP_ADMIN_PASSWORD ?? ""

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin":  origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: true, items: [] }, { headers: cors(origin) })
  try {
    const res = await fetch(`${SB_URL}/rest/v1/fl_notices?id=eq.site_news&select=payload`, {
      headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }, cache: "no-store",
    })
    const rows = res.ok ? await res.json() : []
    const items = Array.isArray(rows[0]?.payload?.items) ? rows[0].payload.items : []
    return NextResponse.json({ ok: true, items }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), items: [] }, { headers: cors(origin) })
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  let body: { items?: unknown[]; password?: string } = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400, headers: cors(origin) })
  }

  // Authentification admin (mot de passe serveur)
  if (!ADMIN_PWD) {
    return NextResponse.json({ ok: false, error: "Publication désactivée : variable SHOP_ADMIN_PASSWORD non configurée sur Vercel." }, { status: 403, headers: cors(origin) })
  }
  if ((body.password ?? "") !== ADMIN_PWD) {
    return NextResponse.json({ ok: false, error: "Mot de passe admin invalide." }, { status: 401, headers: cors(origin) })
  }
  if (!Array.isArray(body.items)) {
    return NextResponse.json({ ok: false, error: "items requis (tableau)" }, { status: 400, headers: cors(origin) })
  }

  try {
    await fetch(`${SB_URL}/rest/v1/fl_notices`, {
      method: "POST",
      headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: "site_news", payload: { items: body.items }, updated_at: new Date().toISOString() }),
    })
    return NextResponse.json({ ok: true, count: body.items.length }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}
