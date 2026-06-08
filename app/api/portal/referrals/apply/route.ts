import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════
// POST /api/portal/referrals/apply
// Body: { parrainCode: string, filleulClientId: string }
//
// Called after signup when ?parrain=CODE was in the URL. The CODE format is
// "VITA-XXXXXX" where XXXXXX is the last 6 chars of the parrain's clientId.
// Records a new fl_referrals row with statut="pending" and the agreed reward
// shape — credit is only issued on the first delivered order (see /convert).
// ══════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://jwdrwapuetqoqnankgma.supabase.co"
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY || ""

interface RewardConfig {
  parrain_credit: number   // MAD credited to the parrain on conversion
  filleul_credit: number   // MAD credited to the filleul on first delivered order
}
const DEFAULT_REWARD: RewardConfig = { parrain_credit: 50, filleul_credit: 30 }
const DEFAULT_REWARD_CHR: RewardConfig = { parrain_credit: 200, filleul_credit: 100 }

async function sbGetAll(table: string, filter: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}&select=id,payload`, {
    headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }, cache: "no-store",
  })
  if (!res.ok) return []
  return (await res.json()).map((r: any) => ({ id: r.id, ...(r.payload ?? {}) }))
}

async function sbUpsert(table: string, row: { id: string; payload: Record<string, unknown>; updated_at: string }) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  })
  return res.ok
}

function decodeCode(code: string): string | null {
  // Code format = "VITA-<last 6 of clientId>". Returns the suffix or null.
  const match = code.trim().match(/^VITA-([A-Z0-9]{4,12})$/i)
  return match ? match[1].toUpperCase() : null
}

export async function POST(req: NextRequest) {
  if (!SB_SRV) return NextResponse.json({ error: "service-role unavailable" }, { status: 500 })

  let body: { parrainCode?: string; filleulClientId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }) }

  const parrainCode = String(body.parrainCode ?? "").trim()
  const filleulId = String(body.filleulClientId ?? "").trim()
  if (!parrainCode || !filleulId) return NextResponse.json({ error: "parrainCode and filleulClientId required" }, { status: 400 })

  const suffix = decodeCode(parrainCode)
  if (!suffix) return NextResponse.json({ error: "code format invalide (attendu VITA-XXXXXX)" }, { status: 400 })

  // Find parrain — a client whose id ends with the suffix
  const allClients = await sbGetAll("fl_clients", "limit=2000")
  const parrain = allClients.find((c: any) => String(c.id ?? "").toUpperCase().endsWith(suffix))
  if (!parrain) return NextResponse.json({ error: "code parrain introuvable" }, { status: 404 })

  if (parrain.id === filleulId) {
    return NextResponse.json({ error: "auto-parrainage non autorise" }, { status: 400 })
  }

  // Prevent duplicate referrals
  const existing = await sbGetAll("fl_referrals", `payload->>filleul_id=eq.${encodeURIComponent(filleulId)}&limit=1`)
  if (existing.length > 0) {
    return NextResponse.json({ ok: true, alreadyApplied: true, referralId: existing[0].id })
  }

  // Reward tier: CHR/marchand get the larger pot
  const filleul = allClients.find((c: any) => c.id === filleulId)
  const isPro = ["chr", "marchand", "professionnel"].includes(String(filleul?.categorie ?? "").toLowerCase())
  const reward = isPro ? DEFAULT_REWARD_CHR : DEFAULT_REWARD

  const now = new Date().toISOString()
  const referralId = `REF-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const payload = {
    parrain_id: parrain.id,
    parrain_nom: parrain.nom,
    filleul_id: filleulId,
    filleul_nom: filleul?.nom ?? null,
    parrainCode,
    statut: "pending" as const,    // pending → converti (on first delivered order)
    reward,
    createdAt: now,
  }
  await sbUpsert("fl_referrals", { id: referralId, payload, updated_at: now })

  return NextResponse.json({ ok: true, referralId, parrainId: parrain.id, reward })
}
