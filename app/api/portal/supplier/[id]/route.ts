import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════
// GET /api/portal/supplier/[id] — Supplier portal dashboard
// Returns: fournisseur profile, POs received, recent receptions, payments
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
    // Fournisseur profile
    const fournisseurs = await sbQuery("fl_fournisseurs", `id=eq.${encodeURIComponent(id)}`)
    const fournisseur = fournisseurs[0]
    if (!fournisseur) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 })

    // Purchase orders (bons d'achat) for this supplier
    const allPOs = await sbQuery("fl_bons_achat", "order=updated_at.desc&limit=200")
    const myPOs = allPOs.filter((po: any) => po.fournisseurId === id || po.fournisseur_id === id)

    // Receptions linked to this supplier
    const allReceptions = await sbQuery("fl_receptions", "order=updated_at.desc&limit=100")
    const myReceptions = allReceptions.filter((r: any) => r.fournisseurId === id || r.fournisseur_id === id)

    // Payments to this supplier
    const allPayments = await sbQuery("fl_paiements", `payload->>fournisseurId=eq.${encodeURIComponent(id)}&order=updated_at.desc&limit=50`)

    // Articles supplied (from bons d'achat)
    const articleIds = new Set<string>()
    for (const po of myPOs) {
      if (Array.isArray(po.lignes)) {
        for (const l of po.lignes) if (l.articleId) articleIds.add(l.articleId)
      }
    }

    return NextResponse.json({
      fournisseur: {
        id: fournisseur.id, nom: fournisseur.nom, telephone: fournisseur.telephone,
        email: fournisseur.email, produits: fournisseur.produits,
        ville: fournisseur.ville, origineProduction: fournisseur.origineProduction,
      },
      purchaseOrders: myPOs.slice(0, 50).map((po: any) => ({
        id: po.id, date: po.date ?? po.createdAt, statut: po.statut ?? "en_attente",
        montant: po.montantTotal ?? po.montant ?? 0,
        nbArticles: Array.isArray(po.lignes) ? po.lignes.length : 0,
      })),
      receptions: myReceptions.slice(0, 20).map((r: any) => ({
        id: r.id, date: r.date ?? r.createdAt, bonAchatId: r.bonAchatId,
        statut: r.statut ?? "recue", montant: r.montant ?? 0,
      })),
      payments: allPayments.slice(0, 20),
      stats: {
        totalPOs: myPOs.length,
        totalReceptions: myReceptions.length,
        totalMontant: myPOs.reduce((s: number, po: any) => s + (Number(po.montantTotal ?? po.montant) || 0), 0),
        articlesCount: articleIds.size,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
