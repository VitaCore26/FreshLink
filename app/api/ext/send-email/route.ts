import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════════════════════
// /api/ext/send-email — Alternative serveur à EmailJS
//
// EmailJS = envoi côté navigateur avec clés exposées + quota limité. Ici on
// envoie côté SERVEUR (clé secrète jamais exposée). Fournisseurs supportés,
// par ordre de préférence (détectés via variables d'env Vercel) :
//
//   1. Resend          — RESEND_API_KEY        (recommandé : 3000/mois gratuit)
//   2. Brevo (Sendinblue) — BREVO_API_KEY      (300/jour gratuit)
//   3. SMTP générique  — non géré ici (utiliser un de ces deux)
//
// Body: { to, subject, html?, text?, from?, replyTo? }
// ══════════════════════════════════════════════════════════════════════════════

const RESEND_KEY = process.env.RESEND_API_KEY || ""
const BREVO_KEY  = process.env.BREVO_API_KEY || ""
const FROM_DEFAULT = process.env.EMAIL_FROM || "Vita Fresh <contact@vita-core.org>"

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

  // ── 1. Resend ────────────────────────────────────────────────────────────
  if (RESEND_KEY) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject, html: html || undefined, text: text || undefined, reply_to: body.replyTo }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) return NextResponse.json({ ok: true, provider: "resend", id: data.id }, { headers: cors(origin) })
    return NextResponse.json({ error: "resend failed", detail: data }, { status: 502, headers: cors(origin) })
  }

  // ── 2. Brevo (Sendinblue) ────────────────────────────────────────────────
  if (BREVO_KEY) {
    // from "Name <email>" → {name, email}
    const m = from.match(/^(.*?)\s*<(.+)>$/)
    const sender = m ? { name: m[1].trim(), email: m[2].trim() } : { email: from }
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": BREVO_KEY, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html || `<p>${text}</p>`, replyTo: body.replyTo ? { email: body.replyTo } : undefined }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) return NextResponse.json({ ok: true, provider: "brevo", id: data.messageId }, { headers: cors(origin) })
    return NextResponse.json({ error: "brevo failed", detail: data }, { status: 502, headers: cors(origin) })
  }

  // ── Aucun fournisseur configuré ──────────────────────────────────────────
  return NextResponse.json({
    error: "Aucun fournisseur email configuré",
    hint: "Définir RESEND_API_KEY (recommandé) ou BREVO_API_KEY dans les variables d'environnement Vercel.",
  }, { status: 501, headers: cors(origin) })
}
