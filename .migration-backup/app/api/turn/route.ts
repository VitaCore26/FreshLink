import { NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════════════
//  /api/turn — fournit des identifiants TURN éphémères Cloudflare au client.
//  Le token API Cloudflare reste CÔTÉ SERVEUR (jamais dans le bundle public).
//  POST → { iceServers, source, usage, cap_gb }  (STUN seul si quota atteint)
//  GET  → { usage, cap_gb, month }  (suivi d'utilisation pour l'admin)
//  Protégé par le device-guard (middleware) : seul un appareil autorisé mint.
// ════════════════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""
const TURN_ID  = process.env.TURN_TOKEN_ID ?? ""
const TURN_TOK = process.env.TURN_API_TOKEN ?? ""
const CAP_GB   = Number(process.env.TURN_CAP_GB ?? "1000")   // quota mensuel (défaut 1000 Go)

// Repli sans relais dédié (STUN public) — l'appel tente quand même la connexion.
const STUN_ONLY = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun.cloudflare.com:3478"] }]

function monthKey(): string { return `turn_usage_${new Date().toISOString().slice(0, 7)}` }

type UserStat = { name: string; calls: number; seconds: number; gb: number }
type Usage = { calls: number; seconds: number; gb: number; byUser?: Record<string, UserStat>; updated_at?: string }

async function readUsage(): Promise<Usage> {
  const empty: Usage = { calls: 0, seconds: 0, gb: 0, byUser: {} }
  if (!SB_SRV) return empty
  try {
    const r = await fetch(`${SB_URL}/rest/v1/fl_notices?id=eq.${monthKey()}&select=payload`, {
      headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }, cache: "no-store",
    })
    if (!r.ok) return empty
    const rows = await r.json()
    const p = rows?.[0]?.payload
    return p ? { calls: p.calls ?? 0, seconds: p.seconds ?? 0, gb: p.gb ?? 0, byUser: p.byUser ?? {} } : empty
  } catch { return empty }
}

// Liste des utilisateurs dont les appels sont DÉSACTIVÉS (fl_notices __calls_disabled).
async function readDisabled(): Promise<string[]> {
  if (!SB_SRV) return []
  try {
    const r = await fetch(`${SB_URL}/rest/v1/fl_notices?id=eq.__calls_disabled&select=payload`, {
      headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }, cache: "no-store",
    })
    if (!r.ok) return []
    const rows = await r.json()
    const ids = rows?.[0]?.payload?.userIds
    return Array.isArray(ids) ? ids : []
  } catch { return [] }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as { userId?: string }))
  const userId = String(body.userId || "")

  // Appels désactivés pour cet utilisateur → on refuse le relais (STUN seul).
  if (userId && (await readDisabled()).includes(userId)) {
    return NextResponse.json({ iceServers: STUN_ONLY, source: "disabled", disabled: true, cap_gb: CAP_GB })
  }

  const usage  = await readUsage()
  const capped = (usage.gb ?? 0) >= CAP_GB

  // Quota atteint OU TURN non configuré → STUN seul (aucun coût de relais).
  if (capped || !TURN_ID || !TURN_TOK) {
    return NextResponse.json({
      iceServers: STUN_ONLY, usage, cap_gb: CAP_GB,
      source: capped ? "capped" : "stun-only",
    })
  }

  try {
    const cf = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${TURN_ID}/credentials/generate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TURN_TOK}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 3600 }),   // créds valides 1h (durée d'un appel)
      cache: "no-store",
    })
    if (!cf.ok) return NextResponse.json({ iceServers: STUN_ONLY, usage, cap_gb: CAP_GB, source: "stun-fallback" })
    const data = await cf.json()
    // Cloudflare renvoie UN objet {urls[],username,credential} → format tableau RTCIceServer.
    const ice = data?.iceServers ? [data.iceServers] : STUN_ONLY
    return NextResponse.json({ iceServers: ice, usage, cap_gb: CAP_GB, source: "cloudflare" })
  } catch {
    return NextResponse.json({ iceServers: STUN_ONLY, usage, cap_gb: CAP_GB, source: "stun-fallback" })
  }
}

export async function GET() {
  const [usage, disabled] = await Promise.all([readUsage(), readDisabled()])
  const pct = CAP_GB > 0 ? Math.round((usage.gb / CAP_GB) * 1000) / 10 : 0
  return NextResponse.json({ usage, cap_gb: CAP_GB, percent: pct, month: monthKey().replace("turn_usage_", ""), disabled })
}
