import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════════
// /api/ext/promo — Validation d'un code promo (appelé par la boutique)
//   GET ?code=XYZ&total=350
//   → { ok, valid, type, valeur, label, remise, minCommande, reason? }
// Codes gérés dans le back-office (table fl_coupons, {id=CODE, payload}).
// ══════════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY) ?? ""

function cors(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin":  origin ?? "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

interface Coupon {
  code?: string
  actif?: boolean
  type?: "pourcentage" | "montant"
  valeur?: number
  label?: string
  expiration?: string      // ISO date — au-delà, invalide
  minCommande?: number     // total minimum requis (DH)
  usageMax?: number
  usageCount?: number
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  const code = (req.nextUrl.searchParams.get("code") ?? "").trim().toUpperCase()
  const total = Number(req.nextUrl.searchParams.get("total")) || 0

  if (!code) return NextResponse.json({ ok: true, valid: false, reason: "Code vide" }, { headers: cors(origin) })
  if (!SB_SRV) return NextResponse.json({ ok: false, error: "service_role manquante" }, { status: 500, headers: cors(origin) })

  try {
    const res = await fetch(`${SB_URL}/rest/v1/fl_coupons?id=eq.${encodeURIComponent(code)}&select=payload`, {
      headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }, cache: "no-store",
    })
    const rows = res.ok ? await res.json() : []
    const c: Coupon = rows[0]?.payload ?? {}

    if (!rows.length)              return NextResponse.json({ ok: true, valid: false, reason: "Code introuvable" }, { headers: cors(origin) })
    if (c.actif === false)         return NextResponse.json({ ok: true, valid: false, reason: "Code désactivé" }, { headers: cors(origin) })
    if (c.expiration && new Date(c.expiration) < new Date())
                                   return NextResponse.json({ ok: true, valid: false, reason: "Code expiré" }, { headers: cors(origin) })
    if (c.usageMax && (c.usageCount ?? 0) >= c.usageMax)
                                   return NextResponse.json({ ok: true, valid: false, reason: "Code épuisé" }, { headers: cors(origin) })
    if (c.minCommande && total > 0 && total < c.minCommande)
                                   return NextResponse.json({ ok: true, valid: false, reason: `Minimum ${c.minCommande} DH` }, { headers: cors(origin) })

    const validTypes = ["montant", "pourcentage", "livraison_gratuite", "article_gratuit"] as const
    const type = (validTypes as readonly string[]).includes(String(c.type)) ? String(c.type) : "pourcentage"
    const valeur = Number(c.valeur) || 0
    // Remise sur les articles : montant/% classiques ; article_gratuit = remise = valeur (DH offerts).
    // livraison_gratuite = aucune remise article mais drapeau livraisonGratuite (le shop met la livraison à 0).
    let remise = 0
    if (total > 0) {
      if (type === "montant" || type === "article_gratuit") remise = Math.min(valeur, total)
      else if (type === "pourcentage") remise = Math.round(total * valeur / 100 * 100) / 100
    }
    const livraisonGratuite = type === "livraison_gratuite"

    return NextResponse.json({
      ok: true, valid: true, code, type, valeur, remise, livraisonGratuite,
      label: c.label ?? "", minCommande: c.minCommande ?? 0,
    }, { headers: cors(origin) })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500, headers: cors(origin) })
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}
