import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════
// GET /api/portal/supplier/[id] — Supplier portal dashboard
// Returns FULL payloads (the portal + its cross-doc feature need the
// complete PurchaseOrder / Reception / BonAchat objects), plus payments
// and computed stats. Uses the service-role key (bypasses RLS).
// ══════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY || ""

async function sbQuery(table: string, filter: string): Promise<any[]> {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}&select=id,payload`, {
    headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` },
    cache: "no-store",
  })
  if (!res.ok) return []
  return (await res.json()).map((r: any) => ({ id: r.id, ...(r.payload ?? {}) }))
}

const belongsToSupplier = (id: string) => (x: any) =>
  x.fournisseurId === id || x.fournisseur_id === id

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id || !SB_SRV) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  try {
    // Fournisseur profile (full payload)
    const fournisseurs = await sbQuery("fl_fournisseurs", `id=eq.${encodeURIComponent(id)}`)
    const fournisseur = fournisseurs[0]
    if (!fournisseur) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 })

    // Pull the supplier-scoped collections in parallel
    const [allPOs, allBonsAchat, allReceptions, payments] = await Promise.all([
      sbQuery("fl_purchase_orders", "order=updated_at.desc&limit=500"),
      sbQuery("fl_bons_achat", "order=updated_at.desc&limit=500"),
      sbQuery("fl_receptions", "order=updated_at.desc&limit=300"),
      sbQuery("fl_paiements", `payload->>fournisseurId=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=100`),
    ])

    const myPOs = allPOs.filter(belongsToSupplier(id))
    const myBonsAchat = allBonsAchat.filter(belongsToSupplier(id))

    // Receptions linked either directly to the supplier, or via one of its bons d'achat
    const myBonIds = new Set(myBonsAchat.map((b: any) => b.id))
    const myReceptions = allReceptions.filter((r: any) =>
      belongsToSupplier(id)(r) || (r.bonAchatId && myBonIds.has(r.bonAchatId))
    )

    // Solde dû = total des bons d'achat (ce que VitaFresh doit) − total payé
    const bonAchatMontant = (b: any) => {
      const direct = Number(b.montantTTC ?? b.montantTotal ?? b.total ?? b.montant) || 0
      if (direct) return direct
      const lignes = Array.isArray(b.lignes) ? b.lignes : []
      return lignes.reduce((t: number, l: any) => t + (Number(l.quantite) || 0) * (Number(l.prixAchat ?? l.prix) || 0), 0)
    }
    const totalAchats = myBonsAchat.reduce((s: number, b: any) => s + bonAchatMontant(b), 0)
    const totalPaye = payments.reduce((s: number, p: any) => s + (Number(p.montant) || 0), 0)
    const soldeDu = Math.max(0, totalAchats - totalPaye)

    return NextResponse.json({
      fournisseur,                 // full payload
      purchaseOrders: myPOs,       // full PurchaseOrder objects
      bonsAchat: myBonsAchat,      // full BonAchat objects (cross-doc matching)
      receptions: myReceptions,    // full Reception objects (with lignes)
      payments,
      stats: {
        totalPOs: myPOs.length,
        totalReceptions: myReceptions.length,
        totalMontant: myPOs.reduce((s: number, po: any) => s + (Number(po.total ?? po.montantTotal ?? po.montant) || 0), 0),
        totalAchats,               // somme des bons d'achat
        totalPaye,                 // somme des paiements reçus
        soldeDu,                   // ce que VitaFresh doit encore au fournisseur
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
