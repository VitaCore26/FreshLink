import { NextRequest, NextResponse } from "next/server"

// ══════════════════════════════════════════════════════════════
// POST /api/portal/referrals/convert
// Body: { commandeId: string }
//
// Idempotent. Triggered when an order is marked "livre" — looks up the
// filleul (= clientId on the order), finds the matching pending referral,
// credits both wallets and flips the referral to "converti".
//
// Hook into the ERP order workflow: call this when fl_commandes.statut
// transitions to "livre". Calling it twice has no effect (already converted).
// ══════════════════════════════════════════════════════════════

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://jwdrwapuetqoqnankgma.supabase.co"
const SB_SRV = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY || ""

async function sbGetAll(table: string, filter: string) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}?${filter}&select=id,payload`, {
    headers: { apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}` }, cache: "no-store",
  })
  if (!res.ok) return []
  return (await res.json()).map((r: any) => ({ id: r.id, ...(r.payload ?? {}) }))
}

async function sbUpsert(table: string, row: { id: string; payload: Record<string, unknown>; updated_at: string }) {
  const res = await fetch(`${SB_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SB_SRV, Authorization: `Bearer ${SB_SRV}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  })
  return res.ok
}

async function creditWallet(clientId: string, montant: number, motif: string) {
  // Get current balance (last tx)
  const recent = await sbGetAll("fl_wallet_transactions", `payload->>clientId=eq.${encodeURIComponent(clientId)}&order=updated_at.desc&limit=1`)
  const prevSolde = Number(recent[0]?.soldeApres ?? 0)
  const newSolde = Math.round((prevSolde + montant) * 100) / 100

  const now = new Date().toISOString()
  const txId = `WTX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  await sbUpsert("fl_wallet_transactions", {
    id: txId,
    payload: {
      clientId,
      type: "credit_parrainage",
      montant,
      soldeAvant: prevSolde,
      soldeApres: newSolde,
      motif,
      date: now,
    },
    updated_at: now,
  })
  return { txId, newSolde }
}

export async function POST(req: NextRequest) {
  if (!SB_SRV) return NextResponse.json({ error: "service-role unavailable" }, { status: 500 })

  let body: { commandeId?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: "invalid JSON" }, { status: 400 }) }

  const commandeId = String(body.commandeId ?? "").trim()
  if (!commandeId) return NextResponse.json({ error: "commandeId required" }, { status: 400 })

  // Look up the order to get the filleul clientId
  const orders = await sbGetAll("fl_commandes", `id=eq.${encodeURIComponent(commandeId)}&limit=1`)
  const order = orders[0]
  if (!order) return NextResponse.json({ error: "commande introuvable" }, { status: 404 })

  const filleulId = order.clientId ?? order.client_id
  if (!filleulId) return NextResponse.json({ ok: true, skipped: "order has no clientId" })

  // Find the pending referral
  const referrals = await sbGetAll(
    "fl_referrals",
    `payload->>filleul_id=eq.${encodeURIComponent(filleulId)}&payload->>statut=eq.pending&limit=1`,
  )
  const ref = referrals[0]
  if (!ref) return NextResponse.json({ ok: true, skipped: "no pending referral" })

  // Credit both wallets
  const parrainTx = await creditWallet(
    ref.parrain_id,
    ref.reward?.parrain_credit ?? 0,
    `Parrainage : commande ${commandeId.slice(0, 12)} livrée`,
  )
  const filleulTx = await creditWallet(
    filleulId,
    ref.reward?.filleul_credit ?? 0,
    `Bonus bienvenue parrainage`,
  )

  // Flip referral to converti
  const now = new Date().toISOString()
  await sbUpsert("fl_referrals", {
    id: ref.id,
    payload: {
      ...ref,
      statut: "converti",
      convertedAt: now,
      conversionOrderId: commandeId,
      parrainTxId: parrainTx.txId,
      filleulTxId: filleulTx.txId,
    },
    updated_at: now,
  })

  return NextResponse.json({
    ok: true,
    referralId: ref.id,
    parrain: { id: ref.parrain_id, credited: ref.reward?.parrain_credit, newBalance: parrainTx.newSolde },
    filleul: { id: filleulId, credited: ref.reward?.filleul_credit, newBalance: filleulTx.newSolde },
  })
}
