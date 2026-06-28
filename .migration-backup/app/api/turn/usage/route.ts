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

type UserStat = { name: string; calls: number; seconds: number; gb: number }

export async function POST(req: NextRequest) {
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "no service role" })
  const body = await req.json().catch(() => ({} as { seconds?: number; userId?: string; userName?: string }))
  // Borne la durée (0 → 6h) pour neutraliser toute valeur aberrante.
  const seconds = Math.max(0, Math.min(Number(body.seconds) || 0, 6 * 3600))
  if (seconds <= 0) return NextResponse.json({ ok: true, skipped: true })
  const userId   = String(body.userId || "").slice(0, 64)
  const userName = String(body.userName || "").slice(0, 80)

  const id = monthKey()
  const hdr = { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`, "Content-Type": "application/json" }
  const gbOf = (s: number) => Math.round((s / 60) * GB_PER_MIN * 1000) / 1000

  let cur: { calls: number; seconds: number; gb: number; byUser?: Record<string, UserStat> } = { calls: 0, seconds: 0, gb: 0 }
  try {
    const r = await fetch(`${SB_URL}/rest/v1/fl_notices?id=eq.${id}&select=payload`, { headers: hdr, cache: "no-store" })
    if (r.ok) { const rows = await r.json(); if (rows?.[0]?.payload) cur = rows[0].payload }
  } catch { /* repli sur 0 */ }

  // Cumul par utilisateur (suivi de l'utilisation des appels PAR PERSONNE).
  const byUser: Record<string, UserStat> = { ...(cur.byUser || {}) }
  if (userId) {
    const u = byUser[userId] || { name: userName, calls: 0, seconds: 0, gb: 0 }
    u.name = userName || u.name
    u.calls += 1
    u.seconds += seconds
    u.gb = gbOf(u.seconds)
    byUser[userId] = u
  }

  const totSeconds = (cur.seconds || 0) + seconds
  const next = {
    calls:   (cur.calls || 0) + 1,
    seconds: totSeconds,
    gb:      gbOf(totSeconds),
    byUser,
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
