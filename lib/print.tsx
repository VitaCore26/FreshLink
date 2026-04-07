/**
 * lib/print.ts
 * ─────────────────────────────────────────────────────────────────
 * Professional print functions for FreshLink Pro documents.
 * All functions open a new window with clean HTML/CSS, then trigger
 * window.print() automatically.
 *
 * Documents:
 *  - printBL       → Bon de Livraison (BL) pour livreur/client
 *  - printFacture  → Facture (même données que BL, mise en page facture)
 *  - printBonCommande → Bon de Commande interne (commande prévendeur)
 *  - printPO       → Purchase Order vers fournisseur
 * ─────────────────────────────────────────────────────────────────
 */

import type { BonLivraison, Commande, PurchaseOrder } from "./store"

// ── Shared helpers ──────────────────────────────────────────────────────────

function getCompany() {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("fl_company") : null
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function fmt(n: number) {
  return n.toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const BASE_STYLE = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-size: 11pt;
  color: #1a1a1a;
  background: #fff;
  padding: 28px 32px;
}
/* ── Header ── */
.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 3px solid var(--accent);
}
.company-name { font-size: 20pt; font-weight: 900; color: var(--accent); letter-spacing: -0.5px; }
.doc-type { font-size: 9pt; color: #666; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 2px; }
.doc-number { font-size: 18pt; font-weight: 900; color: #111; }
.doc-date { font-size: 9pt; color: #777; margin-top: 3px; }

/* ── Info grid ── */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}
.info-box {
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
  background: #f9fafb;
}
.info-box .label {
  font-size: 7.5pt;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 1px;
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}
.info-box .value { font-size: 11pt; font-weight: 700; color: #111; }
.info-box .sub { font-size: 9pt; color: #6b7280; margin-top: 2px; }

/* ── Table ── */
table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
thead tr { background: var(--accent); }
thead th {
  padding: 9px 10px;
  text-align: left;
  font-size: 8.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #fff;
}
thead th.r { text-align: right; }
tbody tr { border-bottom: 1px solid #f0f0f0; }
tbody tr:nth-child(even) { background: #fafafa; }
tbody td { padding: 8px 10px; font-size: 10.5pt; }
tbody td.r { text-align: right; font-variant-numeric: tabular-nums; }
tfoot tr { border-top: 2px solid #e5e7eb; }
tfoot td { padding: 7px 10px; font-size: 10pt; }
tfoot td.r { text-align: right; }
.grand-total { font-size: 13pt; font-weight: 900; color: var(--accent); }

/* ── Totaux box ── */
.totaux-wrap { display: flex; justify-content: flex-end; margin-bottom: 20px; }
.totaux-box {
  border: 2px solid var(--accent);
  border-radius: 10px;
  padding: 14px 18px;
  min-width: 240px;
  background: #f0fdf4;
}
.total-row { display: flex; justify-content: space-between; gap: 24px; font-size: 10pt; margin-bottom: 5px; }
.total-row.grand {
  font-size: 13pt;
  font-weight: 900;
  color: var(--accent);
  border-top: 2px solid var(--accent);
  padding-top: 8px;
  margin-top: 6px;
  margin-bottom: 0;
}

/* ── Badges ── */
.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 20px;
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.badge-green { background: #dcfce7; color: #166534; }
.badge-blue  { background: #dbeafe; color: #1e40af; }
.badge-orange{ background: #ffedd5; color: #9a3412; }
.badge-red   { background: #fee2e2; color: #991b1b; }

/* ── Retour notice ── */
.retour-notice {
  margin-bottom: 16px;
  padding: 10px 14px;
  background: #fff7ed;
  border-radius: 8px;
  border-left: 4px solid #f97316;
  font-size: 10pt;
  color: #9a3412;
}

/* ── Signatures ── */
.signatures {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 24px;
  margin-top: 36px;
  padding-top: 16px;
  border-top: 1.5px solid #e5e7eb;
}
.sig-box { text-align: center; }
.sig-line {
  width: 100%;
  height: 48px;
  border-bottom: 1.5px solid #bbb;
  margin-bottom: 6px;
}
.sig-label { font-size: 8pt; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

/* ── Footer ── */
.doc-footer {
  margin-top: 32px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 8pt;
  color: #9ca3af;
  text-align: center;
}

/* ── UM badge inside table ── */
.um-badge {
  display: inline-block;
  font-size: 8pt;
  font-weight: 600;
  color: #1d4ed8;
  background: #dbeafe;
  padding: 1px 5px;
  border-radius: 4px;
  margin-left: 4px;
}

@media print {
  body { padding: 0; }
  @page { margin: 18mm 14mm; }
}
`

function openPrintWindow(title: string, accentColor: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=860,height=680")
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<style>
:root { --accent: ${accentColor}; }
${BASE_STYLE}
</style>
</head>
<body>
${bodyHtml}
<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`)
  win.document.close()
}

// ── 1. BON DE LIVRAISON ──────────────────────────────────────────────────────

export function printBL(bl: BonLivraison) {
  const co = getCompany()
  const coName = co.nom || "FreshLink Pro"
  const coAddr = [co.adresse, co.ville].filter(Boolean).join(" — ")
  const coTel  = co.telephone || ""
  const coIce  = co.ice ? `ICE: ${co.ice}` : ""

  const totalHT = bl.montantTotal
  const tva = bl.tva ?? 0
  const totalTTC = bl.montantTTC ?? totalHT

  const lignesRows = bl.lignes.map((l, i) => {
    const umHtml = l.quantiteUM && l.um
      ? `<span class="um-badge">${l.quantiteUM} ${l.um}</span>`
      : ""
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${l.articleNom}</strong>${umHtml}</td>
      <td class="r">${l.quantite} ${l.unite || ""}</td>
      <td class="r">${fmt(l.prixUnitaire)}</td>
      <td class="r"><strong>${fmt(l.total)}</strong></td>
    </tr>`
  }).join("")

  // Caisse rows — grosse caisse 70 DH, demi-caisse 50 DH
  const pricing = (bl as any).caissePricing ?? { prixGrosseCaisse: 70, prixDemiCaisse: 50 }
  const nbGros = (bl as any).nbCaisseGros ?? 0
  const nbDemi = (bl as any).nbCaisseDemi ?? 0
  const caisseRows = [
    nbGros > 0 ? `<tr style="background:#fefce8">
      <td>—</td>
      <td><strong>Grosse caisse (consigne)</strong></td>
      <td class="r">${nbGros} u</td>
      <td class="r">${fmt(pricing.prixGrosseCaisse)}</td>
      <td class="r"><strong>${fmt(nbGros * pricing.prixGrosseCaisse)}</strong></td>
    </tr>` : "",
    nbDemi > 0 ? `<tr style="background:#fefce8">
      <td>—</td>
      <td><strong>Demi-caisse (consigne)</strong></td>
      <td class="r">${nbDemi} u</td>
      <td class="r">${fmt(pricing.prixDemiCaisse)}</td>
      <td class="r"><strong>${fmt(nbDemi * pricing.prixDemiCaisse)}</strong></td>
    </tr>` : "",
  ].filter(Boolean).join("")
  const montantCaisses = nbGros * pricing.prixGrosseCaisse + nbDemi * pricing.prixDemiCaisse

  // Frais supplementaires
  const fraisImpressionParFeuille = (bl as any).fraisImpressionParFeuille ?? 0
  const nbFeuilles = (bl as any).nbFeuilles ?? 1
  const fraisServiceParCaisse = (bl as any).fraisServiceParCaisse ?? 0
  const totalNbCaisses = nbGros + nbDemi
  const fraisImpression = fraisImpressionParFeuille * nbFeuilles
  const fraisService = fraisServiceParCaisse * totalNbCaisses
  const totalHTAvecCaisses = totalHT + montantCaisses + fraisImpression + fraisService

  const retourHtml = bl.motifRetour
    ? `<div class="retour-notice">Motif retour : <strong>${bl.motifRetour}</strong></div>`
    : ""

  const statutBadge = {
    livre:           '<span class="badge badge-green">Livré</span>',
    premier_passage: '<span class="badge badge-blue">1er Passage</span>',
    deuxieme_passage:'<span class="badge badge-orange">2e Passage</span>',
    retour:          '<span class="badge badge-red">Retour</span>',
  }[bl.statutLivraison] ?? ""

  const body = `
<div class="doc-header">
  <div>
    ${co.logo ? `<img src="${co.logo}" style="height:50px;object-fit:contain;margin-bottom:4px" alt="logo">` : `<div class="company-name">${coName}</div>`}
    <div class="doc-type">Bon de Livraison</div>
    ${coAddr ? `<div style="font-size:8.5pt;color:#9ca3af;margin-top:3px">${coAddr}${coTel ? ` · Tél: ${coTel}` : ""}${coIce ? ` · ${coIce}` : ""}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div class="doc-number">BL-${bl.id.slice(0,8).toUpperCase()}</div>
    <div class="doc-date">Date : ${bl.date}</div>
    <div style="margin-top:6px">${statutBadge}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box">
    <span class="label">Client</span>
    <div class="value">${bl.clientNom}</div>
    <div class="sub">${bl.secteur || ""}${bl.zone ? ` — ${bl.zone}` : ""}</div>
  </div>
  <div class="info-box">
    <span class="label">Livreur</span>
    <div class="value">${bl.livreurNom}</div>
    <div class="sub">Prévendeur : ${bl.prevendeurNom}</div>
  </div>
</div>

${retourHtml}

<table>
  <thead><tr>
    <th style="width:28px">#</th>
    <th>Article</th>
    <th class="r" style="width:80px">Qté</th>
    <th class="r" style="width:90px">P.U. (DH)</th>
    <th class="r" style="width:100px">Total (DH)</th>
  </tr></thead>
  <tbody>
    ${lignesRows}
    ${caisseRows}
  </tbody>
</table>

<div class="totaux-wrap">
  <div class="totaux-box">
    <div class="total-row"><span>Valeur marchandise HT</span><span>${fmt(totalHT)} DH</span></div>
    ${montantCaisses > 0 ? "<div class=\"total-row\" style=\"color:#92400e\"><span>Consignes caisses (" + (nbGros > 0 ? nbGros + " gros x " + fmt(pricing.prixGrosseCaisse) + " DH" : "") + (nbDemi > 0 ? (nbGros > 0 ? " + " : "") + nbDemi + " demi x " + fmt(pricing.prixDemiCaisse) + " DH" : "") + ")</span><span>" + fmt(montantCaisses) + " DH</span></div>" : ""}
    ${fraisImpression > 0 ? `<div class="total-row" style="color:#6b7280"><span>Frais d&apos;impression (${nbFeuilles} feuille${nbFeuilles > 1 ? "s" : ""} × ${fmt(fraisImpressionParFeuille)} DH)</span><span>${fmt(fraisImpression)} DH</span></div>` : ""}
    ${fraisService > 0 ? `<div class="total-row" style="color:#6b7280"><span>Frais de service (${totalNbCaisses} caisse${totalNbCaisses > 1 ? "s" : ""} × ${fmt(fraisServiceParCaisse)} DH)</span><span>${fmt(fraisService)} DH</span></div>` : ""}
    ${tva > 0 ? `<div class="total-row"><span>TVA (${tva}%)</span><span>${fmt(totalHTAvecCaisses * tva / 100)} DH</span></div>` : ""}
    <div class="total-row grand"><span>TOTAL TTC</span><span>${fmt(totalHTAvecCaisses + (tva > 0 ? totalHTAvecCaisses * tva / 100 : 0))} DH</span></div>
  </div>
</div>

<div class="signatures">
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Signature Client</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Signature Livreur</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Cachet Société</div></div>
</div>

<div class="doc-footer">${coName} · Document généré le ${new Date().toLocaleDateString("fr-MA")} · Ce document vaut preuve de livraison.</div>
`
  openPrintWindow(`BL-${bl.id.slice(0,8).toUpperCase()} — ${bl.clientNom}`, "#16a34a", body)
}

// ── 2. FACTURE ───────────────────────────────────────────────────────────────

export function printFacture(bl: BonLivraison, numFacture?: string) {
  const co = getCompany()
  const coName = co.nom || "FreshLink Pro"
  const coAddr = [co.adresse, co.ville].filter(Boolean).join(" — ")
  const coTel  = co.telephone || ""
  const coIce  = co.ice ? `ICE: ${co.ice}` : ""
  const coRC   = co.rc  ? `RC: ${co.rc}`   : ""
  const facNum = numFacture || `FAC-${bl.id.slice(0,8).toUpperCase()}`

  const totalHT = bl.montantTotal
  const tva = bl.tva ?? 0
  const totalTTC = bl.montantTTC ?? totalHT
  const echeance = (() => {
    const d = new Date(bl.date)
    d.setDate(d.getDate() + 30)
    return d.toLocaleDateString("fr-MA")
  })()

  const lignesRows = bl.lignes.map((l, i) => {
    const umHtml = l.quantiteUM && l.um
      ? `<span class="um-badge">${l.quantiteUM} ${l.um}</span>`
      : ""
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${l.articleNom}</strong>${umHtml}</td>
      <td class="r">${l.quantite} ${l.unite || ""}</td>
      <td class="r">${fmt(l.prixUnitaire)}</td>
      <td class="r">${tva}%</td>
      <td class="r"><strong>${fmt(l.total)}</strong></td>
    </tr>`
  }).join("")

  // Caisse consigne rows on facture
  const facPricing = (bl as any).caissePricing ?? { prixGrosseCaisse: 70, prixDemiCaisse: 50 }
  const facNbGros = (bl as any).nbCaisseGros ?? 0
  const facNbDemi = (bl as any).nbCaisseDemi ?? 0
  const caisseRowsFac = [
    facNbGros > 0 ? `<tr style="background:#fefce8">
      <td>—</td>
      <td><strong>Grosse caisse (consigne)</strong></td>
      <td class="r">${facNbGros} u</td>
      <td class="r">${fmt(facPricing.prixGrosseCaisse)}</td>
      <td class="r">0%</td>
      <td class="r"><strong>${fmt(facNbGros * facPricing.prixGrosseCaisse)}</strong></td>
    </tr>` : "",
    facNbDemi > 0 ? `<tr style="background:#fefce8">
      <td>—</td>
      <td><strong>Demi-caisse (consigne)</strong></td>
      <td class="r">${facNbDemi} u</td>
      <td class="r">${fmt(facPricing.prixDemiCaisse)}</td>
      <td class="r">0%</td>
      <td class="r"><strong>${fmt(facNbDemi * facPricing.prixDemiCaisse)}</strong></td>
    </tr>` : "",
  ].filter(Boolean).join("")
  const montantCaissesFac = facNbGros * facPricing.prixGrosseCaisse + facNbDemi * facPricing.prixDemiCaisse
  const totalHTWithCaisses = totalHT + montantCaissesFac
  const tvaMontant = totalHTWithCaisses * tva / 100
  const totalTTCFinal = totalHTWithCaisses + tvaMontant

  const body = `
<div class="doc-header">
  <div>
    ${co.logo ? `<img src="${co.logo}" style="height:50px;object-fit:contain;margin-bottom:4px" alt="logo">` : `<div class="company-name">${coName}</div>`}
    <div class="doc-type">Facture</div>
    ${coAddr ? `<div style="font-size:8.5pt;color:#9ca3af;margin-top:3px">${coAddr}${coTel ? ` · Tél: ${coTel}` : ""}${coIce ? ` · ${coIce}` : ""}${coRC ? ` · ${coRC}` : ""}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div class="doc-number">${facNum}</div>
    <div class="doc-date">Date : ${bl.date}</div>
    <div class="doc-date" style="margin-top:2px">Échéance : <strong>${echeance}</strong></div>
    <div style="margin-top:6px"><span class="badge badge-blue">${bl.statut === "encaissé" ? "Encaissée" : "À encaisser"}</span></div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box">
    <span class="label">Émetteur</span>
    <div class="value">${coName}</div>
    <div class="sub">${coAddr || ""}${coIce ? ` · ${coIce}` : ""}</div>
  </div>
  <div class="info-box">
    <span class="label">Client (Destinataire)</span>
    <div class="value">${bl.clientNom}</div>
    <div class="sub">${bl.secteur || ""}${bl.zone ? ` — ${bl.zone}` : ""}</div>
  </div>
</div>

<table>
  <thead><tr>
    <th style="width:28px">#</th>
    <th>Désignation</th>
    <th class="r" style="width:80px">Qté</th>
    <th class="r" style="width:90px">P.U. HT (DH)</th>
    <th class="r" style="width:60px">TVA</th>
    <th class="r" style="width:110px">Montant HT (DH)</th>
  </tr></thead>
  <tbody>
    ${lignesRows}
    ${caisseRowsFac}
  </tbody>
  <tfoot>
    <tr>
      <td colspan="5" style="text-align:right;font-weight:600">Sous-total marchandises HT</td>
      <td class="r">${fmt(totalHT)} DH</td>
    </tr>
    ${montantCaissesFac > 0 ? `<tr style="color:#92400e">
      <td colspan="5" style="text-align:right;font-weight:600">Consignes caisses</td>
      <td class="r">${fmt(montantCaissesFac)} DH</td>
    </tr>` : ""}
    ${tva > 0 ? `<tr>
      <td colspan="5" style="text-align:right;font-weight:600">TVA (${tva}%)</td>
      <td class="r">${fmt(tvaMontant)} DH</td>
    </tr>` : ""}
    <tr>
      <td colspan="5" style="text-align:right" class="grand-total">Total TTC</td>
      <td class="r grand-total">${fmt(totalTTCFinal)} DH</td>
    </tr>
  </tfoot>
</table>

<div style="margin-bottom:20px;padding:12px 16px;background:#f0fdf4;border-radius:8px;border-left:4px solid #16a34a;font-size:9.5pt;color:#166534">
  <strong>Modalité de paiement :</strong> Comptant à réception · Paiement en DH uniquement.<br>
  Tout retard de paiement sera majoré d'une pénalité conformément à la législation marocaine.
</div>

<div class="signatures">
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Bon pour accord client</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Livreur / Commercial</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Cachet & Signature</div></div>
</div>

<div class="doc-footer">${coName} · Facture N° ${facNum} · Émise le ${new Date().toLocaleDateString("fr-MA")}</div>
`
  openPrintWindow(`Facture ${facNum} — ${bl.clientNom}`, "#2563eb", body)
}

// ── 3. BON DE COMMANDE (Commande prévendeur) ─────────────────────────────────

export function printBonCommande(cmd: Commande) {
  const co = getCompany()
  const coName = co.nom || "FreshLink Pro"
  const coAddr = [co.adresse, co.ville].filter(Boolean).join(" — ")

  const totalHT = cmd.lignes.reduce((s, l) => s + l.quantite * (l.prixVente ?? l.prixUnitaire ?? 0), 0)

  const lignesRows = cmd.lignes.map((l, i) => {
    const pv = l.prixVente ?? l.prixUnitaire ?? 0
    const umHtml = l.quantiteUM && l.um
      ? `<span class="um-badge">${l.quantiteUM} ${l.um}</span>`
      : ""
    return `<tr>
      <td>${i + 1}</td>
      <td><strong>${l.articleNom}</strong>${umHtml}</td>
      <td class="r">${l.quantite} ${l.unite || ""}</td>
      <td class="r">${fmt(pv)}</td>
      <td class="r"><strong>${fmt(l.quantite * pv)}</strong></td>
    </tr>`
  }).join("")

  const statutBadge = {
    en_attente: '<span class="badge badge-orange">En attente</span>',
    en_attente_approbation: '<span class="badge badge-orange">En attente approbation</span>',
    valide: '<span class="badge badge-green">Validée</span>',
    refuse: '<span class="badge badge-red">Refusée</span>',
    en_transit: '<span class="badge badge-blue">En transit</span>',
    livre: '<span class="badge badge-green">Livrée</span>',
    retour: '<span class="badge badge-red">Retour</span>',
  }[cmd.statut] ?? `<span class="badge">${cmd.statut}</span>`

  const body = `
<div class="doc-header">
  <div>
    ${co.logo ? `<img src="${co.logo}" style="height:50px;object-fit:contain;margin-bottom:4px" alt="logo">` : `<div class="company-name">${coName}</div>`}
    <div class="doc-type">Bon de Commande</div>
    ${coAddr ? `<div style="font-size:8.5pt;color:#9ca3af;margin-top:3px">${coAddr}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div class="doc-number">BC-${cmd.id.slice(0,8).toUpperCase()}</div>
    <div class="doc-date">Date : ${cmd.date}</div>
    <div class="doc-date" style="margin-top:2px">Livraison : <strong>${cmd.heurelivraison || "—"}</strong></div>
    <div style="margin-top:6px">${statutBadge}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box">
    <span class="label">Client</span>
    <div class="value">${cmd.clientNom}</div>
    <div class="sub">${cmd.secteur || ""}${cmd.zone ? ` — ${cmd.zone}` : ""}</div>
  </div>
  <div class="info-box">
    <span class="label">Prévendeur / Commercial</span>
    <div class="value">${cmd.commercialNom}</div>
    ${cmd.approbateur ? `<div class="sub">Approuvé par : ${cmd.approbateur}</div>` : ""}
  </div>
</div>

<table>
  <thead><tr>
    <th style="width:28px">#</th>
    <th>Article</th>
    <th class="r" style="width:90px">Quantité</th>
    <th class="r" style="width:90px">P.V. (DH)</th>
    <th class="r" style="width:100px">Total (DH)</th>
  </tr></thead>
  <tbody>${lignesRows}</tbody>
</table>

<div class="totaux-wrap">
  <div class="totaux-box">
    <div class="total-row"><span>Total commandé</span><span>${cmd.lignes.reduce((s,l)=>s+l.quantite,0).toFixed(1)} kg</span></div>
    <div class="total-row grand"><span>TOTAL HT</span><span>${fmt(totalHT)} DH</span></div>
  </div>
</div>

${cmd.notes ? `<div style="margin-bottom:20px;padding:10px 14px;background:#fefce8;border-radius:8px;border-left:4px solid #eab308;font-size:9.5pt"><strong>Notes :</strong> ${cmd.notes}</div>` : ""}

<div class="signatures">
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Prévendeur</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Client</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Approbation</div></div>
</div>

<div class="doc-footer">${coName} · Bon de Commande BC-${cmd.id.slice(0,8).toUpperCase()} · Généré le ${new Date().toLocaleDateString("fr-MA")}</div>
`
  openPrintWindow(`BC-${cmd.id.slice(0,8).toUpperCase()} — ${cmd.clientNom}`, "#d97706", body)
}

// ── 4. PURCHASE ORDER (vers fournisseur) ─────────────────────────────────────

export function printPO(po: PurchaseOrder) {
  const co = getCompany()
  const coName = co.nom || "FreshLink Pro"
  const coAddr = [co.adresse, co.ville].filter(Boolean).join(" — ")
  const coIce  = co.ice ? `ICE: ${co.ice}` : ""

  const statutBadge = {
    ouvert:       '<span class="badge badge-blue">Ouvert</span>',
    envoyé:       '<span class="badge badge-orange">Envoyé</span>',
    receptionné:  '<span class="badge badge-green">Réceptionné</span>',
    annulé:       '<span class="badge badge-red">Annulé</span>',
  }[po.statut] ?? `<span class="badge">${po.statut}</span>`

  const body = `
<div class="doc-header">
  <div>
    ${co.logo ? `<img src="${co.logo}" style="height:50px;object-fit:contain;margin-bottom:4px" alt="logo">` : `<div class="company-name">${coName}</div>`}
    <div class="doc-type">Purchase Order (Bon d'Achat)</div>
    ${coAddr ? `<div style="font-size:8.5pt;color:#9ca3af;margin-top:3px">${coAddr}${coIce ? ` · ${coIce}` : ""}</div>` : ""}
  </div>
  <div style="text-align:right">
    <div class="doc-number">PO-${po.id.slice(0,8).toUpperCase()}</div>
    <div class="doc-date">Date : ${po.date}</div>
    <div style="margin-top:6px">${statutBadge}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-box">
    <span class="label">Acheteur (Nous)</span>
    <div class="value">${coName}</div>
    <div class="sub">${coAddr || ""}${coIce ? ` · ${coIce}` : ""}</div>
  </div>
  <div class="info-box">
    <span class="label">Fournisseur</span>
    <div class="value">${po.fournisseurNom}</div>
    <div class="sub">${po.fournisseurEmail || ""}</div>
  </div>
</div>

<table>
  <thead><tr>
    <th style="width:28px">#</th>
    <th>Article / Désignation</th>
    <th class="r" style="width:90px">Qté</th>
    <th class="r" style="width:90px">Unité</th>
    <th class="r" style="width:100px">P.U. (DH)</th>
    <th class="r" style="width:110px">Total (DH)</th>
  </tr></thead>
  <tbody>
    <tr>
      <td>1</td>
      <td><strong>${po.articleNom}</strong></td>
      <td class="r">${po.quantite}</td>
      <td class="r">${po.articleUnite}</td>
      <td class="r">${fmt(po.prixUnitaire)}</td>
      <td class="r"><strong>${fmt(po.total)}</strong></td>
    </tr>
  </tbody>
</table>

<div class="totaux-wrap">
  <div class="totaux-box">
    <div class="total-row"><span>Quantité totale</span><span>${po.quantite} ${po.articleUnite}</span></div>
    <div class="total-row grand"><span>TOTAL (DH)</span><span>${fmt(po.total)} DH</span></div>
  </div>
</div>

${po.notes ? `<div style="margin-bottom:20px;padding:10px 14px;background:#f0f9ff;border-radius:8px;border-left:4px solid #0ea5e9;font-size:9.5pt"><strong>Instructions / Notes :</strong> ${po.notes}</div>` : ""}

<div style="margin-bottom:20px;padding:12px 16px;background:#fafafa;border-radius:8px;border:1.5px dashed #d1d5db;font-size:9pt;color:#4b5563">
  <strong>Conditions de livraison :</strong> À définir avec le fournisseur.<br>
  <strong>Paiement :</strong> Selon accord — en DH.<br>
  Ce document est un bon de commande officiel. Merci de le signer et le retourner pour confirmation.
</div>

<div class="signatures">
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Acheteur — ${coName}</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Fournisseur — ${po.fournisseurNom}</div></div>
  <div class="sig-box"><div class="sig-line"></div><div class="sig-label">Date & Cachet</div></div>
</div>

<div class="doc-footer">${coName} · Purchase Order PO-${po.id.slice(0,8).toUpperCase()} · Émis le ${new Date().toLocaleDateString("fr-MA")}</div>
`
  openPrintWindow(`PO-${po.id.slice(0,8).toUpperCase()} — ${po.fournisseurNom}`, "#7c3aed", body)
}
