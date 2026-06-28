import { NextRequest, NextResponse } from "next/server"
import { requireDeviceApi } from "@/lib/auth/requireDeviceApi"

// ══════════════════════════════════════════════════════════════════════════
// /api/wa-groups — liens d'invitation WhatsApp INTERNES (force de vente,
// alerte achat). Jamais hardcodés dans un composant client (sinon ils
// finissent dans le bundle JS public, _next/static n'est pas authentifié).
// Route protégée par requireDeviceApi : appareil BO valide requis.
// ══════════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  const denied = requireDeviceApi(req)
  if (denied) return denied

  return NextResponse.json({
    pv: process.env.WA_GROUP_PV_URL || "",
    alert: process.env.WA_GROUP_ALERT_URL || "",
  })
}
