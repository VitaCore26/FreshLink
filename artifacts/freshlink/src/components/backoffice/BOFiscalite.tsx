"use client"

import { useState, useEffect, useMemo } from "react"
import { store, type User, type Article, type Salarie, type FiscalConfig, DEFAULT_FISCAL_CONFIG } from "@/lib/store"

interface Props { user: User }

interface CmdLigne { articleId?: string; quantite?: number; prixVente?: number; prixUnitaire?: number; total?: number }
interface CmdRow { id: string; payload: { date?: string; lignes?: CmdLigne[]; clientNom?: string } }
interface BLRow { id: string; payload: { date?: string; montantTTC?: number; montantTotal?: number } }

async function fetchTable<T>(table: string): Promise<T[]> {
  try {
    const res = await fetch(`/api/sync-read?table=${table}`, { cache: "no-store" })
    const json = await res.json()
    return json?.ok ? (json.data ?? []) : []
  } catch { return [] }
}

function fmtDH(n: number) {
  return n.toLocaleString("fr-MA", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " DH"
}

export default function BOFiscalite({ user }: Props) {
  const canEdit = ["super_super_admin", "super_admin", "admin"].includes(user.role)
  const [loading, setLoading] = useState(true)
  const [commandes, setCommandes] = useState<CmdRow[]>([])
  const [bls, setBls] = useState<BLRow[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [salaries, setSalaries] = useState<Salarie[]>([])
  const [cfg, setCfg] = useState<FiscalConfig>(store.getFiscalConfig())
  const [showCfg, setShowCfg] = useState(false)
  const [saved, setSaved] = useState(false)

  // Période — par défaut toute la donnée disponible
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  const load = () => {
    setLoading(true)
    Promise.all([
      fetchTable<CmdRow>("fl_commandes"),
      fetchTable<BLRow>("fl_bons_livraison"),
      fetchTable<{ id: string; payload: Article }>("fl_articles"),
      fetchTable<{ id: string; payload: Salarie }>("fl_salaries"),
    ]).then(([c, b, a, s]) => {
      setCommandes(c.filter(r => r.payload && !String(r.id).startsWith("__")))
      setBls(b.filter(r => r.payload && !String(r.id).startsWith("__")))
      setArticles(a.filter(r => r.payload).map(r => ({ ...r.payload, id: r.id })))
      setSalaries(s.filter(r => r.payload).map(r => ({ ...r.payload, id: r.id })))
      setLoading(false)
    })
  }
  useEffect(load, [])

  const inRange = (d?: string) => {
    if (!d) return false
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  }

  const cmdInPeriod = useMemo(() => commandes.filter(c => inRange(c.payload?.date)), [commandes, from, to])
  const blInPeriod = useMemo(() => bls.filter(b => inRange(b.payload?.date)), [bls, from, to])

  const articleById = useMemo(() => {
    const m = new Map<string, Article>()
    articles.forEach(a => m.set(a.id, a))
    return m
  }, [articles])

  const stats = useMemo(() => {
    let caCommande = 0, qte = 0, coutMarchandise = 0
    const joursSet = new Set<string>()
    cmdInPeriod.forEach(c => {
      if (c.payload?.date) joursSet.add(c.payload.date)
      ;(c.payload?.lignes ?? []).forEach(l => {
        const total = Number(l.total) || (Number(l.quantite) || 0) * (Number(l.prixVente ?? l.prixUnitaire) || 0)
        caCommande += total
        qte += Number(l.quantite) || 0
        const art = l.articleId ? articleById.get(l.articleId) : undefined
        coutMarchandise += (Number(l.quantite) || 0) * (Number(art?.prixAchat) || 0)
      })
    })
    const caLivre = blInPeriod.reduce((s, b) => s + (Number(b.payload?.montantTTC ?? b.payload?.montantTotal) || 0), 0)
    const ca = caLivre > 0 ? caLivre : caCommande // CA facturé fait foi ; à défaut, CA commandé (pipeline)
    const margeBrute = caCommande - coutMarchandise
    const nbJours = joursSet.size

    const salariesActifs = salaries.filter(s => s.statut === "actif" || s.statut === "periode_essai")
    const masseSalariale = salariesActifs.reduce((s, sal) => s + (Number(sal.salaireBrut) || 0), 0)
    const chargesPatronales = masseSalariale * (cfg.tauxChargesPatronales / 100)
    const coutSuperbrutMensuel = masseSalariale + chargesPatronales

    const cotisationMinimale = ca * (cfg.tauxCotisationMinimale / 100)
    const tvaEstimee = ca * (cfg.tauxTVA / 100)
    const ratioMasseSalariale = ca > 0 ? (coutSuperbrutMensuel / ca) * 100 : 0

    // Projection : moyenne/jour observée × jours ouvrés — fiabilité liée à nbJours
    const caParJour = nbJours > 0 ? ca / nbJours : 0
    const qteParJour = nbJours > 0 ? qte / nbJours : 0
    const caProjeteMois = caParJour * cfg.joursOuvresParMois
    const qteProjeteeMois = qteParJour * cfg.joursOuvresParMois
    const caProjeteAn = caProjeteMois * 12
    const qteProjeteeAn = qteProjeteeMois * 12

    return {
      ca, caCommande, caLivre, qte, margeBrute, nbJours,
      masseSalariale, chargesPatronales, coutSuperbrutMensuel,
      cotisationMinimale, tvaEstimee, ratioMasseSalariale,
      caParJour, qteParJour, caProjeteMois, qteProjeteeMois, caProjeteAn, qteProjeteeAn,
      nbClients: new Set(cmdInPeriod.map(c => c.payload?.clientNom)).size,
      nbCommandes: cmdInPeriod.length,
      nbSalariesActifs: salariesActifs.length,
    }
  }, [cmdInPeriod, blInPeriod, articleById, salaries, cfg])

  const confianceFaible = stats.nbJours > 0 && stats.nbJours < 7

  const recommandations = useMemo(() => {
    const r: { level: "warn" | "info" | "ok"; text: string }[] = []
    if (stats.nbJours === 0) {
      r.push({ level: "info", text: "Aucune commande sur la période sélectionnée — élargissez la plage de dates." })
      return r
    }
    if (confianceFaible) {
      r.push({ level: "warn", text: `Projection basée sur seulement ${stats.nbJours} jour(s) de données réelles — marge d'erreur élevée. Collectez au moins 1-2 semaines avant de vous fier aux montants projetés.` })
    }
    if (stats.nbSalariesActifs === 0) {
      r.push({ level: "info", text: "Aucun salarié actif enregistré dans le module RH — les charges patronales affichées sont donc à 0. Ajoutez vos employés dans RH > Comptabilité RH pour un calcul réel de la masse salariale." })
    } else if (stats.ratioMasseSalariale > cfg.seuilAlerteMasseSalariale) {
      r.push({ level: "warn", text: `Ratio masse salariale (superbrut) / CA = ${stats.ratioMasseSalariale.toFixed(1)}% — au-dessus du seuil d'alerte (${cfg.seuilAlerteMasseSalariale}%). Réévaluez les prochains recrutements ou augmentez le volume traité avant d'embaucher.` })
    } else {
      r.push({ level: "ok", text: `Ratio masse salariale / CA = ${stats.ratioMasseSalariale.toFixed(1)}% — sous le seuil d'alerte (${cfg.seuilAlerteMasseSalariale}%).` })
    }
    if (stats.caLivre === 0 && stats.caCommande > 0) {
      r.push({ level: "info", text: "Le CA affiché est basé sur les commandes (pipeline), aucun BL facturé n'existe encore sur la période — le CA réel encaissable peut différer une fois les livraisons validées." })
    }
    if (stats.cotisationMinimale > 0) {
      r.push({ level: "info", text: `Cotisation minimale IS estimée : ${fmtDH(stats.cotisationMinimale)} sur la période — due même en l'absence de bénéfice si elle dépasse l'IS calculé sur le résultat réel.` })
    }
    return r
  }, [stats, cfg, confianceFaible])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Fiscalité & Fiduciaire</h1>
          <p className="text-sm text-slate-500 mt-0.5">Vita Fresh (Maroc) — calculs basés sur les données réelles de l&apos;ERP. Taux à valider avec votre fiduciaire avant toute déclaration.</p>
        </div>
        {canEdit && (
          <button onClick={() => setShowCfg(v => !v)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            {showCfg ? "Masquer les taux" : "Régler les taux"}
          </button>
        )}
      </div>

      {showCfg && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          {([
            ["tauxTVA", "TVA (%) — 0 = fruits/légumes frais exonérés"],
            ["tauxCotisationMinimale", "Cotisation minimale IS (% du CA)"],
            ["tauxChargesPatronales", "Charges patronales (% du brut)"],
            ["seuilAlerteMasseSalariale", "Seuil alerte masse salariale (% du CA)"],
            ["joursOuvresParMois", "Jours ouvrés / mois"],
            ["tauxDroitTimbre", "Droit de timbre espèces (%)"],
            ["plafondCashAchatJour", "Plafond cash achat/jour/fournisseur (DH)"],
            ["plafondCashVenteFacture", "Plafond cash vente/facture (DH)"],
          ] as [keyof FiscalConfig, string][]).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-slate-500">{label}</label>
              <input type="number" step="0.01" value={cfg[key]}
                onChange={e => setCfg(c => ({ ...c, [key]: Number(e.target.value) || 0 }))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm" />
            </div>
          ))}
          <div className="col-span-2 md:col-span-5 flex items-center gap-2">
            <button onClick={() => { store.saveFiscalConfig(cfg); setSaved(true); setTimeout(() => setSaved(false), 2000) }}
              className="px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800">
              Enregistrer les taux
            </button>
            <button onClick={() => setCfg(DEFAULT_FISCAL_CONFIG)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50">
              Réinitialiser
            </button>
            {saved && <span className="text-xs font-semibold text-emerald-600">✓ Enregistré</span>}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-500">Du</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-slate-500">Au</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(""); setTo("") }} className="self-end px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-50">
            Tout afficher
          </button>
        )}
        <button onClick={load} className="self-end px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50 border border-emerald-200">
          🔄 Rafraîchir
        </button>
        <span className="ml-auto text-xs text-slate-400">{loading ? "Chargement…" : `${stats.nbCommandes} commande(s) · ${stats.nbClients} client(s) · ${stats.nbJours} jour(s) de données`}</span>
      </div>

      {confianceFaible && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm">
          <span className="text-lg leading-none">⚠️</span>
          <span><strong>Échantillon limité ({stats.nbJours} jour{stats.nbJours > 1 ? "s" : ""})</strong> — les projections mensuelles/annuelles ci-dessous ont une marge d&apos;erreur élevée. Elles s&apos;affineront automatiquement à mesure que l&apos;ERP accumule des commandes réelles.</span>
        </div>
      )}

      {/* KPI réels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "CA période", val: fmtDH(stats.ca), sub: stats.caLivre > 0 ? "facturé (BL)" : "commandé (pipeline)" },
          { label: "Tonnage période", val: `${(stats.qte / 1000).toFixed(2)} T`, sub: `${stats.qte.toFixed(0)} kg/unités cumulés` },
          { label: "Marge brute estimée", val: fmtDH(stats.margeBrute), sub: "CA commandé − coût marchandise" },
          { label: "Masse salariale (superbrut)", val: fmtDH(stats.coutSuperbrutMensuel), sub: `${stats.nbSalariesActifs} salarié(s) actif(s)` },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{k.label}</p>
            <p className="text-xl font-black text-slate-800 mt-1">{k.val}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Estimations fiscales */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Estimations fiscales (période sélectionnée)</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Cotisation minimale IS (plancher)</span><span className="font-bold">{fmtDH(stats.cotisationMinimale)}</span></div>
          <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">TVA estimée (collectée)</span><span className="font-bold">{fmtDH(stats.tvaEstimee)}</span></div>
          <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Charges patronales estimées</span><span className="font-bold">{fmtDH(stats.chargesPatronales)}</span></div>
          <div className="flex justify-between border-b border-slate-100 pb-2"><span className="text-slate-500">Ratio masse salariale / CA</span><span className={`font-bold ${stats.ratioMasseSalariale > cfg.seuilAlerteMasseSalariale ? "text-red-600" : "text-emerald-600"}`}>{stats.ratioMasseSalariale.toFixed(1)}%</span></div>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">L&apos;IS proprement dit (sur le bénéfice réel) nécessite le résultat net complet (charges fixes, amortissements...) — non disponible dans l&apos;ERP. La cotisation minimale ci-dessus est le plancher légal, indépendant du bénéfice.</p>
      </div>

      {/* Projection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Projection si le rythme actuel se maintient</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><p className="text-slate-400 text-[11px]">CA / jour moyen</p><p className="font-bold text-base">{fmtDH(stats.caParJour)}</p></div>
          <div><p className="text-slate-400 text-[11px]">CA projeté / mois</p><p className="font-bold text-base">{fmtDH(stats.caProjeteMois)}</p></div>
          <div><p className="text-slate-400 text-[11px]">CA projeté / an</p><p className="font-bold text-base">{fmtDH(stats.caProjeteAn)}</p></div>
          <div><p className="text-slate-400 text-[11px]">Tonnage projeté / an</p><p className="font-bold text-base">{(stats.qteProjeteeAn / 1000).toFixed(1)} T</p></div>
        </div>
      </div>

      {/* Recommandations */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Recommandations</h3>
        <div className="flex flex-col gap-2">
          {recommandations.map((r, i) => (
            <div key={i} className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm ${
              r.level === "warn" ? "bg-amber-50 text-amber-800 border border-amber-200" :
              r.level === "ok" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
              "bg-slate-50 text-slate-600 border border-slate-200"}`}>
              <span>{r.level === "warn" ? "⚠️" : r.level === "ok" ? "✓" : "ℹ️"}</span>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
