import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════════
// /api/ext/bonus-matrix — CRUD matrice bonus (Section 3)
//   Table : fl_bonus_matrix (segment × famille)
//
//   GET                  → liste toute la matrice
//   POST  { segment, famille, tauxCa, tauxTonnage, coefMarge }
//   PATCH { id, ...patch }
//   DELETE ?id=...
//
//   Le calcul réel du bonus est dans la fonction SQL fl_calc_bonus
//   (garde-fou plafond global) appelée via /api/ext/commercial
// ══════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin":  origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

async function sbFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      apikey: SB_SRV,
      Authorization: `Bearer ${SB_SRV}`,
    },
    cache: "no-store",
  })
}

const VALID_SEGMENTS = ["chr", "marchand", "particulier"] as const

// ═══ GET ═══════════════════════════════════════════════════════════
export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  try {
    // Schéma JSONB {id, payload, updated_at} : les colonnes plates segment/famille
    // n'existent pas (→ 42703). On lit le payload et on trie en JS.
    const res = await sbFetch("fl_bonus_matrix?select=id,payload&limit=500")
    if (!res.ok) throw new Error(await res.text())
    const raw = await res.json() as { id: string; payload: Record<string, unknown> }[]
    const data = (Array.isArray(raw) ? raw : [])
      .filter(r => !String(r.id).startsWith("__"))
      .map(r => ({ id: r.id, ...(r.payload ?? {}) }) as Record<string, unknown>)
      .sort((a, b) => String(a.segment ?? "").localeCompare(String(b.segment ?? "")) || String(a.famille ?? "").localeCompare(String(b.famille ?? "")))
    return NextResponse.json({ ok: true, data }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

// ═══ POST ══════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400, headers: cors(origin) })
  }

  const segment = String(body.segment ?? "")
  if (!VALID_SEGMENTS.includes(segment as (typeof VALID_SEGMENTS)[number])) {
    return NextResponse.json({ ok: false, error: `segment invalide (${VALID_SEGMENTS.join(", ")})` }, { status: 400, headers: cors(origin) })
  }

  const famille = body.famille ? String(body.famille) : "TOUTES"
  // Unicité (segment, famille) → id déterministe (remplace la contrainte unique SQL)
  const slug = (s: string) => s.normalize("NFD").replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()
  const id = body.id ? String(body.id) : `BM_${slug(segment)}_${slug(famille)}`
  const payload = {
    segment,
    famille,
    taux_ca:      Number(body.tauxCa ?? 0)      || 0,
    taux_tonnage: Number(body.tauxTonnage ?? 0) || 0,
    coef_marge:   Number(body.coefMarge ?? 1)   || 1,
    actif:        body.actif === false ? false : true,
  }

  try {
    const res = await sbFetch("fl_bonus_matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id, payload, updated_at: new Date().toISOString() }),
    })
    if (!res.ok) throw new Error(await res.text())
    return NextResponse.json({ ok: true, cell: { id, ...payload } }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

// ═══ PATCH ═════════════════════════════════════════════════════════
export async function PATCH(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400, headers: cors(origin) })
  }
  if (!body.id) return NextResponse.json({ ok: false, error: "id requis" }, { status: 400, headers: cors(origin) })

  const id = String(body.id)
  const patch: Record<string, unknown> = {}
  if (body.tauxCa      !== undefined) patch.taux_ca      = Number(body.tauxCa) || 0
  if (body.tauxTonnage !== undefined) patch.taux_tonnage = Number(body.tauxTonnage) || 0
  if (body.coefMarge   !== undefined) patch.coef_marge   = Number(body.coefMarge) || 1
  if (body.actif       !== undefined) patch.actif        = body.actif === true
  if (body.famille     !== undefined) patch.famille      = String(body.famille)
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: false, error: "rien à modifier" }, { status: 400, headers: cors(origin) })

  try {
    // JSONB : lire le payload existant, fusionner, ré-upsert
    const getRes = await sbFetch(`fl_bonus_matrix?id=eq.${encodeURIComponent(id)}&select=payload`)
    const existing = getRes.ok ? await getRes.json() : []
    const current = (Array.isArray(existing) && existing[0]?.payload) ? existing[0].payload as Record<string, unknown> : {}
    const merged = { ...current, ...patch }
    const res = await sbFetch("fl_bonus_matrix", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id, payload: merged, updated_at: new Date().toISOString() }),
    })
    if (!res.ok) throw new Error(await res.text())
    return NextResponse.json({ ok: true, cell: { id, ...merged } }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

// ═══ DELETE ════════════════════════════════════════════════════════
export async function DELETE(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ ok: false, error: "id requis" }, { status: 400, headers: cors(origin) })

  try {
    const res = await sbFetch(`fl_bonus_matrix?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" })
    if (!res.ok) throw new Error(await res.text())
    return NextResponse.json({ ok: true }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}
