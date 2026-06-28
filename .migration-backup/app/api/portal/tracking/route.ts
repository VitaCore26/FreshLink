import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════
// POST /api/portal/tracking  — push a tracking transition
//
// Body: {
//   commandeId: string
//   etape: "recue" | "preparation" | "chargement" | "route" | "livree"
//   chauffeur?: string
//   eta?: string             // ISO 8601 or HH:mm
//   gpsLat?: number
//   gpsLng?: number
//   position?: string        // free text address / landmark
// }
//
// Behaviour:
//   - Upserts a row in fl_tracking keyed by commandeId
//   - Appends to payload.pipeline = [{step, at}]
//   - The boutique portal subscribes to fl_tracking via Supabase Realtime
//     so the client sees the update immediately.
// ══════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY || ""

const STEPS = ["recue", "preparation", "chargement", "route", "livree"] as const
type Step = typeof STEPS[number]

export async function POST(req: NextRequest) {
  if (!SB_SRV) return NextResponse.json({ error: "service-role unavailable" }, { status: 500 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }) }

  const commandeId = String(body.commandeId ?? "").trim()
  const etape = String(body.etape ?? "").trim() as Step
  if (!commandeId) return NextResponse.json({ error: "commandeId required" }, { status: 400 })
  if (!STEPS.includes(etape)) return NextResponse.json({ error: `etape must be one of ${STEPS.join(", ")}` }, { status: 400 })

  const headers = { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`, "Content-Type": "application/json" }

  // Fetch existing tracking row for this commande
  const existingRes = await fetch(`${SB_URL}/rest/v1/fl_tracking?payload->>commandeId=eq.${encodeURIComponent(commandeId)}&select=id,payload&limit=1`, {
    headers, cache: "no-store",
  })
  const existing = existingRes.ok ? await existingRes.json() : []
  const prev = existing[0]?.payload ?? {}
  const prevPipeline: { step: Step; at: string }[] = Array.isArray(prev.pipeline) ? prev.pipeline : []

  const now = new Date().toISOString()
  const pipeline = [...prevPipeline.filter(p => p.step !== etape), { step: etape, at: now }]

  const newPayload: Record<string, unknown> = {
    ...prev,
    commandeId,
    etape,
    pipeline,
    chauffeur: body.chauffeur ?? prev.chauffeur,
    eta:       body.eta       ?? prev.eta,
    gpsLat:    body.gpsLat    ?? prev.gpsLat,
    gpsLng:    body.gpsLng    ?? prev.gpsLng,
    position:  body.position  ?? prev.position,
    updatedAt: now,
  }

  const id = String(existing[0]?.id ?? `TRK-${commandeId}`)
  const row = { id, payload: newPayload, updated_at: now }

  const upsertRes = await fetch(`${SB_URL}/rest/v1/fl_tracking`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(row),
  })
  if (!upsertRes.ok) {
    const err = await upsertRes.text()
    return NextResponse.json({ error: "upsert failed", detail: err }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id, etape, pipeline })
}
