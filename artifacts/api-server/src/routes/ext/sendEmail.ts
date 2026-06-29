import { Router } from "express";
import type { Request, Response } from "express";

// ══════════════════════════════════════════════════════════════════════════════
// /api/ext/send-email — envoi email côté SERVEUR (clé secrète jamais exposée)
//
// Fournisseurs (par préférence, détectés via variables d'env) :
//   1. Brevo   — BREVO_API_KEY    (300/jour gratuit) — prioritaire (pas de DNS requis)
//   2. Resend  — RESEND_API_KEY   (3000/mois gratuit)
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
//
// Aucun SDK ajouté : Brevo/Resend sont appelés via fetch HTTP brut (comme dans
// la version Next.js d'origine) — pas de nouvelle dépendance npm nécessaire.
// ══════════════════════════════════════════════════════════════════════════════

const router = Router();

const RESEND_KEY = process.env.RESEND_API_KEY || "";
const BREVO_KEY = process.env.BREVO_API_KEY || "";
const FROM_DEFAULT = process.env.EMAIL_FROM || "Vita Fresh <support@vita-core.org>";

function corsHeaders(origin: string | undefined) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

router.use((req: Request, res: Response, next) => {
  Object.entries(corsHeaders(req.headers.origin)).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

// ── Rate limit en mémoire (best-effort, par IP) ────────────────────────────────
// Équivalent de lib/rateLimit.ts (Next.js) — protège contre l'abus sur cet
// endpoint public. En mémoire = best-effort par instance de process.
type Bucket = { count: number; reset: number };
const rlStore = new Map<string, Bucket>();
function rlGc(now: number) {
  if (rlStore.size < 5000) return;
  for (const [k, b] of rlStore) if (b.reset < now) rlStore.delete(k);
}
function clientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff) return xff.split(",")[0].trim();
  return (req.headers["x-real-ip"] as string) ?? req.ip ?? "unknown";
}
function rateLimited(req: Request, opts: { key: string; limit: number; windowMs: number }): { retry: number } | null {
  const now = Date.now();
  rlGc(now);
  const id = `${opts.key}:${clientIp(req)}`;
  let b = rlStore.get(id);
  if (!b || b.reset < now) {
    b = { count: 0, reset: now + opts.windowMs };
    rlStore.set(id, b);
  }
  b.count++;
  if (b.count > opts.limit) {
    const retry = Math.max(1, Math.ceil((b.reset - now) / 1000));
    return { retry };
  }
  return null;
}

// Diagnostic : indique QUELS fournisseurs sont configurés (booléens, jamais les clés)
router.get("/", (req: Request, res: Response) => {
  res.json({
    providers: { brevo: !!BREVO_KEY, resend: !!RESEND_KEY },
    from: FROM_DEFAULT,
    preferred: BREVO_KEY ? "brevo" : RESEND_KEY ? "resend" : "none",
  });
});

const displayName = (from: string) => (from.match(/^(.*?)\s*</)?.[1] || "Vita Fresh").trim();

async function brevoSend(from: string, to: string, subject: string, html: string, text: string, replyTo?: string): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const m = from.match(/^(.*?)\s*<(.+)>$/);
  const sender = m ? { name: m[1].trim(), email: m[2].trim() } : { email: from };
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, htmlContent: html || `<p>${text}</p>`, replyTo: replyTo ? { email: replyTo } : undefined }),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

interface ResendPayload { from: string; to: string[]; subject: string; html?: string; text?: string; reply_to?: string }

async function resendSend(p: ResendPayload): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, data };
}

// Cherche un domaine VÉRIFIÉ dans le compte Resend → renvoie "Name <noreply@domaine>"
async function resendVerifiedFrom(name: string): Promise<string | null> {
  try {
    const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${RESEND_KEY}` } });
    const d = await r.json().catch(() => ({})) as { data?: { name?: string; status?: string }[] };
    const list: { name?: string; status?: string }[] = Array.isArray(d?.data) ? d.data : Array.isArray(d) ? d as any : [];
    const verified = list.find(x => String(x.status).toLowerCase() === "verified" && x.name);
    return verified?.name ? `${name} <noreply@${verified.name}>` : null;
  } catch { return null; }
}

router.post("/", async (req: Request, res: Response) => {
  const limited = rateLimited(req, { key: "send-email", limit: 5, windowMs: 60_000 });
  if (limited) {
    res.setHeader("Retry-After", String(limited.retry));
    res.status(429).json({ ok: false, error: "Trop de requêtes — réessayez dans quelques instants." });
    return;
  }

  const body = (req.body ?? {}) as { to?: string; subject?: string; html?: string; text?: string; from?: string; replyTo?: string };

  const to = String(body.to ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const html = body.html ?? (body.text ? `<pre style="font-family:inherit">${body.text}</pre>` : "");
  const text = body.text ?? "";
  const from = body.from ?? FROM_DEFAULT;
  if (!to || !subject || (!html && !text)) {
    res.status(400).json({ error: "to, subject et html/text requis" });
    return;
  }

  // ── 0. Brevo PRIORITAIRE si configuré (pas de DNS requis, juste un sender vérifié)
  if (BREVO_KEY) {
    const r = await brevoSend(from, to, subject, html, text, body.replyTo);
    if (r.ok) { res.json({ ok: true, provider: "brevo", id: (r.data as Record<string, unknown>)?.messageId }); return; }
    // Brevo est le fournisseur choisi → on renvoie SON erreur (diagnostic clair),
    // sans masquer derrière Resend.
    const bmsg = String((r.data as { message?: string; code?: string })?.message ?? (r.data as { code?: string })?.code ?? "erreur Brevo");
    const bhint = /ip address|authorised_ips|authorized.?ip|unrecognis/i.test(bmsg)
      ? "Brevo bloque l'IP du serveur (fonction de sécurité « IP autorisées »). Les serveurs changent d'IP → DÉSACTIVEZ cette restriction : Brevo → Security → Authorised IPs (https://app.brevo.com/security/authorised_ips) → désactivez « Authorised IPs feature » (autoriser toutes les IP)."
      : /sender|not.*valid|denied|verif/i.test(bmsg)
      ? `Expéditeur non vérifié dans Brevo. Brevo → Senders, ajoutez « ${from.replace(/^.*<|>$/g, "")} » et cliquez le lien de confirmation reçu sur cette adresse.`
      : /api.?key|key not found/i.test(bmsg) ? "Clé BREVO_API_KEY invalide ou révoquée — recréez-en une dans Brevo → SMTP & API → API Keys."
      : "Vérifiez l'expéditeur (Brevo → Senders) et la clé BREVO_API_KEY.";
    res.status(502).json({ error: `Brevo: ${bmsg}`, detail: r.data, hint: bhint });
    return;
  }

  // ── 1. Resend (avec auto-réparation du domaine) ───────────────────────────
  if (RESEND_KEY) {
    const base = { to: [to], subject, html: html || undefined, text: text || undefined, reply_to: body.replyTo };
    let r = await resendSend({ from, ...base });
    let usedFrom = from;
    let note: string | undefined;

    if (!r.ok && /not verified|domain|verify/i.test(String((r.data as Record<string, unknown>)?.message ?? ""))) {
      // a) tenter un domaine vérifié existant
      const vFrom = await resendVerifiedFrom(displayName(from));
      if (vFrom && vFrom !== from) {
        const r2 = await resendSend({ from: vFrom, ...base });
        if (r2.ok) { r = r2; usedFrom = vFrom; note = `Domaine ${from} non vérifié → envoyé via ${vFrom}.`; }
        else r = r2;
      }
      // b) dernier recours : onboarding@resend.dev (vers l'email du compte uniquement)
      if (!r.ok) {
        const fb = `${displayName(from)} <onboarding@resend.dev>`;
        const r3 = await resendSend({ from: fb, ...base });
        if (r3.ok) { r = r3; usedFrom = fb; note = "Aucun domaine vérifié → envoyé via onboarding@resend.dev (livré uniquement à l'email du compte Resend). Vérifiez le domaine dans Resend → Domains pour envoyer à tous."; }
        else r = r3;
      }
    }

    if (r.ok) { res.json({ ok: true, provider: "resend", id: (r.data as Record<string, unknown>)?.id, from: usedFrom, note }); return; }

    const msg = String((r.data as Record<string, unknown>)?.message ?? "erreur Resend");
    const hint = /not verified|domain|verify/i.test(msg)
      ? "Domaine non vérifié dans Resend. Ajoutez votre domaine dans Resend → Domains et publiez les enregistrements DNS (SPF/DKIM/DMARC). L'envoi repartira automatiquement une fois vérifié. (Le repli onboarding@resend.dev n'a pas pu livrer car le destinataire n'est pas l'email du compte Resend.)"
      : /api key/i.test(msg) ? "Clé RESEND_API_KEY invalide — recréez une clé dans Resend → API Keys."
      : undefined;
    // Brevo (s'il est configuré) a déjà été tenté en amont → on renvoie l'erreur Resend
    res.status(502).json({ error: `Resend: ${msg}`, detail: r.data, hint });
    return;
  }

  // ── Aucun fournisseur configuré ──────────────────────────────────────────
  res.status(501).json({
    error: "Aucun fournisseur email configuré",
    hint: "Définir RESEND_API_KEY (recommandé) ou BREVO_API_KEY dans les variables d'environnement.",
  });
});

export default router;
