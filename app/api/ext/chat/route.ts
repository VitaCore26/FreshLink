import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════════════════════
// /api/ext/chat — Assistant IA « Nour » (chatbot très intelligent)
//
// Appelle un vrai LLM côté serveur (clé jamais exposée) avec le contexte
// Vita Fresh + le catalogue en direct. Fournisseurs détectés via env :
//   1. Anthropic Claude — ANTHROPIC_API_KEY (recommandé)
//   2. OpenAI           — OPENAI_API_KEY
//
// Body: { message: string, history?: {role, content}[], lang?: "fr"|"ar"|"en" }
// Réponse: { reply: string, provider: string }
// Si aucune clé configurée → 501 (le site retombe sur ses réponses mots-clés).
// ══════════════════════════════════════════════════════════════════════════════

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || ""
const OPENAI_KEY    = process.env.OPENAI_API_KEY || ""
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"

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

// Petit résumé du catalogue pour donner du contexte produit à l'IA
async function catalogueContext(origin: string): Promise<string> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || origin || "https://erp.vita-core.org"
    const res = await fetch(`${base}/api/ext/catalogue`, { cache: "no-store" })
    if (!res.ok) return ""
    const data = await res.json() as { nom?: string; prix?: number; unite?: string; stockDisponible?: number }[]
    if (!Array.isArray(data) || !data.length) return ""
    const lines = data.slice(0, 80).map(p =>
      `- ${p.nom} : ${p.prix ?? "?"} DH/${p.unite ?? "kg"}${(p.stockDisponible ?? 0) > 0 ? "" : " (rupture)"}`
    )
    return `Catalogue du jour (${data.length} produits) :\n${lines.join("\n")}`
  } catch { return "" }
}

function systemPrompt(cat: string): string {
  return [
    "Tu es Nour ✨, l'assistante virtuelle de Vita Fresh — distributeur de fruits, légumes et herbes fraîches à Casablanca, Maroc (groupe VitaCore).",
    "Réponds TOUJOURS dans la langue du client : français, darija marocaine (en lettres latines ou arabes) ou anglais.",
    "Sois chaleureuse, concise (2-4 phrases max), et oriente vers l'action : ajouter au panier, commander, WhatsApp, créer un compte pro.",
    "Infos utiles : livraison standard 24h (gratuite dès 150 MAD), express 2-4h sur Casablanca. Comptes pro (CHR, marchands) = tarifs négociés, facturation, app FreshLink.",
    "Paiement : cash à la livraison, chèque, virement, crédit 7/15/30j pour les pros.",
    "Si on te demande un prix ou une disponibilité, utilise le catalogue ci-dessous. Si un produit n'y est pas, propose de contacter l'équipe sur WhatsApp.",
    "Ne JAMAIS inventer de prix : utilise uniquement ceux du catalogue.",
    cat ? `\n${cat}` : "\n(Catalogue momentanément indisponible — invite à consulter le site ou WhatsApp.)",
  ].join("\n")
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  let body: { message?: string; history?: { role: string; content: string }[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400, headers: cors(origin) }) }

  const message = String(body.message ?? "").trim()
  if (!message) return NextResponse.json({ error: "message requis" }, { status: 400, headers: cors(origin) })
  const history = Array.isArray(body.history) ? body.history.slice(-8) : []

  const cat = await catalogueContext(req.nextUrl.origin)
  const sys = systemPrompt(cat)

  // ── 1. Anthropic Claude ────────────────────────────────────────────────
  if (ANTHROPIC_KEY) {
    const messages = [
      ...history.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: String(h.content) })),
      { role: "user", content: message },
    ]
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-3-5-haiku-latest", max_tokens: 400, system: sys, messages }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const reply = (data?.content?.[0]?.text ?? "").trim()
      return NextResponse.json({ reply, provider: "anthropic" }, { headers: cors(origin) })
    }
    return NextResponse.json({ error: "anthropic failed", detail: data }, { status: 502, headers: cors(origin) })
  }

  // ── 2. OpenAI ───────────────────────────────────────────────────────────
  if (OPENAI_KEY) {
    const messages = [
      { role: "system", content: sys },
      ...history.map(h => ({ role: h.role === "assistant" ? "assistant" : "user", content: String(h.content) })),
      { role: "user", content: message },
    ]
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 400, messages, temperature: 0.5 }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      const reply = (data?.choices?.[0]?.message?.content ?? "").trim()
      return NextResponse.json({ reply, provider: "openai" }, { headers: cors(origin) })
    }
    return NextResponse.json({ error: "openai failed", detail: data }, { status: 502, headers: cors(origin) })
  }

  // ── Aucun LLM configuré ──────────────────────────────────────────────────
  return NextResponse.json({
    error: "Aucun LLM configuré",
    hint: "Définir ANTHROPIC_API_KEY (recommandé) ou OPENAI_API_KEY dans Vercel.",
  }, { status: 501, headers: cors(origin) })
}
