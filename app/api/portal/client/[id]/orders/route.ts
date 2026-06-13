import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════
// GET /api/portal/client/[id]/orders — Client order history
// Returns all orders for this client (fl_commandes)
// ══════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY || ""

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id || !SB_SRV) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  try {
    const headers = { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }

    // Look up the client's phone so we can also match web orders that carry the
    // phone but not the ERP clientId (boutique orders).
    let clientTel = ""
    try {
      const cRes = await fetch(`${SB_URL}/rest/v1/fl_clients?id=eq.${encodeURIComponent(id)}&select=payload`, { headers, cache: "no-store" })
      if (cRes.ok) {
        const cRows = await cRes.json()
        clientTel = String(cRows[0]?.payload?.telephone ?? "").replace(/\s+/g, "")
      }
    } catch { /* non-blocking */ }

    // Fetch all commandes, then filter by clientId/phone in JS (JSONB payload)
    const res = await fetch(`${SB_URL}/rest/v1/fl_commandes?select=id,payload&order=updated_at.desc&limit=500`, {
      headers,
      cache: "no-store",
    })
    if (!res.ok) return NextResponse.json({ error: "Supabase error" }, { status: 500 })

    const rows: { id: string; payload: Record<string, any> }[] = await res.json()

    // Filter for this client (both ERP and web order formats)
    const orders = rows
      .map(r => ({ id: r.id, ...(r.payload ?? {}) }))
      .filter((o: any) => {
        const cid = o.clientId ?? o.client_id
        if (cid && cid === id) return true
        // Fallback: match web orders by phone number
        const tel = String(o.telephone ?? o.clientTel ?? "").replace(/\s+/g, "")
        return !!clientTel && tel === clientTel
      })
      .map((o: any) => ({
        id: o.id,
        date: o.date ?? o.created_at ?? o.createdAt,
        statut: o.statut ?? "en_attente",
        montantTotal: o.montant_total ?? o.montantTotal ?? 0,
        nbArticles: Array.isArray(o.lignes) ? o.lignes.length : (o.nbArticles ?? 0),
        source: o.source ?? "erp",
        lignes: o.lignes ?? [],
        adresseLivraison: o.adresse_livraison ?? o.adresseLivraison ?? null,
        notesClient: o.notes_client ?? o.notesClient ?? null,
      }))

    // Tracking info for recent orders
    const trackingRes = await fetch(`${SB_URL}/rest/v1/fl_tracking?select=id,payload&limit=100`, {
      headers,
      cache: "no-store",
    })
    const trackingRows = trackingRes.ok ? await trackingRes.json() : []
    const trackingMap = new Map<string, any>()
    for (const t of trackingRows) {
      const p = t.payload ?? {}
      if (p.commandeId) trackingMap.set(p.commandeId, { ...p, id: t.id })
    }

    const ordersWithTracking = orders.map((o: any) => ({
      ...o,
      tracking: trackingMap.get(o.id) ?? null,
    }))

    return NextResponse.json({ orders: ordersWithTracking })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
