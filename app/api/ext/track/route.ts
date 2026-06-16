import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════════
// /api/ext/track — Compteur analytics boutique (shop.vita-core.org)
//   POST { type: "view" | "click", page?, label? }
//   Agrège par jour dans fl_shop_analytics (id = "YYYY-MM-DD", payload JSONB).
//   Région déduite des en-têtes géo Vercel (pays/ville) — pas de cookie.
// ══════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin":  origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

interface DayStats {
  visits: number
  clicks: number
  pages:   Record<string, number>
  regions: Record<string, number>
  events:  Record<string, number>
}

const EMPTY: DayStats = { visits: 0, clicks: 0, pages: {}, regions: {}, events: {} }

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  let body: { type?: string; page?: string; label?: string } = {}
  try { body = await req.json() } catch { /* tracking best-effort */ }

  const type = body.type === "click" ? "click" : "view"
  const page = (body.page ?? "").toString().slice(0, 60)
  const label = (body.label ?? "").toString().slice(0, 60)
  const country = req.headers.get("x-vercel-ip-country") || "??"
  const city = req.headers.get("x-vercel-ip-city") || ""
  const region = city ? `${country} · ${decodeURIComponent(city)}` : country

  const today = new Date().toISOString().slice(0, 10)
  const headers = { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`, "Content-Type": "application/json" }

  try {
    // Lire l'agrégat du jour
    const getRes = await fetch(`${SB_URL}/rest/v1/fl_shop_analytics?id=eq.${today}&select=payload`, { headers, cache: "no-store" })
    const rows = getRes.ok ? await getRes.json() : []
    const cur: DayStats = { ...EMPTY, ...(rows[0]?.payload ?? {}) }
    cur.pages = { ...cur.pages }; cur.regions = { ...cur.regions }; cur.events = { ...cur.events }

    if (type === "view") cur.visits = (cur.visits || 0) + 1
    if (type === "click") cur.clicks = (cur.clicks || 0) + 1
    if (page) cur.pages[page] = (cur.pages[page] || 0) + 1
    if (region) cur.regions[region] = (cur.regions[region] || 0) + 1
    if (label) cur.events[label] = (cur.events[label] || 0) + 1

    // Upsert (merge-duplicates sur id)
    await fetch(`${SB_URL}/rest/v1/fl_shop_analytics`, {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: today, payload: cur, updated_at: new Date().toISOString() }),
    })
    return NextResponse.json({ ok: true }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}
