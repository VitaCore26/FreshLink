"use client"

import { useState, useMemo, useEffect } from "react"
import { store } from "@/lib/store"

// ══════════════════════════════════════════════════════════════════════════════
// Analyse Caisse Acheteur — réconciliation de la caisse des acheteurs terrain
//
//   ÉCART DE CAISSE = Fond pris − Σ(quantité reçue × prix achat) − Montant rendu
//
//   • Fond pris      : avance cash remise à l'acheteur (modifiable)
//   • Dépenses       : Σ des lignes de réception (quantité reçue × prix achat)
//   • Montant rendu  : cash physiquement rendu par l'acheteur (modifiable)
//   • Écart          : 0 = caisse juste · >0 = manque · <0 = surplus
//
// Les saisies (fond pris + montant rendu) sont mémorisées par acheteur + période.
// ══════════════════════════════════════════════════════════════════════════════

interface Saisie { fondPris?: number; montantRendu?: number }
type SaisieMap = Record<string, Saisie> // clé = acheteurNom|dateFrom|dateTo

const LS_KEY = "vf_caisse_acheteur_v1"
const money = (n: number) => `${(n ?? 0).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`

function todayISO() { return new Date().toISOString().slice(0, 10) }
function monthAgoISO() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }

export default function AnalyseCaisseAcheteur() {
  const [dateFrom, setDateFrom] = useState(monthAgoISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [saisies, setSaisies] = useState<SaisieMap>({})

  useEffect(() => {
    try { setSaisies(JSON.parse(localStorage.getItem(LS_KEY) || "{}")) } catch { /* noop */ }
  }, [])

  const persist = (next: SaisieMap) => {
    setSaisies(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* noop */ }
  }

  // Regroupe les données achat/réception par acheteur sur la période
  const rows = useMemo(() => {
    const bons = store.getBonsAchat().filter(b => b.date >= dateFrom && b.date <= dateTo)
    const receptions = store.getReceptions().filter(r => r.date >= dateFrom && r.date <= dateTo)

    // bonAchatId → acheteurNom (pour rattacher les réceptions)
    const bonToAcheteur: Record<string, string> = {}
    const acheteurBudget: Record<string, number> = {} // fond théorique = Σ lignes bon achat
    bons.forEach(b => {
      bonToAcheteur[b.id] = b.acheteurNom || "—"
      const tot = (b.lignes || []).reduce((s, l) => s + (l.quantite || 0) * (l.prixAchat || 0), 0)
      acheteurBudget[b.acheteurNom || "—"] = (acheteurBudget[b.acheteurNom || "—"] || 0) + tot
    })

    // Dépenses réelles par acheteur = Σ(quantité reçue × prix achat)
    const depenses: Record<string, number> = {}
    const nbLignes: Record<string, number> = {}
    receptions.forEach(r => {
      const acheteur = bonToAcheteur[r.bonAchatId] || r.fournisseurNom || "Réception manuelle"
      ;(r.lignes || []).forEach(l => {
        const prix = (l.prixAchat ?? l.prixFacture ?? 0)
        depenses[acheteur] = (depenses[acheteur] || 0) + (l.quantiteRecue || 0) * prix
        nbLignes[acheteur] = (nbLignes[acheteur] || 0) + 1
      })
    })

    // Union des acheteurs (depuis bons + réceptions)
    const noms = Array.from(new Set([...Object.keys(acheteurBudget), ...Object.keys(depenses)])).filter(Boolean)

    return noms.map(nom => {
      const key = `${nom}|${dateFrom}|${dateTo}`
      const s = saisies[key] || {}
      const budget = acheteurBudget[nom] || 0
      const dep = depenses[nom] || 0
      // Fond pris : saisi sinon = budget théorique (Σ bons d'achat)
      const fondPris = s.fondPris != null ? s.fondPris : budget
      // Montant rendu : saisi sinon = ce qui resterait si caisse juste (fond - dépenses)
      const montantRendu = s.montantRendu != null ? s.montantRendu : Math.max(0, fondPris - dep)
      const ecart = fondPris - dep - montantRendu
      return { nom, key, budget, depenses: dep, fondPris, montantRendu, ecart, nbLignes: nbLignes[nom] || 0 }
    }).sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
  }, [dateFrom, dateTo, saisies])

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    fondPris: acc.fondPris + r.fondPris,
    depenses: acc.depenses + r.depenses,
    montantRendu: acc.montantRendu + r.montantRendu,
    ecart: acc.ecart + r.ecart,
  }), { fondPris: 0, depenses: 0, montantRendu: 0, ecart: 0 }), [rows])

  const setSaisie = (key: string, field: keyof Saisie, value: string) => {
    const num = value === "" ? undefined : parseFloat(value)
    persist({ ...saisies, [key]: { ...saisies[key], [field]: num } })
  }

  const ecartCls = (e: number) =>
    Math.abs(e) < 0.01 ? "text-green-700 bg-green-50" : e > 0 ? "text-red-700 bg-red-50" : "text-blue-700 bg-blue-50"
  const ecartLabel = (e: number) =>
    Math.abs(e) < 0.01 ? "✅ Juste" : e > 0 ? "⚠️ Manque" : "↩︎ Surplus"

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900">💰 Analyse Caisse Acheteur</h1>
          <p className="text-sm text-slate-500 mt-1">
            Écart = <strong>Fond pris</strong> − (Quantité reçue × Prix achat) − <strong>Montant rendu</strong>
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Du</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Au</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Fond total pris" value={money(totals.fondPris)} icon="🏦" />
        <Kpi label="Dépenses réelles" value={money(totals.depenses)} icon="🧾" />
        <Kpi label="Total rendu" value={money(totals.montantRendu)} icon="↩︎" />
        <Kpi label="Écart global" value={money(totals.ecart)} icon={Math.abs(totals.ecart) < 0.01 ? "✅" : "⚠️"}
          accent={Math.abs(totals.ecart) < 0.01 ? "text-green-700" : totals.ecart > 0 ? "text-red-700" : "text-blue-700"} />
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-2">📭</p>
          <p className="font-semibold">Aucun achat/réception sur cette période</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold text-slate-500">Acheteur</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Fond pris (DH)</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Dépenses (qté×prix)</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Montant rendu (DH)</th>
                <th className="px-4 py-3 text-xs font-semibold text-slate-500 text-right">Écart de caisse</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{r.nom}</p>
                    <p className="text-[11px] text-slate-400">{r.nbLignes} ligne{r.nbLignes > 1 ? "s" : ""} · budget {money(r.budget)}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" step="0.01"
                      value={r.fondPris}
                      onChange={e => setSaisie(r.key, "fondPris", e.target.value)}
                      className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm font-semibold" />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-700">{money(r.depenses)}</td>
                  <td className="px-4 py-3 text-right">
                    <input type="number" step="0.01"
                      value={r.montantRendu}
                      onChange={e => setSaisie(r.key, "montantRendu", e.target.value)}
                      className="w-28 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm font-semibold" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-block px-3 py-1.5 rounded-lg font-bold ${ecartCls(r.ecart)}`}>
                      {money(r.ecart)} · {ecartLabel(r.ecart)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                <td className="px-4 py-3 text-slate-900">TOTAL</td>
                <td className="px-4 py-3 text-right">{money(totals.fondPris)}</td>
                <td className="px-4 py-3 text-right">{money(totals.depenses)}</td>
                <td className="px-4 py-3 text-right">{money(totals.montantRendu)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-block px-3 py-1.5 rounded-lg font-bold ${ecartCls(totals.ecart)}`}>
                    {money(totals.ecart)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
        💡 <strong>Fond pris</strong> est pré-rempli avec le total des bons d'achat de l'acheteur (modifiable).
        <strong> Montant rendu</strong> est pré-rempli pour une caisse juste (modifiable selon le cash réellement rendu).
        Un écart <span className="text-red-700 font-semibold">positif</span> = manque dans la caisse ;
        <span className="text-blue-700 font-semibold"> négatif</span> = surplus rendu.
      </p>
    </div>
  )
}

function Kpi({ label, value, icon, accent }: { label: string; value: string; icon: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">{icon}</div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-500 truncate">{label}</p>
        <p className={`text-lg font-black ${accent || "text-slate-900"}`}>{value}</p>
      </div>
    </div>
  )
}
