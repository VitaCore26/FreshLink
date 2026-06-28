// ════════════════════════════════════════════════════════════════════════════
//  requireDeviceApi — garde d'API pour les endpoints service-role (sync-*).
//
//  PROBLÈME : /api/sync-read et /api/sync-write opèrent avec la clé service_role
//  (bypass RLS). Le middleware Edge leur impose un cookie d'appareil, MAIS il ne
//  vérifie PAS la signature HMAC (Edge ≠ Node crypto) → un cookie FALSIFIÉ
//  (`{exp:futur,fp:"x"}.x`) passe, et n'importe qui peut lire/écrire la base.
//
//  CORRECTIF : ici (route handlers, runtime Node) on vérifie RÉELLEMENT la
//  signature HMAC du cookie d'appareil / super-admin. Le BO légitime possède
//  déjà un cookie signé valide (sinon il serait bloqué par le middleware) → il
//  passe sans changement. Les cookies forgés sont rejetés (401).
// ════════════════════════════════════════════════════════════════════════════
import { type NextRequest, NextResponse } from "next/server"
import {
  verifyDeviceToken,
  verifySadminToken,
  DEVICE_COOKIE,
  SADMIN_COOKIE,
  DEVICE_BYPASS,
} from "@/lib/deviceGuard"

/**
 * Retourne une réponse 401 si la requête ne porte PAS un identifiant d'appareil
 * (ou super-admin) à signature HMAC valide ; sinon `null` (accès autorisé).
 *
 * Usage dans un route handler :
 *   const denied = requireDeviceApi(req); if (denied) return denied
 */
export function requireDeviceApi(req: NextRequest): NextResponse | null {
  // 1) Cookie super-admin (bypass device guard) — 2 formats légitimes acceptés :
  const sadmin = req.cookies.get(SADMIN_COOKIE)?.value
  if (sadmin) {
    if (sadmin === `${DEVICE_BYPASS}.sadmin`) return null   // posé par le middleware (?bypass=KEY)
    if (verifySadminToken(sadmin)) return null              // token sadmin signé (/api/admin-session)
  }

  // 2) En-tête de bypass explicite (intégrations serveur-à-serveur autorisées) :
  const bypassHeader = req.headers.get("x-vita-bypass")
  if (bypassHeader && bypassHeader === DEVICE_BYPASS) return null

  // 3) Cookie d'appareil — SIGNATURE HMAC RÉELLEMENT VÉRIFIÉE (≠ middleware) :
  const device = req.cookies.get(DEVICE_COOKIE)?.value
  if (device && verifyDeviceToken(device)) return null

  // Sinon : accès refusé.
  return NextResponse.json(
    { ok: false, error: "Accès refusé : appareil non autorisé." },
    { status: 401 },
  )
}
