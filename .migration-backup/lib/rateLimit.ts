import { type NextRequest, NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════════════
//  rateLimit — limiteur de débit en mémoire (par IP + clé de route) pour
//  protéger les endpoints publics /api/ext/* contre l'abus/spam.
//
//  ⚠️ En mémoire = best-effort sur serverless (compteur par instance). Stoppe le
//  spam naïf / les bursts. Pour du robuste à grande échelle, compléter par
//  Cloudflare (edge, faille #8) ou Upstash/Vercel KV (store partagé).
// ════════════════════════════════════════════════════════════════════════════

type Bucket = { count: number; reset: number }
const store = new Map<string, Bucket>()

function gc(now: number) {
  if (store.size < 5000) return
  for (const [k, b] of store) if (b.reset < now) store.delete(k)
}

function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

/**
 * Retourne une réponse 429 si la limite est dépassée pour (clé de route + IP),
 * sinon null (la requête peut continuer).
 *
 * Usage en tête d'un handler :
 *   const limited = rateLimit(req, { key: "commandes", limit: 10, windowMs: 60_000 })
 *   if (limited) return limited
 */
export function rateLimit(
  req: NextRequest,
  opts: { key: string; limit: number; windowMs: number },
  extraHeaders: HeadersInit = {},
): NextResponse | null {
  const now = Date.now()
  gc(now)
  const id = `${opts.key}:${clientIp(req)}`
  let b = store.get(id)
  if (!b || b.reset < now) {
    b = { count: 0, reset: now + opts.windowMs }
    store.set(id, b)
  }
  b.count++
  if (b.count > opts.limit) {
    const retry = Math.max(1, Math.ceil((b.reset - now) / 1000))
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes — réessayez dans quelques instants." },
      { status: 429, headers: { ...extraHeaders, "Retry-After": String(retry) } },
    )
  }
  return null
}
