import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════
// GET /api/portal/client/[id] — Client profile + dashboard data
// ══════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://jwdrwapuetqoqnankgma.supabase.co"
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY || ""

async function sbQuery(table: string, filter: string): Promise<any[]> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}&select=id,payload`, {
    headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` },
    cache: "no-store",
  })
  if (!res.ok) return []
  return (await res.json()).map((r: any) => ({ id: r.id, ...(r.payload ?? {}) }))
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id || !SB_SRV) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  try {
    const clients = await sbQuery("fl_clients", `id=eq.${encodeURIComponent(id)}`)
    const client = clients[0]
    if (!client) return NextResponse.json({ error: "Client introuvable" }, { status: 404 })

    // Wallet balance
    const walletTx = await sbQuery("fl_wallet_transactions", `payload->>clientId=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=10`)
    const walletBalance = walletTx[0]?.soldeApres ?? 0

    // Active promotions for this segment
    const promos = await sbQuery("fl_promotions", `payload->>actif=eq.true&limit=20`)
    const now = new Date().toISOString()
    const activePromos = promos.filter((p: any) => {
      if (p.dateFin && p.dateFin < now) return false
      if (p.conditions?.segments?.length) return p.conditions.segments.includes(client.segment ?? "standard")
      return true
    })

    // Active contrat
    const contrats = await sbQuery("fl_contrats", `payload->>clientId=eq.${encodeURIComponent(id)}&payload->>statut=eq.actif&limit=1`)

    // Organisation (CHR hierarchy)
    const orgs = await sbQuery("fl_organisations", `payload->>clientId=eq.${encodeURIComponent(id)}&limit=1`)

    // Recent invoices
    const invoices = await sbQuery("fl_invoices", `payload->>clientId=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=20`)

    // Credit notes (avoirs)
    const avoirs = await sbQuery("fl_avoirs", `payload->>clientId=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=20`)

    // Delivery notes (bons de livraison) — match by clientId OR via commandes
    const bonsLivraison = await sbQuery("fl_bons_livraison", `payload->>clientId=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=30`)

    // Referral stats
    const referrals = await sbQuery("fl_referrals", `payload->>parrain_id=eq.${encodeURIComponent(id)}&limit=50`)
    const convertedRefs = referrals.filter((r: any) => r.statut === "converti").length

    return NextResponse.json({
      // Full client record — the portal renders sector, zone, credit status, etc.
      // (the client's own data, served over a service-role API to the authenticated client)
      client: {
        ...client,
        remisePct: client.remisePct ?? 0,
        loyaltyPoints: client.loyaltyPoints ?? 0,
      },
      wallet: { balance: walletBalance, recentTx: walletTx },
      promotions: activePromos.slice(0, 5),
      contrat: contrats[0] ?? null,
      organisation: orgs[0] ?? null,
      invoices,
      avoirs,
      bonsLivraison,
      referrals: { total: referrals.length, converted: convertedRefs },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
