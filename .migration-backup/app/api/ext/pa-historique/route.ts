import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════════
// /api/ext/pa-historique — Saisie PA marché de gros (Section 5)
//   Table : fl_pa_historique
//   Alimente la fonction SQL fl_pa_predit (pricing dynamique)
//
//   GET                              → liste tout (200 dernières)
//   GET ?article=VFP00046            → historique d'un article
//   GET ?fournisseur=VFS00001        → historique d'un fournisseur
//   GET ?dateMin=YYYY-MM-DD&dateMax=…
//   POST { articleId, fournisseurId, pa, volumeKg, dateMarche }
//   DELETE ?id=...
// ══════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin":  origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  const article     = req.nextUrl.searchParams.get("article")
  const fournisseur = req.nextUrl.searchParams.get("fournisseur")
  const dateMin     = req.nextUrl.searchParams.get("dateMin")
  const dateMax     = req.nextUrl.searchParams.get("dateMax")

  try {
    // Schéma JSONB unifié : {id, payload, updated_at}. On lit le payload et on
    // filtre/trie côté serveur (les colonnes plates date_marche/article_id n'existent pas).
    const res = await sbFetch("fl_pa_historique?select=id,payload,updated_at&limit=2000")
    if (!res.ok) throw new Error(await res.text())
    const raw = await res.json() as { id: string; payload: Record<string, unknown>; updated_at: string }[]
    let rows: Record<string, unknown>[] = (Array.isArray(raw) ? raw : [])
      .filter(r => !String(r.id).startsWith("__"))
      .map(r => ({ id: r.id, ...(r.payload ?? {}), created_at: (r.payload?.created_at as string) ?? r.updated_at } as Record<string, unknown>))
    if (article)     rows = rows.filter(r => String(r.article_id ?? "") === article)
    if (fournisseur) rows = rows.filter(r => String(r.fournisseur_id ?? "") === fournisseur)
    if (dateMin)     rows = rows.filter(r => String(r.date_marche ?? "") >= dateMin)
    if (dateMax)     rows = rows.filter(r => String(r.date_marche ?? "") <= dateMax)
    rows.sort((a, b) => String(b.date_marche ?? "").localeCompare(String(a.date_marche ?? "")) || String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
    return NextResponse.json({ ok: true, data: rows.slice(0, 500) }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400, headers: cors(origin) })
  }

  const article = String(body.articleId ?? "")
  const pa      = Number(body.pa ?? 0) || 0
  if (!article)  return NextResponse.json({ ok: false, error: "articleId requis" }, { status: 400, headers: cors(origin) })
  if (pa <= 0)   return NextResponse.json({ ok: false, error: "pa doit être > 0" }, { status: 400, headers: cors(origin) })

  const id = "PA" + Date.now().toString(36).toUpperCase()
  const now = new Date().toISOString()
  const payload = {
    article_id:     article,
    fournisseur_id: body.fournisseurId ? String(body.fournisseurId) : null,
    pa,
    volume_kg:      Number(body.volumeKg ?? 0) || 0,
    date_marche:    body.dateMarche ? String(body.dateMarche) : now.slice(0, 10),
    created_at:     now,
  }

  try {
    const res = await sbFetch("fl_pa_historique", {
      method: "POST",
      headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id, payload, updated_at: now }),
    })
    if (!res.ok) throw new Error(await res.text())
    return NextResponse.json({ ok: true, entry: { id, ...payload } }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

export async function DELETE(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ ok: false, error: "id requis" }, { status: 400, headers: cors(origin) })

  try {
    const res = await sbFetch(`fl_pa_historique?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" })
    if (!res.ok) throw new Error(await res.text())
    return NextResponse.json({ ok: true }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}
