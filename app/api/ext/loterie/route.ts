import { NextRequest, NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════════════
//  /api/ext/loterie — Roue de la Fortune (boutique). Source HONNÊTE :
//   • Config admin : fl_notices id="__loterie_config"
//       { active, seuilCible, segments:[{id,source,label,montant,type,code,image,
//         poids,dateDebut,dateFin,maxGagnants,ciblesAutorisees[]}] }
//   • Fallback auto : coupons ACTIFS de fl_coupons (module Codes Promo).
//  Compteurs gagnants : fl_notices id="__loterie_winners" { [segId]:{count,users[]} }.
//
//  GET                       → { active, seuilCible, rewards[] }  (filtrés dates+quotas)
//  POST {action:"claim",segmentId,userId} → { ok, coupon }  (incrément quota atomique-ish)
// ════════════════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}
const hdr = () => ({ apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`, "Content-Type": "application/json" })

type Cible = "tous" | "nouveau" | "client" | "vip" | "fournisseur"
interface Segment {
  id: string; source: string; label: string; montant: number; type: string
  code?: string | null; image?: string | null; poids: number
  dateDebut?: string | null; dateFin?: string | null
  maxGagnants?: number | null; ciblesAutorisees: Cible[]
}
interface Winners { [segId: string]: { count: number; users: string[] } }

async function readNotice<T>(id: string, fallback: T): Promise<T> {
  if (!SB_SRV) return fallback
  try {
    const r = await fetch(`${SB_URL}/rest/v1/fl_notices?id=eq.${id}&select=payload`, { headers: hdr(), cache: "no-store" })
    if (!r.ok) return fallback
    const rows = await r.json()
    return (rows?.[0]?.payload as T) ?? fallback
  } catch { return fallback }
}

// Fenêtre d'activation. Règle spéciale : pas de début mais une fin X → actif jusqu'à X.
function actif(seg: { dateDebut?: string | null; dateFin?: string | null }, now = Date.now()): boolean {
  if (seg.dateDebut && now < new Date(seg.dateDebut).getTime()) return false
  if (seg.dateFin   && now > new Date(seg.dateFin).getTime())   return false
  return true
}

// Construit les segments depuis les coupons actifs (module Codes Promo).
async function segmentsDepuisCoupons(): Promise<Segment[]> {
  if (!SB_SRV) return []
  try {
    const r = await fetch(`${SB_URL}/rest/v1/fl_coupons?select=id,payload`, { headers: hdr(), cache: "no-store" })
    if (!r.ok) return []
    const rows = (await r.json()) as Array<{ id: string; payload?: Record<string, unknown> }>
    return rows
      .filter(x => x.id && !String(x.id).startsWith("__") && (x.payload?.actif !== false))
      .map(x => {
        const p = x.payload ?? {}
        const valeur = Number(p.valeur) || 0
        return {
          id: `code:${x.id}`, source: "code", label: String(p.label ?? x.id),
          montant: valeur, type: p.type === "pourcentage" ? "pourcentage" : "reduction",
          code: String(x.id), image: (p.image as string) || null, poids: Number(p.poids) || 1,
          dateDebut: (p.dateDebut as string) ?? null, dateFin: (p.expire as string) ?? (p.dateFin as string) ?? null,
          maxGagnants: p.maxGagnants != null ? Number(p.maxGagnants) : null,
          ciblesAutorisees: (Array.isArray(p.ciblesAutorisees) ? p.ciblesAutorisees : ["tous"]) as Cible[],
        } as Segment
      })
  } catch { return [] }
}

export function OPTIONS(req: NextRequest) { return new NextResponse(null, { headers: cors(req.headers.get("origin")) }) }

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  const cfg = await readNotice<{ active?: boolean; seuilCible?: number; segments?: Segment[] }>("__loterie_config", {})
  const winners = await readNotice<Winners>("__loterie_winners", {})

  let segs: Segment[] = Array.isArray(cfg.segments) && cfg.segments.length ? cfg.segments : await segmentsDepuisCoupons()

  const rewards = segs
    .filter(s => actif(s))                                                   // plage de dates
    .map(s => ({ ...s, gagnants: winners[s.id]?.count ?? 0 }))
    .filter(s => s.maxGagnants == null || s.gagnants < s.maxGagnants)        // quota non atteint

  return NextResponse.json({
    // OPT-IN : la roue ne s'affiche que si l'admin l'a explicitement activée
    // (fl_notices __loterie_config { active:true }). Par défaut → dormante.
    active: cfg.active === true && rewards.length > 0,
    seuilCible: Number(cfg.seuilCible) || 5000,
    rewards,
  }, { headers: cors(origin) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service indisponible" }, { headers: cors(origin) })
  const body = await req.json().catch(() => ({} as { action?: string; segmentId?: string; userId?: string }))
  if (body.action !== "claim" || !body.segmentId) return NextResponse.json({ ok: false }, { headers: cors(origin) })

  const cfg = await readNotice<{ seuilCible?: number; segments?: Segment[] }>("__loterie_config", {})
  const segs = Array.isArray(cfg.segments) && cfg.segments.length ? cfg.segments : await segmentsDepuisCoupons()
  const seg = segs.find(s => s.id === body.segmentId)
  if (!seg || !actif(seg)) return NextResponse.json({ ok: false, error: "récompense indisponible" }, { headers: cors(origin) })

  const winners = await readNotice<Winners>("__loterie_winners", {})
  const w = winners[seg.id] ?? { count: 0, users: [] }
  if (seg.maxGagnants != null && w.count >= seg.maxGagnants) return NextResponse.json({ ok: false, error: "quota atteint" }, { headers: cors(origin) })
  if (body.userId && w.users.includes(body.userId)) return NextResponse.json({ ok: false, error: "déjà réclamé" }, { headers: cors(origin) })

  w.count += 1
  if (body.userId) w.users.push(body.userId)
  winners[seg.id] = w
  try {
    await fetch(`${SB_URL}/rest/v1/fl_notices`, {
      method: "POST", headers: { ...hdr(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: "__loterie_winners", payload: winners, updated_at: new Date().toISOString() }),
    })
  } catch { /* ignore */ }

  const seuil = Number(cfg.seuilCible) || 5000
  return NextResponse.json({
    ok: true,
    coupon: { code: seg.code ?? null, type: seg.type, montant: seg.montant, label: seg.label, seuil, dateFin: seg.dateFin ?? null },
  }, { headers: cors(origin) })
}
