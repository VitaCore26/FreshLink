"use client"

import { useState, useMemo, useEffect } from "react"
import { store, type User } from "@/lib/store"

// ══════════════════════════════════════════════════════════════════════════════
// Caisse Acheteur — réconciliation + workflow Finance → Acheteur → RH
//
//   ÉCART = Fond pris − (Quantité × Prix achat) − Charges − Montant rendu
//
//   • Fond pris      : avance cash remise par la FINANCE (saisie finance)
//   • Quantité       : réceptionnée (si une réception existe) sinon achetée
//                      (bon d'achat = mobile acheteur)
//   • Prix achat     : prix de la réception si dispo, sinon prix du bon d'achat
//   • Charges        : frais terrain (transport, manutention…) — saisie
//   • Montant rendu  : cash physiquement rendu par l'acheteur — saisie acheteur
//   • Écart          : 0 = juste · >0 = manque (à déduire du salaire via RH)
//
//   Workflow :
//     brouillon → [Finance valide] → validé_finance
//               → [Acheteur approuve terrain] → approuvé_acheteur
//               → [Transmettre RH] → transmis_rh  (montant déduit du salaire)
// ══════════════════════════════════════════════════════════════════════════════

type Statut = "brouillon" | "validé_finance" | "approuvé_acheteur" | "transmis_rh"
interface Saisie {
  fondPris?: number
  charges?: number
  montantRendu?: number
  statut?: Statut
  validePar?: string        // finance
  approuvePar?: string      // acheteur
  transmisRhLe?: string
}
type SaisieMap = Record<string, Saisie> // clé = acheteurNom|dateFrom|dateTo

const LS_KEY = "vf_caisse_acheteur_v2"
const money = (n: number) => `${(n ?? 0).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`
function todayISO() { return new Date().toISOString().slice(0, 10) }
function monthAgoISO() { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10) }

const STATUT_CFG: Record<Statut, { label: string; cls: string }> = {
  brouillon:          { label: "Brouillon",            cls: "bg-slate-100 text-slate-700 border-slate-200" },
  validé_finance:     { label: "Validé finance",       cls: "bg-blue-100 text-blue-800 border-blue-200" },
  approuvé_acheteur:  { label: "Approuvé acheteur",    cls: "bg-amber-100 text-amber-800 border-amber-200" },
  transmis_rh:        { label: "Transmis RH",          cls: "bg-green-100 text-green-800 border-green-200" },
}

export default function AnalyseCaisseAcheteur() {
  const [dateFrom, setDateFrom] = useState(monthAgoISO())
  const [dateTo, setDateTo] = useState(todayISO())
  const [saisies, setSaisies] = useState<SaisieMap>({})
  const me: User | null = (() => { try { return store.getSession() } catch { return null } })()
  const myName = me?.name ?? "—"
  const myRole = String(me?.role ?? "")
  const isFinance = /admin|finance|comptable/.test(myRole)
  const isAcheteur = /acheteur/.test(myRole)
  const isRH = /admin|rh/.test(myRole)

  useEffect(() => {
    try { setSaisies(JSON.parse(localStorage.getItem(LS_KEY) || "{}")) } catch { /* noop */ }
  }, [])

  const persist = (next: SaisieMap) => {
    setSaisies(next)
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)) } catch { /* noop */ }
  }

  const rows = useMemo(() => {
    const bons = store.getBonsAchat().filter(b => b.date >= dateFrom && b.date <= dateTo)
    const receptions = store.getReceptions().filter(r => r.date >= dateFrom && r.date <= dateTo)

    const bonToAcheteur: Record<string, string> = {}
    const acheteurAchat: Record<string, number> = {}   // dépenses depuis bons d'achat (mobile acheteur)
    bons.forEach(b => {
      bonToAcheteur[b.id] = b.acheteurNom || "—"
      const tot = (b.lignes || []).reduce((s, l) => s + (l.quantite || 0) * (l.prixAchat || 0), 0)
      acheteurAchat[b.acheteurNom || "—"] = (acheteurAchat[b.acheteurNom || "—"] || 0) + tot
    })

    // Dépenses depuis réceptions = Σ(quantité reçue × prix achat/facture)
    const acheteurReception: Record<string, number> = {}
    receptions.forEach(r => {
      const acheteur = bonToAcheteur[r.bonAchatId] || r.fournisseurNom || "Réception manuelle"
      ;(r.lignes || []).forEach(l => {
        const prix = (l.prixAchat ?? l.prixFacture ?? 0)
        acheteurReception[acheteur] = (acheteurReception[acheteur] || 0) + (l.quantiteRecue || 0) * prix
      })
    })

    const noms = Array.from(new Set([...Object.keys(acheteurAchat), ...Object.keys(acheteurReception)])).filter(Boolean)

    return noms.map(nom => {
      const key = `${nom}|${dateFrom}|${dateTo}`
      const s = saisies[key] || {}
      // Quantité × prix : priorité réception si elle existe, sinon achat mobile
      const hasReception = acheteurReception[nom] != null && acheteurReception[nom] > 0
      const depenses = hasReception ? acheteurReception[nom] : (acheteurAchat[nom] || 0)
      const sourceQte = hasReception ? "Réception" : "Achat (mobile)"
      const fondPris = s.fondPris != null ? s.fondPris : (acheteurAchat[nom] || depenses)
      const charges = s.charges ?? 0
      const montantRendu = s.montantRendu != null ? s.montantRendu : Math.max(0, fondPris - depenses - charges)
      const ecart = fondPris - depenses - charges - montantRendu
      const statut: Statut = s.statut ?? "brouillon"
      return { nom, key, depenses, sourceQte, fondPris, charges, montantRendu, ecart, statut, s }
    }).sort((a, b) => Math.abs(b.ecart) - Math.abs(a.ecart))
  }, [dateFrom, dateTo, saisies])

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    fondPris: acc.fondPris + r.fondPris,
    depenses: acc.depenses + r.depenses,
    charges: acc.charges + r.charges,
    montantRendu: acc.montantRendu + r.montantRendu,
    ecart: acc.ecart + r.ecart,
    aDeduire: acc.aDeduire + (r.statut === "transmis_rh" && r.ecart > 0 ? r.ecart : 0),
  }), { fondPris: 0, depenses: 0, charges: 0, montantRendu: 0, ecart: 0, aDeduire: 0 }), [rows])

  const setField = (key: string, field: keyof Saisie, value: string) => {
    const num = value === "" ? undefined : parseFloat(value)
    persist({ ...saisies, [key]: { ...saisies[key], [field]: num } })
  }
  const setStatut = (key: string, statut: Statut, extra: Partial<Saisie> = {}) => {
    persist({ ...saisies, [key]: { ...saisies[key], statut, ...extra } })
  }

  const ecartCls = (e: number) =>
    Math.abs(e) < 0.01 ? "text-green-700 bg-green-50" : e > 0 ? "text-red-700 bg-red-50" : "text-blue-700 bg-blue-50"
  const ecartLabel = (e: number) =>
    Math.abs(e) < 0.01 ? "✅ Juste" : e > 0 ? "⚠️ Manque" : "↩︎ Surplus"

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900">💰 Caisse Acheteur</h1>
          <p className="text-sm text-slate-500 mt-1">
            Écart = <strong>Fond pris</strong> − (Quantité × Prix achat) − <strong>Charges</strong> − <strong>Montant rendu</strong>
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Du</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Au</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
          </div>
        </div>
      </div>
      <p className="text-[11px] text-slate-400 mb-4">
        Connecté : <strong>{myName}</strong> · rôle {myRole || "—"}
        {isFinance && " · peut valider (Finance)"}{isAcheteur && " · peut approuver (Acheteur)"}{isRH && " · accès RH"}
      </p>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        <Kpi label="Fond total" value={money(totals.fondPris)} icon="🏦" />
        <Kpi label="Dépenses" value={money(totals.depenses)} icon="🧾" />
        <Kpi label="Charges" value={money(totals.charges)} icon="🚚" />
        <Kpi label="Total rendu" value={money(totals.montantRendu)} icon="↩︎" />
        <Kpi label="À déduire (RH)" value={money(totals.aDeduire)} icon="🧮"
          accent={totals.aDeduire > 0 ? "text-red-700" : "text-slate-900"} />
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-2">📭</p>
          <p className="font-semibold">Aucun achat/réception sur cette période</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-3 text-xs font-semibold text-slate-500">Acheteur</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 text-right">Fond pris</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 text-right">Qté × Prix</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 text-right">Charges</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 text-right">Montant rendu</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500 text-right">Écart</th>
                <th className="px-3 py-3 text-xs font-semibold text-slate-500">Statut / Workflow</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className="border-t border-slate-100 align-top">
                  <td className="px-3 py-3">
                    <p className="font-semibold text-slate-900">{r.nom}</p>
                    <p className="text-[11px] text-slate-400">source : {r.sourceQte}</p>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <input type="number" step="0.01" value={r.fondPris} disabled={!isFinance || r.statut === "transmis_rh"}
                      onChange={e => setField(r.key, "fondPris", e.target.value)}
                      title={isFinance ? "Saisi par la Finance" : "Réservé à la Finance"}
                      className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm font-semibold disabled:bg-slate-50 disabled:text-slate-400" />
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-slate-700">{money(r.depenses)}</td>
                  <td className="px-3 py-3 text-right">
                    <input type="number" step="0.01" value={r.charges} disabled={r.statut === "transmis_rh"}
                      onChange={e => setField(r.key, "charges", e.target.value)}
                      className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm disabled:bg-slate-50" />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <input type="number" step="0.01" value={r.montantRendu} disabled={!(isAcheteur || isFinance) || r.statut === "transmis_rh"}
                      onChange={e => setField(r.key, "montantRendu", e.target.value)}
                      title="Saisi par l'acheteur"
                      className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 text-right text-sm font-semibold disabled:bg-slate-50 disabled:text-slate-400" />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`inline-block px-2.5 py-1.5 rounded-lg font-bold text-xs ${ecartCls(r.ecart)}`}>
                      {money(r.ecart)}<br />{ecartLabel(r.ecart)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold border ${STATUT_CFG[r.statut].cls}`}>
                      {STATUT_CFG[r.statut].label}
                    </span>
                    <div className="flex flex-col gap-1 mt-2">
                      {/* Étape 1 : Finance valide */}
                      {r.statut === "brouillon" && isFinance && (
                        <button onClick={() => setStatut(r.key, "validé_finance", { validePar: myName })}
                          className="text-[11px] px-2 py-1 rounded-md bg-blue-600 text-white font-semibold hover:bg-blue-700">
                          ✓ Valider (Finance)
                        </button>
                      )}
                      {/* Étape 2 : Acheteur approuve terrain */}
                      {r.statut === "validé_finance" && (isAcheteur || isFinance) && (
                        <button onClick={() => setStatut(r.key, "approuvé_acheteur", { approuvePar: myName })}
                          className="text-[11px] px-2 py-1 rounded-md bg-amber-500 text-white font-semibold hover:bg-amber-600">
                          ✓ Approuver (Acheteur)
                        </button>
                      )}
                      {/* Étape 3 : Transmettre RH */}
                      {r.statut === "approuvé_acheteur" && isFinance && (
                        <button onClick={() => setStatut(r.key, "transmis_rh", { transmisRhLe: todayISO() })}
                          className="text-[11px] px-2 py-1 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700">
                          → Transmettre RH {r.ecart > 0 ? `(déduire ${money(r.ecart)})` : ""}
                        </button>
                      )}
                      {r.statut === "transmis_rh" && (
                        <p className="text-[10px] text-green-700">
                          {r.ecart > 0 ? `À déduire du salaire : ${money(r.ecart)}` : "Caisse juste — aucune déduction"}
                          {r.s.transmisRhLe ? ` · le ${r.s.transmisRhLe}` : ""}
                        </p>
                      )}
                      {r.s.validePar && <p className="text-[10px] text-slate-400">Validé : {r.s.validePar}</p>}
                      {r.s.approuvePar && <p className="text-[10px] text-slate-400">Approuvé : {r.s.approuvePar}</p>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                <td className="px-3 py-3 text-slate-900">TOTAL</td>
                <td className="px-3 py-3 text-right">{money(totals.fondPris)}</td>
                <td className="px-3 py-3 text-right">{money(totals.depenses)}</td>
                <td className="px-3 py-3 text-right">{money(totals.charges)}</td>
                <td className="px-3 py-3 text-right">{money(totals.montantRendu)}</td>
                <td className="px-3 py-3 text-right"><span className={`inline-block px-2.5 py-1.5 rounded-lg ${ecartCls(totals.ecart)}`}>{money(totals.ecart)}</span></td>
                <td className="px-3 py-3 text-right text-red-700">RH : {money(totals.aDeduire)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="mt-4 text-[11px] text-slate-400 leading-relaxed space-y-1">
        <p>💡 <strong>Quantité × Prix</strong> : prix issu de la <strong>réception</strong> si elle existe pour l'acheteur, sinon de l'<strong>achat mobile</strong> (bon d'achat).</p>
        <p>🔐 <strong>Workflow</strong> : Finance saisit le fond pris + valide → l'Acheteur confirme le montant rendu (approbation terrain) → Finance transmet à la RH le montant à déduire du salaire si écart positif.</p>
        <p>📌 Champs <em>Fond pris</em> réservé Finance · <em>Montant rendu</em> saisi par l'Acheteur. Données mémorisées localement (sync Supabase si table fl_caisse_acheteur disponible).</p>
      </div>
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
