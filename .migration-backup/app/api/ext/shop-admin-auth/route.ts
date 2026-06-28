import { NextRequest, NextResponse } from "next/server"
import { verifyShopAdminPassword, shopAdminConfigured } from "@/lib/shopAdminPwd"

// ════════════════════════════════════════════════════════════════════════════
//  /api/ext/shop-admin-auth — validation CÔTÉ SERVEUR du mot de passe admin du
//  shop. Remplace le PIN en clair `ADMIN_PIN` qui était dans le HTML public.
//
//  Source de vérité = hash bcrypt dans Supabase (modifiable depuis l'UI) avec
//  fallback sur l'env SHOP_ADMIN_PASSWORD. Voir lib/shopAdminPwd.ts. Le client
//  envoie le mot de passe saisi ; on répond { ok } sans jamais exposer la valeur.
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

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")

  if (!(await shopAdminConfigured())) {
    return NextResponse.json(
      { ok: false, error: "SHOP_ADMIN_PASSWORD non configuré côté serveur." },
      { status: 500, headers: cors(origin) },
    )
  }

  try {
    const { password } = (await req.json()) as { password?: string }
    const ok = typeof password === "string" && (await verifyShopAdminPassword(password))
    return NextResponse.json({ ok }, { status: ok ? 200 : 401, headers: cors(origin) })
  } catch {
    return NextResponse.json({ ok: false }, { status: 400, headers: cors(origin) })
  }
}
