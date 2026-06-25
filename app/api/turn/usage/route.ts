import { NextRequest, NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════════════
//  /api/turn/usage — incrémente le compteur mensuel d'utilisation TURN.
//  Appelé par CallCenter à la fin d'un appel ayant utilisé le relais Cloudflare.
//  Estimation : ~2 Mo/min d'audio relayé (TURN_GB_PER_MIN configurable).
//  Stocké dans fl_notices id="turn_usage_YYYY-MM" payload {calls, seconds, gb}.
// ════════════════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""
const GB_PER_MIN = Number(process.env.TURN_GB_PER_MIN ?? "0.002")  // ~2 Mo/min (estimation prudente)

function monthKey(): string { return `turn_usage_${new Date().toISOString().slice(0, 7)}` }

export async function POST(req: NextRequest) {
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "no service role" })
  const body = await req.json().catch(() => ({} as { seconds?: number }))
  // Borne la durée (0 → 6h) pour neutraliser toute valeur aberrante.
  const seconds = Math.max(0, Math.min(Number(body.seconds) || 0, 6 * 3600))
  if (seconds <= 0) return NextResponse.json({ ok: true, skipped: true })

  const id = monthKey()
  const hdr = { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`, "Content-Type": "application/json" }

  // Lit la valeur courante puis ré-écrit (merge-duplicates). Volume d'appels
  // faible (petite équipe) → la course est négligeable.
  let cur = { calls: 0, seconds: 0, gb: 0 }
  try {
    const r = await fetch(`${SB_URL}/rest/v1/fl_notices?id=eq.${id}&select=payload`, { headers: hdr, cache: "no-store" })
    if (r.ok) { const rows = await r.json(); if (rows?.[0]?.payload) cur = rows[0].payload }
  } catch { /* repli sur 0 */ }

  const totSeconds = (cur.seconds || 0) + seconds
  const next = {
    calls:   (cur.calls || 0) + 1,
    seconds: totSeconds,
    gb:      Math.round((totSeconds / 60) * GB_PER_MIN * 1000) / 1000,
    updated_at: new Date().toISOString(),
  }
  try {
    await fetch(`${SB_URL}/rest/v1/fl_notices`, {
      method: "POST",
      headers: { ...hdr, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id, payload: next, updated_at: new Date().toISOString() }),
    })
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true, usage: next })
}
