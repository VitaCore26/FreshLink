import { NextRequest, NextResponse } from "next/server"

// ════════════════════════════════════════════════════════════════════════════
//  /api/ext/shop-admin-auth — validation CÔTÉ SERVEUR du mot de passe admin du
//  shop. Remplace le PIN en clair `ADMIN_PIN` qui était dans le HTML public.
//
//  Le mot de passe attendu vit UNIQUEMENT dans l'env serveur SHOP_ADMIN_PASSWORD
//  (jamais dans le code/HTML). Le client envoie le mot de passe saisi ; on
//  répond { ok: true/false } sans jamais exposer la valeur attendue.
//  (Route sous /api/ext/ → publique, joignable par le shop via le rewrite.)
// ════════════════════════════════════════════════════════════════════════════

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  }
}

// Comparaison à temps constant (évite le timing-attack sur la longueur/contenu)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  const expected = process.env.SHOP_ADMIN_PASSWORD ?? ""

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "SHOP_ADMIN_PASSWORD non configuré côté serveur." },
      { status: 500, headers: cors(origin) },
    )
  }

  try {
    const { password } = (await req.json()) as { password?: string }
    const ok = typeof password === "string" && password.length > 0 && safeEqual(password, expected)
    return NextResponse.json({ ok }, { status: ok ? 200 : 401, headers: cors(origin) })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: cors(origin) })
  }
}
