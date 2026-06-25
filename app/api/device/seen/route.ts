import { NextRequest, NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/device/seen — "battement" appelé au chargement de l'app par chaque
//  appareil connecté. Met à jour fl_site_access : last_seen + historique des
//  connexions (horodatages, capés à 50, anti-spam 5 min). Alimente l'historique
//  affiché dans « Accès Appareils ». Chemin public (pas de device-guard).
// ════════════════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""

export async function POST(req: NextRequest) {
  if (!SB_SRV) return NextResponse.json({ ok: false })
  const body = await req.json().catch(() => ({} as { fingerprint?: string; nom?: string; userAgent?: string }))
  const fingerprint = String(body.fingerprint || "")
  if (!fingerprint || fingerprint.length < 8) return NextResponse.json({ ok: false })

  const hdr = { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`, "Content-Type": "application/json" }
  let payload: Record<string, unknown> = {}
  try {
    const r = await fetch(`${SB_URL}/rest/v1/fl_site_access?id=eq.${encodeURIComponent(fingerprint)}&select=payload`, { headers: hdr, cache: "no-store" })
    if (r.ok) { const rows = await r.json(); payload = (rows?.[0]?.payload as Record<string, unknown>) ?? {} }
  } catch { /* repli */ }

  const now = new Date().toISOString()
  const history: string[] = Array.isArray(payload.connections) ? (payload.connections as string[]) : []
  // Anti-spam : on n'ajoute un point d'historique que si > 5 min depuis le dernier.
  const last = history[history.length - 1]
  if (!last || Date.now() - new Date(last).getTime() > 5 * 60 * 1000) history.push(now)

  const next = {
    ...payload,
    device_id:      payload.device_id ?? fingerprint,
    first_visit_at: payload.first_visit_at ?? now,
    last_seen:      now,
    connections:    history.slice(-50),
    ...(body.nom && !payload.nom ? { nom: body.nom } : {}),
    ...(body.userAgent && !payload.user_agent ? { user_agent: body.userAgent } : {}),
    statut: payload.statut ?? "en_attente",
  }
  try {
    await fetch(`${SB_URL}/rest/v1/fl_site_access`, {
      method: "POST",
      headers: { ...hdr, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ id: fingerprint, payload: next, updated_at: now }),
    })
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true })
}
