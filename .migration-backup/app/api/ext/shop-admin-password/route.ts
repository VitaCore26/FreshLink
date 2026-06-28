import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/rateLimit"
import { changeShopAdminPassword, shopAdminConfigured } from "@/lib/shopAdminPwd"

// ════════════════════════════════════════════════════════════════════════════
//  /api/ext/shop-admin-password — change le mot de passe admin du shop.
//
//  POST { currentPassword, newPassword }
//    → vérifie l'actuel (hash Supabase ou env), écrit le nouveau hash bcrypt
//      dans Supabase (fl_notices id=shop_admin_secret). Aucun secret renvoyé.
//
//  GET → { configured } (l'UI sait s'il faut afficher le formulaire).
//  (Route sous /api/ext/ → publique, joignable par le shop via le rewrite.)
// ════════════════════════════════════════════════════════════════════════════

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  return NextResponse.json({ ok: true, configured: await shopAdminConfigured() }, { headers: cors(origin) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")

  // Anti-bruteforce : 5 tentatives / 5 min / IP.
  const limited = rateLimit(req, { key: "shop-admin-pwd", limit: 5, windowMs: 5 * 60_000 }, cors(origin))
  if (limited) return limited

  let body: { currentPassword?: string; newPassword?: string } = {}
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400, headers: cors(origin) })
  }

  const err = await changeShopAdminPassword(body.currentPassword ?? "", body.newPassword ?? "")
  if (err) {
    // 401 si c'est l'actuel qui est faux, 400/500 sinon.
    const status = err === "Mot de passe actuel incorrect." ? 401 : 400
    return NextResponse.json({ ok: false, error: err }, { status, headers: cors(origin) })
  }
  return NextResponse.json({ ok: true }, { headers: cors(origin) })
}
