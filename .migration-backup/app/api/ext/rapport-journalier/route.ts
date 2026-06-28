import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

// ══════════════════════════════════════════════════════════════════════════════
// /api/ext/rapport-journalier — Rapport quotidien (ventes/achats/marge/BL)
//
//   POST { to, subject, body } → envoi manuel (bouton "Envoyer maintenant",
//                                 données calculées côté client depuis le cache)
//   GET  ?send=1&key=…&to=…    → calcule (Supabase, données du jour) ET envoie
//                                 (clé = CRON_SECRET ou DEVICE_BYPASS_KEY)
//                                 Un cron Vercel quotidien (20h) appelle cette
//                                 route (voir vercel.json).
//
// L'envoi passe par sendEmail() → /api/ext/send-email (Resend/Brevo, jamais
// de SMTP brut — voir ce fichier pour le détail des fournisseurs).
// ══════════════════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""
const SEND_KEY = process.env.CRON_SECRET || process.env.DEVICE_BYPASS_KEY || "vita-bypass-2026"

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}
export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}

type Row = Record<string, unknown>
async function sbRows(table: string, limit = 4000): Promise<Row[]> {
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${table}?select=id,payload&limit=${limit}`, {
      headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }, cache: "no-store",
    })
    if (!res.ok) return []
    const rows = await res.json() as { id: string; payload?: Row }[]
    return rows.map(r => ({ id: r.id, ...(r.payload ?? {}) }))
  } catch { return [] }
}

const N = (x: unknown) => Number(x ?? 0) || 0
const S = (x: unknown) => String(x ?? "")
const fmtMAD = (n: number) => `${n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`
const day = (d: unknown) => S(d).slice(0, 10)

async function buildReport(dateJ: string) {
  const [commandes, bonsAchat, bls] = await Promise.all([
    sbRows("fl_commandes"), sbRows("fl_bons_achat"), sbRows("fl_bons_livraison"),
  ])

  const cmdsJour = commandes.filter(c => day(c.date) === dateJ)
  const bonsJour = bonsAchat.filter(b => day(b.date) === dateJ)
  const blsJour = bls.filter(b => day(b.date) === dateJ)

  const totalVentes = cmdsJour.reduce((s, c) => {
    const lignes = Array.isArray(c.lignes) ? c.lignes as Row[] : []
    return s + lignes.reduce((t, l) => t + N(l.total), 0)
  }, 0)
  const totalAchats = bonsJour.reduce((s, b) => {
    const lignes = Array.isArray(b.lignes) ? b.lignes as Row[] : []
    return s + lignes.reduce((t, l) => t + N(l.quantite) * N(l.prixUnitaire ?? l.prixAchat), 0)
  }, 0)
  const margeJour = totalVentes - totalAchats
  const margePct = totalVentes > 0 ? (margeJour / totalVentes * 100) : 0

  const body = `RAPPORT JOURNALIER — FreshLink Vita Fresh
Date : ${dateJ}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 COMMERCIAL
• Commandes du jour : ${cmdsJour.length}
• Total Ventes : ${fmtMAD(totalVentes)}

🛒 ACHATS
• Bons d'achat : ${bonsJour.length}
• Total Achats : ${fmtMAD(totalAchats)}

💰 MARGE BRUTE DU JOUR
• Marge : ${fmtMAD(margeJour)} (${margePct.toFixed(1)}%)

🚛 LIVRAISONS
• BL du jour : ${blsJour.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Envoyé automatiquement par FreshLink Vita Fresh
© ${new Date().getFullYear()} Vita Fresh — Casablanca`

  return { dateJ, body, totalVentes, totalAchats, margeJour, nbCommandes: cmdsJour.length, nbBonsAchat: bonsJour.length, nbBls: blsJour.length }
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  if (!SB_SRV) return NextResponse.json({ error: "service-role unavailable" }, { status: 500, headers: cors(origin) })

  const dateJ = req.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0, 10)
  const wantSend = req.nextUrl.searchParams.get("send") === "1"
  if (!wantSend) {
    const rep = await buildReport(dateJ)
    return NextResponse.json(rep, { headers: cors(origin) })
  }

  const key = req.nextUrl.searchParams.get("key") ?? req.headers.get("authorization")?.replace("Bearer ", "") ?? ""
  if (key !== SEND_KEY) {
    return NextResponse.json({ error: "clé d'envoi invalide" }, { status: 401, headers: cors(origin) })
  }
  const to = req.nextUrl.searchParams.get("to") || process.env.REPORT_EMAIL || "contact@vita-core.org"
  const rep = await buildReport(dateJ)
  const r = await sendEmail({ to_email: to, subject: `Rapport Journalier Vita Fresh — ${dateJ}`, body: rep.body })
  if (!r.ok) return NextResponse.json({ ...rep, emailSent: false, error: r.error }, { status: 502, headers: cors(origin) })
  return NextResponse.json({ ...rep, emailSent: true }, { headers: cors(origin) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  let payload: { to?: string; subject?: string; body?: string }
  try { payload = await req.json() } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: cors(origin) }) }
  const { to, subject, body } = payload
  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400, headers: cors(origin) })
  }
  const r = await sendEmail({ to_email: to, subject, body })
  if (!r.ok) return NextResponse.json({ error: r.error ?? "Email send failed" }, { status: 502, headers: cors(origin) })
  return NextResponse.json({ ok: true }, { headers: cors(origin) })
}
