import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════════════════════
// /api/ext/send-email — envoi email côté SERVEUR (clé secrète jamais exposée)
//
// Fournisseurs (par préférence, détectés via variables d'env Vercel) :
//   1. Resend  — RESEND_API_KEY   (3000/mois gratuit)
//   2. Brevo   — BREVO_API_KEY    (300/jour gratuit)
//
// 🔧 Résilience Resend « domaine non vérifié » :
//   • Si l'envoi échoue car le domaine du FROM n'est pas vérifié, on interroge
//     Resend → /domains pour trouver un domaine VÉRIFIÉ et on réessaie avec
//     noreply@<domaine-vérifié> (auto-réparation : dès que vous vérifiez un
//     domaine dans Resend, l'envoi repart sans changer le code).
//   • En dernier recours, on tente onboarding@resend.dev (uniquement vers
//     l'email du compte Resend) pour ne pas perdre le message.
//
// Body: { to, subject, html?, text?, from?, replyTo? }
// ══════════════════════════════════════════════════════════════════════════════

const RESEND_KEY = process.env.RESEND_API_KEY || ""
const BREVO_KEY  = process.env.BREVO_API_KEY || ""
const FROM_DEFAULT = process.env.EMAIL_FROM || "Vita Fresh <support@vita-core.org>"

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}
export function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}

// Diagnostic : indique QUELS fournisseurs sont configurés (booléens, jamais les clés)
export function GET(req: NextRequest) {
  return NextResponse.json({
    providers: { brevo: !!BREVO_KEY, resend: !!RESEND_KEY },
    from: FROM_DEFAULT,
    preferred: BREVO_KEY ? "brevo" : RESEND_KEY ? "resend" : "none",
  }, { headers: cors(req.headers.get("origin")) })
}

const displayName = (from: string) => (from.match(/^(.*?)\s*</)?.[1] || "Vita Fresh").trim()

async function brevoSend(from: string, to: string, subject: string, html: string, text: string, replyTo?: string): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const m = from.match(/^(.*?)\s*<(.+)>$/)
  const sender = m ? { name: m[1].trim(), email: m[2].trim() } : { email: from }
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html || `<p>${text}</p>`, replyTo: replyTo ? { email: replyTo } : undefined }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, data }
}

interface ResendPayload { from: string; to: string[]; subject: string; html?: string; text?: string; reply_to?: string }

async function resendSend(p: ResendPayload): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(p),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// Cherche un domaine VÉRIFIÉ dans le compte Resend → renvoie "Name <noreply@domaine>"
async function resendVerifiedFrom(name: string): Promise<string | null> {
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${RESEND_KEY}` } })
    const d = await r.json().catch(() => ({}))
    const list: { name?: string; status?: string }[] = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d : []
    const verified = list.find(x => String(x.status).toLowerCase() === "verified" && x.name)
    return verified?.name ? `${name} <noreply@${verified.name}>` : null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  let body: { to?: string; subject?: string; html?: string; text?: string; from?: string; replyTo?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: cors(origin) }) }

  const to = String(body.to ?? "").trim()
  const subject = String(body.subject ?? "").trim()
  const html = body.html ?? (body.text ? `<pre style="font-family:inherit">${body.text}</pre>` : "")
  const text = body.text ?? ""
  const from = body.from ?? FROM_DEFAULT
  if (!to || !subject || (!html && !text)) {
    return NextResponse.json({ error: "to, subject et html/text requis" }, { status: 400, headers: cors(origin) })
  }

  // ── 0. Brevo PRIORITAIRE si configuré (pas de DNS requis, juste un sender vérifié)
  if (BREVO_KEY) {
    const r = await brevoSend(from, to, subject, html, text, body.replyTo)
    if (r.ok) return NextResponse.json({ ok: true, provider: "brevo", id: r.data?.messageId }, { headers: cors(origin) })
    // échec Brevo → on tente Resend si dispo, sinon on renvoie l'erreur Brevo
    if (!RESEND_KEY) {
      return NextResponse.json({ error: "brevo failed", detail: r.data, hint: "Vérifiez l'expéditeur (EMAIL_FROM) dans Brevo → Senders & IP, et la clé BREVO_API_KEY." }, { status: 502, headers: cors(origin) })
    }
  }

  // ── 1. Resend (avec auto-réparation du domaine) ───────────────────────────
  if (RESEND_KEY) {
    const base = { to: [to], subject, html: html || undefined, text: text || undefined, reply_to: body.replyTo }
    let r = await resendSend({ from, ...base })
    let usedFrom = from
    let note: string | undefined

    if (!r.ok && /not verified|domain|verify/i.test(String(r.data?.message ?? ""))) {
      // a) tenter un domaine vérifié existant
      const vFrom = await resendVerifiedFrom(displayName(from))
      if (vFrom && vFrom !== from) {
        const r2 = await resendSend({ from: vFrom, ...base })
        if (r2.ok) { r = r2; usedFrom = vFrom; note = `Domaine ${from} non vérifié → envoyé via ${vFrom}.` }
        else r = r2
      }
      // b) dernier recours : onboarding@resend.dev (vers l'email du compte uniquement)
      if (!r.ok) {
        const fb = `${displayName(from)} <onboarding@resend.dev>`
        const r3 = await resendSend({ from: fb, ...base })
        if (r3.ok) { r = r3; usedFrom = fb; note = "Aucun domaine vérifié → envoyé via onboarding@resend.dev (livré uniquement à l'email du compte Resend). Vérifiez vita-core.org dans Resend → Domains pour envoyer à tous." }
        else r = r3
      }
    }

    if (r.ok) return NextResponse.json({ ok: true, provider: "resend", id: r.data?.id, from: usedFrom, note }, { headers: cors(origin) })

    const msg = String(r.data?.message ?? "erreur Resend")
    const hint = /not verified|domain|verify/i.test(msg)
      ? "Domaine non vérifié dans Resend. Ajoutez vita-core.org dans Resend → Domains et publiez les enregistrements DNS (SPF/DKIM/DMARC). L'envoi repartira automatiquement une fois vérifié. (Le repli onboarding@resend.dev n'a pas pu livrer car le destinataire n'est pas l'email du compte Resend.)"
      : /api key/i.test(msg) ? "Clé RESEND_API_KEY invalide — recréez une clé dans Resend → API Keys."
      : undefined
    // Brevo (s'il est configuré) a déjà été tenté en amont → on renvoie l'erreur Resend
    return NextResponse.json({ error: `Resend: ${msg}`, detail: r.data, hint }, { status: 502, headers: cors(origin) })
  }

  // ── Aucun fournisseur configuré ──────────────────────────────────────────
  return NextResponse.json({
    error: "Aucun fournisseur email configuré",
    hint: "Définir RESEND_API_KEY (recommandé) ou BREVO_API_KEY dans les variables d'environnement Vercel.",
  }, { status: 501, headers: cors(origin) })
}
