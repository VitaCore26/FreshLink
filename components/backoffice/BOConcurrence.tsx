"use client"

// ═══════════════════════════════════════════════════════════════════════════
//  BOConcurrence — Intelligence concurrentielle & performance commerciale
//  • Prix & Marge : import/export CSV (prix achat, vente, concurrent, marge)
//  • Comportement : algorithme qui classe chaque concurrent (agressif/aligné/premium)
//  • Flux & Trajectoire : import/export des flux concurrents + analyse de tendance
//  • Dashboard : tonnage, best seller, best customer, best zone, best prévendeur
//  Partage les relevés concurrents avec BOIntelligencePrix (clé fl_intel_prix).
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useRef, useEffect } from "react"
import { store, type User } from "@/lib/store"
import BOImportConcurrence from "./BOImportConcurrence"

// ─── Modèles ────────────────────────────────────────────────────────────────
interface CompetitorEntry {
  id: string
  concurrentNom: string
  sku: string
  prixConcurrent: number
  prixNotre: number
  unite: string
  source?: string
  lieu?: string
  date: string
  note?: string
}
interface FluxEntry {
  id: string
  date: string         // ISO yyyy-mm-dd
  concurrent: string
  sku: string
  prix: number
  volume?: number      // tonnage observé (optionnel)
}
// Ligne de facture concurrent (import Excel) — sert à auto-alimenter les onglets
interface ConcVente { article: string; pu: number; qt: number; secteur: string; client: string; type: string; date: string }

const LS_PRIX = "fl_intel_prix"
const LS_FLUX = "fl_intel_flux"

function getPrix(): CompetitorEntry[] { try { return JSON.parse(localStorage.getItem(LS_PRIX) ?? "[]") } catch { return [] } }
function savePrix(e: CompetitorEntry[]) { localStorage.setItem(LS_PRIX, JSON.stringify(e)) }
function getFlux(): FluxEntry[] { try { return JSON.parse(localStorage.getItem(LS_FLUX) ?? "[]") } catch { return [] } }
function saveFlux(e: FluxEntry[]) { localStorage.setItem(LS_FLUX, JSON.stringify(e)) }
function genId(p: string) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}` }

// ─── Stats utilitaires ──────────────────────────────────────────────────────
function mean(xs: number[]) { return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0 }
function stddev(xs: number[]) {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)))
}
// Pente d'une régression linéaire simple y = a·x + b (x = index temporel)
function slope(ys: number[]): number {
  const n = ys.length
  if (n < 2) return 0
  const xs = ys.map((_, i) => i)
  const mx = mean(xs), my = mean(ys)
  let num = 0, den = 0
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2 }
  return den === 0 ? 0 : num / den
}

// ─── CSV ────────────────────────────────────────────────────────────────────
function toCSV(headers: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "")
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [headers.join(";"), ...rows.map(r => r.map(esc).join(";"))].join("\n")
}
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter(l => l.trim())
  if (lines.length < 2) return []
  const sep = lines[0].includes(";") ? ";" : ","
  const headers = lines[0].split(sep).map(h => h.trim().toLowerCase())
  return lines.slice(1).map(line => {
    const cells = line.split(sep)
    const o: Record<string, string> = {}
    headers.forEach((h, i) => { o[h] = (cells[i] ?? "").trim().replace(/^"|"$/g, "") })
    return o
  })
}
function num(s: string | undefined): number { const n = parseFloat(String(s ?? "").replace(",", ".")); return isNaN(n) ? 0 : n }
function download(filename: string, content: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

// ─── Composant ──────────────────────────────────────────────────────────────
type Tab = "dashboard" | "prix" | "pv" | "comportement" | "flux" | "import"

export default function BOConcurrence({ user }: { user: User }) {
  const [tab, setTab] = useState<Tab>("dashboard")
  // Paramètres pricing stratégique
  const [margeTheo, setMargeTheo] = useState(25)   // % marge théorique (sur coût de revient)
  const [margeConc, setMargeConc] = useState(20)   // % marge supposée du concurrent
  const [decote, setDecote]       = useState(1)    // DH à retrancher pour attaquer (décote)
  const [prix, setPrix] = useState<CompetitorEntry[]>(getPrix)
  const [flux, setFlux] = useState<FluxEntry[]>(getFlux)
  const [ventes, setVentes] = useState<ConcVente[]>(() => { try { return JSON.parse(localStorage.getItem("fl_conc_ventes") ?? "[]") } catch { return [] } })
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const prixFileRef = useRef<HTMLInputElement>(null)
  const fluxFileRef = useRef<HTMLInputElement>(null)

  const canEdit = ["admin", "super_admin", "super_super_admin", "resp_commercial", "acheteur"].includes(user.role)
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 4000) }

  // Recharge les données importées quand on quitte l'onglet Import
  useEffect(() => {
    if (tab !== "import") {
      setPrix(getPrix()); setFlux(getFlux())
      try { setVentes(JSON.parse(localStorage.getItem("fl_conc_ventes") ?? "[]")) } catch { /* noop */ }
    }
  }, [tab])

  // ── Filtre de dates (plage x → y ; une seule date = ce jour) ───────────────
  const inRange = (d: string | undefined): boolean => {
    const x = String(d ?? "").slice(0, 10)
    if (dateFrom && x < dateFrom) return false
    if (dateTo && x > dateTo) return false
    return true
  }
  // Bornes disponibles (pour aider l'utilisateur)
  const allDates = useMemo(() => {
    const s = new Set<string>()
    prix.forEach(e => e.date && s.add(e.date.slice(0, 10)))
    ventes.forEach(v => v.date && s.add(String(v.date).slice(0, 10)))
    flux.forEach(f => f.date && s.add(f.date.slice(0, 10)))
    return [...s].sort()
  }, [prix, ventes, flux])

  // Prix concurrent filtré par la plage ; flux = CSV + factures (auto), filtré
  const prixF = useMemo(() => prix.filter(e => inRange(e.date)), [prix, dateFrom, dateTo])
  const fluxAuto = useMemo<FluxEntry[]>(() =>
    ventes.filter(v => Number(v.pu) > 0).map((v, i) => ({
      id: `fv_${i}`, date: String(v.date).slice(0, 10), concurrent: "Iziry",
      sku: v.article, prix: Number(v.pu) || 0, volume: Number(v.qt) || 0,
    })), [ventes])
  const fluxF = useMemo(() => [...flux, ...fluxAuto].filter(e => inRange(e.date)), [flux, fluxAuto, dateFrom, dateTo])

  // ── Dashboard : agrégats depuis les commandes confirmées ──────────────────
  const dash = useMemo(() => {
    const okStatuts = new Set(["valide", "en_preparation", "charge", "en_transit", "livre", "retour"])
    const cmds = store.getCommandes().filter(c => okStatuts.has(c.statut) && inRange(c.date))
    let tonnage = 0, ca = 0
    const acc = (m: Map<string, { ca: number; t: number }>, k: string, ca2: number, t: number) => {
      if (!k) return
      const cur = m.get(k) ?? { ca: 0, t: 0 }
      cur.ca += ca2; cur.t += t; m.set(k, cur)
    }
    const byArticle = new Map<string, { ca: number; t: number }>()
    const byClient = new Map<string, { ca: number; t: number }>()
    const byZone = new Map<string, { ca: number; t: number }>()
    const byPrev = new Map<string, { ca: number; t: number }>()
    for (const c of cmds) {
      for (const l of (c.lignes ?? [])) {
        const t = Number(l.quantite) || 0
        const v = Number(l.total) || 0
        tonnage += t; ca += v
        acc(byArticle, l.articleNom || "—", v, t)
        acc(byClient, c.clientNom || "—", v, t)
        acc(byZone, c.zone || c.secteur || "—", v, t)
        acc(byPrev, c.commercialNom || "—", v, t)
      }
    }
    const top = (m: Map<string, { ca: number; t: number }>) =>
      [...m.entries()].map(([k, v]) => ({ k, ...v })).sort((a, b) => b.ca - a.ca)
    return {
      nbCmds: cmds.length, tonnage, ca,
      articles: top(byArticle), clients: top(byClient), zones: top(byZone), prevs: top(byPrev),
    }
  }, [dateFrom, dateTo])

  // ── Prix & marge : croise le catalogue avec les relevés concurrents ───────
  const margeRows = useMemo(() => {
    const articles = store.getArticles()
    return articles.map(a => {
      const pa = Number(a.prixAchat) || 0
      const pv = store.computePV(a)
      const rel = prixF.filter(e => e.sku && a.nom && e.sku.toLowerCase().trim() === a.nom.toLowerCase().trim())
      const concAvg = rel.length ? mean(rel.map(e => e.prixConcurrent)) : 0
      const margeDH = pv - pa
      const margePct = pv > 0 ? (margeDH / pv) * 100 : 0
      const deltaConc = concAvg > 0 ? ((pv - concAvg) / concAvg) * 100 : 0
      return { nom: a.nom, unite: a.unite ?? "kg", pa, pv, margeDH, margePct, concAvg, deltaConc, nbRel: rel.length }
    }).sort((x, y) => y.margePct - x.margePct)
  }, [prixF])

  // ── PV stratégique : PV théorique, PV concurrence (est.), PV proposé pour attaquer ──
  const pvRows = useMemo(() => {
    const articles = store.getArticles()
    const charges = store.getChargesArticle()
    return articles.map(a => {
      const pa = Number(a.prixAchat) || 0
      const charge = Number(charges.find(c => c.id === a.chargeArticleId)?.montant) || 0
      const cout = pa + charge                                   // coût de revient
      const pvClient = store.computePV(a)                        // notre PV actuel (prix client)
      const rel = prixF.filter(e => e.sku && a.nom && e.sku.toLowerCase().trim() === a.nom.toLowerCase().trim())
      const paConc = rel.length ? mean(rel.map(e => e.prixConcurrent)) : 0   // PA concurrent (synthese)
      const pvTheo = Math.round(cout * (1 + margeTheo / 100) * 100) / 100    // PV théorique = coût + marge théorique
      const pvConcEst = paConc > 0 ? Math.round(paConc * (1 + margeConc / 100) * 100) / 100 : 0  // PV concurrent estimé
      // PV proposé pour attaquer :
      let pvPropose = pvTheo, strategie = "Marge théorique"
      if (paConc > 0) {
        if (pa < paConc - 0.01) { pvPropose = Math.round(pa * (1 + margeConc / 100) * 100) / 100; strategie = "On achète moins cher → PA + marge concurrent" }
        else if (Math.abs(pa - paConc) <= Math.max(0.01, paConc * 0.02)) { pvPropose = Math.max(cout, (pvConcEst || pvClient) - decote); strategie = "Même PA → on casse le PV (−" + decote + " DH)" }
        else { pvPropose = pvTheo; strategie = "On achète plus cher → garder notre marge" }
      }
      const margeProposeePct = pvPropose > 0 ? ((pvPropose - cout) / pvPropose) * 100 : 0
      return { nom: a.nom, unite: a.unite ?? "kg", pa, charge, cout, pvClient, paConc, pvTheo, pvConcEst, pvPropose, margeProposeePct, strategie, nbRel: rel.length }
    }).filter(r => r.nbRel > 0 || r.pa > 0).sort((x, y) => y.nbRel - x.nbRel)
  }, [prixF, margeTheo, margeConc, decote])

  // ── Comportement : classe chaque concurrent ───────────────────────────────
  const comportement = useMemo(() => {
    const byConc = new Map<string, CompetitorEntry[]>()
    for (const e of prixF) {
      if (!e.concurrentNom) continue
      const arr = byConc.get(e.concurrentNom) ?? []
      arr.push(e); byConc.set(e.concurrentNom, arr)
    }
    return [...byConc.entries()].map(([nom, rows]) => {
      const deltas = rows.filter(r => r.prixConcurrent > 0 && r.prixNotre > 0)
        .map(r => ((r.prixNotre - r.prixConcurrent) / r.prixConcurrent) * 100)
      const avgDelta = mean(deltas)             // >0 : nous + chers → concurrent agressif
      const vol = stddev(rows.map(r => r.prixConcurrent))
      const volPct = mean(rows.map(r => r.prixConcurrent)) > 0 ? (vol / mean(rows.map(r => r.prixConcurrent))) * 100 : 0
      let profil: string, ton: string, reco: string
      if (avgDelta >= 8) { profil = "Agressif"; ton = "red"; reco = "Casse les prix : protéger les SKU sensibles, jouer sur le service/fraîcheur plutôt que le prix." }
      else if (avgDelta <= -8) { profil = "Premium"; ton = "emerald"; reco = "Plus cher que nous : opportunité de gagner des parts sur ses clients sensibles au prix." }
      else { profil = "Aligné"; ton = "amber"; reco = "Suiveur : surveiller, réagir au cas par cas sur les SKU clés." }
      const volatil = volPct >= 12
      return { nom, count: rows.length, avgDelta, volPct, profil, ton, reco, volatil, skus: [...new Set(rows.map(r => r.sku))].length }
    }).sort((a, b) => b.avgDelta - a.avgDelta)
  }, [prixF])

  // ── Flux & trajectoire : tendance par (concurrent, sku) ───────────────────
  const trajectoires = useMemo(() => {
    const byKey = new Map<string, FluxEntry[]>()
    for (const f of fluxF) {
      const k = `${f.concurrent}|||${f.sku}`
      const arr = byKey.get(k) ?? []
      arr.push(f); byKey.set(k, arr)
    }
    return [...byKey.entries()].map(([k, rows]) => {
      const [concurrent, sku] = k.split("|||")
      const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
      const prices = sorted.map(r => r.prix)
      const sl = slope(prices)
      const base = mean(prices) || 1
      const slPct = (sl / base) * 100         // variation moyenne par point, en %
      let trend: string, ton: string
      if (slPct > 1.5) { trend = "Hausse"; ton = "red" }
      else if (slPct < -1.5) { trend = "Baisse"; ton = "emerald" }
      else { trend = "Stable"; ton = "slate" }
      const volPct = base > 0 ? (stddev(prices) / base) * 100 : 0
      const last = sorted[sorted.length - 1]
      const first = sorted[0]
      const variation = first.prix > 0 ? ((last.prix - first.prix) / first.prix) * 100 : 0
      return {
        concurrent, sku, points: sorted.length, trend, ton, slPct, volPct, variation,
        dernierPrix: last.prix, dernierDate: last.date,
        volumeTotal: sorted.reduce((s, r) => s + (Number(r.volume) || 0), 0),
      }
    }).sort((a, b) => Math.abs(b.variation) - Math.abs(a.variation))
  }, [fluxF])

  // ── Import / export ───────────────────────────────────────────────────────
  const exportMarge = () => {
    const headers = ["SKU", "Unite", "PrixAchat", "PrixVente", "MargeDH", "Marge%", "PrixConcurrentMoyen", "DeltaConcurrent%", "NbReleves"]
    const rows = margeRows.map(r => [r.nom, r.unite, r.pa.toFixed(2), r.pv.toFixed(2), r.margeDH.toFixed(2), r.margePct.toFixed(1), r.concAvg.toFixed(2), r.deltaConc.toFixed(1), r.nbRel])
    download(`marge-concurrence-${store.today()}.csv`, toCSV(headers, rows))
    flash("Export marge & concurrence téléchargé.")
  }
  const exportPrixTemplate = () => {
    const headers = ["Concurrent", "SKU", "PrixConcurrent", "NotrePrixVente", "Unite", "Lieu", "Source", "Date"]
    const rows = prix.length
      ? prix.map(e => [e.concurrentNom, e.sku, e.prixConcurrent, e.prixNotre, e.unite, e.lieu ?? "", e.source ?? "", e.date.slice(0, 10)])
      : [["Concurrent X", "Tomate", "6.5", "7.0", "kg", "Marché Derb Omar", "terrain", store.today()]]
    download(`releves-concurrents-${store.today()}.csv`, toCSV(headers, rows))
    flash("Modèle / export des relevés concurrents téléchargé.")
  }
  const importPrix = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const recs = parseCSV(String(reader.result ?? ""))
      const add: CompetitorEntry[] = recs.filter(r => (r["sku"] || r["concurrent"])).map(r => ({
        id: genId("ip"),
        concurrentNom: r["concurrent"] || r["concurrentnom"] || "Concurrent",
        sku: r["sku"] || r["article"] || "",
        prixConcurrent: num(r["prixconcurrent"] || r["prix_concurrent"] || r["prix"]),
        prixNotre: num(r["notreprixvente"] || r["prixnotre"] || r["prix_vente"]),
        unite: r["unite"] || "kg",
        lieu: r["lieu"] || "",
        source: r["source"] || "import",
        date: (r["date"] || store.today()) + (r["date"]?.includes("T") ? "" : "T00:00:00"),
      }))
      if (!add.length) { flash("Aucune ligne valide trouvée dans le CSV."); return }
      const next = [...add, ...prix]
      savePrix(next); setPrix(next)
      flash(`${add.length} relevé(s) concurrent importé(s).`)
    }
    reader.readAsText(file)
  }
  const exportFlux = () => {
    const headers = ["Date", "Concurrent", "SKU", "Prix", "Volume"]
    const rows = flux.length
      ? flux.map(f => [f.date, f.concurrent, f.sku, f.prix, f.volume ?? ""])
      : [[store.today(), "Concurrent X", "Tomate", "6.5", "120"]]
    download(`flux-concurrents-${store.today()}.csv`, toCSV(headers, rows))
    flash("Modèle / export des flux concurrents téléchargé.")
  }
  const importFlux = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const recs = parseCSV(String(reader.result ?? ""))
      const add: FluxEntry[] = recs.filter(r => r["sku"] && (r["prix"] !== undefined)).map(r => ({
        id: genId("fx"),
        date: (r["date"] || store.today()).slice(0, 10),
        concurrent: r["concurrent"] || "Concurrent",
        sku: r["sku"] || r["article"] || "",
        prix: num(r["prix"] || r["prixconcurrent"]),
        volume: r["volume"] ? num(r["volume"]) : undefined,
      }))
      if (!add.length) { flash("Aucune ligne valide trouvée dans le CSV."); return }
      const next = [...add, ...flux]
      saveFlux(next); setFlux(next)
      flash(`${add.length} point(s) de flux importé(s).`)
    }
    reader.readAsText(file)
  }
  const clearFlux = () => { if (confirm("Effacer tous les flux concurrents importés ?")) { saveFlux([]); setFlux([]) } }

  // ─── Rendu ─────────────────────────────────────────────────────────────────
  const fmt = (n: number) => n.toLocaleString("fr-MA", { maximumFractionDigits: 0 })
  const fmt1 = (n: number) => n.toLocaleString("fr-MA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const tone = (t: string) => ({
    red: "bg-red-100 text-red-700", emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700", slate: "bg-slate-100 text-slate-700",
    violet: "bg-violet-100 text-violet-700", blue: "bg-blue-100 text-blue-700",
  } as Record<string, string>)[t] ?? "bg-slate-100 text-slate-700"

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-50 min-h-screen">
      <div>
        <h2 className="text-xl font-black text-slate-900">Intelligence Concurrence & Performance</h2>
        <p className="text-sm text-slate-500">Prix, marges, comportement concurrent, flux & trajectoires, et performance commerciale.</p>
      </div>

      {msg && <div className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow">{msg}</div>}

      {/* Onglets */}
      <div className="flex gap-2 flex-wrap">
        {([
          ["dashboard", "Dashboard"],
          ["prix", "Prix & Marge"],
          ["pv", "PV stratégique"],
          ["comportement", "Comportement concurrent"],
          ["flux", "Flux & Trajectoire"],
          ["import", "📥 Import Excel"],
        ] as [Tab, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Filtre de dates (plage x→y · ou un jour précis) ───────────────── */}
      {tab !== "import" && (
        <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-xl p-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Du</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Au</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50" />
          </div>
          {allDates.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Jour précis</label>
              <select value={dateFrom && dateFrom === dateTo ? dateFrom : ""}
                onChange={e => { const d = e.target.value; setDateFrom(d); setDateTo(d) }}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-slate-50">
                <option value="">— Choisir un jour —</option>
                {allDates.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo("") }}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-red-500 pb-2">↺ Tout (cumul)</button>
          )}
          <span className="text-[11px] text-slate-400 pb-2">
            {dateFrom || dateTo
              ? (dateFrom && dateFrom === dateTo ? `Données du ${dateFrom}` : `Période ${dateFrom || "…"} → ${dateTo || "…"}`)
              : "Cumul (toutes dates)"}
            {allDates.length ? ` · ${allDates.length} jour(s) importés` : ""}
          </span>
        </div>
      )}

      {/* ── DASHBOARD ─────────────────────────────────────────────────────── */}
      {tab === "dashboard" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { l: "Tonnage total", v: `${fmt(dash.tonnage)} kg`, c: "blue" },
              { l: "Chiffre d'affaires", v: `${fmt(dash.ca)} DH`, c: "emerald" },
              { l: "Commandes", v: fmt(dash.nbCmds), c: "violet" },
              { l: "Panier moyen", v: `${fmt(dash.nbCmds ? dash.ca / dash.nbCmds : 0)} DH`, c: "amber" },
            ].map(k => (
              <div key={k.l} className="bg-white rounded-2xl border border-slate-200 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{k.l}</p>
                <p className={`text-2xl font-black mt-1 ${tone(k.c).split(" ")[1]}`}>{k.v}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopCard title="🏆 Best sellers (articles)" rows={dash.articles} unit="kg" fmt={fmt} />
            <TopCard title="👑 Best customers (clients)" rows={dash.clients} unit="kg" fmt={fmt} />
            <TopCard title="📍 Best zones" rows={dash.zones} unit="kg" fmt={fmt} />
            <TopCard title="🚀 Best prévendeurs" rows={dash.prevs} unit="kg" fmt={fmt} />
          </div>

          {/* Positionnement concurrent (résumé) */}
          {comportement.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-black text-slate-800 mb-2">Positionnement vs concurrents</p>
              <div className="flex flex-wrap gap-2">
                {comportement.slice(0, 8).map(c => (
                  <span key={c.nom} className={`text-xs font-bold px-2.5 py-1 rounded-full ${tone(c.ton)}`}>
                    {c.nom} · {c.profil} ({c.avgDelta >= 0 ? "+" : ""}{fmt1(c.avgDelta)}%)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PRIX & MARGE ──────────────────────────────────────────────────── */}
      {tab === "prix" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={exportMarge} className="px-3 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white">⬇ Télécharger marge & concurrence (CSV)</button>
            <button onClick={exportPrixTemplate} className="px-3 py-2 rounded-xl text-sm font-bold bg-slate-700 text-white">⬇ Modèle / export relevés</button>
            {canEdit && <button onClick={() => prixFileRef.current?.click()} className="px-3 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white">⬆ Importer relevés (CSV)</button>}
            <input ref={prixFileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importPrix(f); e.target.value = "" }} />
          </div>
          <p className="text-xs text-slate-500">Colonnes import attendues : <code>Concurrent;SKU;PrixConcurrent;NotrePrixVente;Unite;Lieu;Source;Date</code> (le SKU doit correspondre au nom de l&apos;article).</p>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-3 py-2">Article</th><th className="px-3 py-2 text-right">PA</th><th className="px-3 py-2 text-right">PV</th>
                <th className="px-3 py-2 text-right">Marge</th><th className="px-3 py-2 text-right">Marge %</th>
                <th className="px-3 py-2 text-right">Concurrent moy.</th><th className="px-3 py-2 text-right">Δ vs concurrent</th>
              </tr></thead>
              <tbody>
                {margeRows.map(r => (
                  <tr key={r.nom} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-semibold text-slate-800">{r.nom}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{fmt1(r.pa)}</td>
                    <td className="px-3 py-2 text-right font-bold text-slate-800">{fmt1(r.pv)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmt1(r.margeDH)}</td>
                    <td className={`px-3 py-2 text-right font-bold ${r.margePct < 10 ? "text-red-600" : r.margePct > 25 ? "text-emerald-600" : "text-slate-700"}`}>{fmt1(r.margePct)}%</td>
                    <td className="px-3 py-2 text-right text-slate-600">{r.concAvg > 0 ? fmt1(r.concAvg) : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {r.nbRel > 0
                        ? <span className={`font-bold ${r.deltaConc > 0 ? "text-red-600" : "text-emerald-600"}`}>{r.deltaConc >= 0 ? "+" : ""}{fmt1(r.deltaConc)}%</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PV STRATÉGIQUE ────────────────────────────────────────────────── */}
      {tab === "pv" && (
        <div className="flex flex-col gap-3">
          {/* Paramètres */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Marge théorique %</label>
              <input type="number" value={margeTheo} onChange={e => setMargeTheo(Number(e.target.value))} className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Marge concurrent % (supposée)</label>
              <input type="number" value={margeConc} onChange={e => setMargeConc(Number(e.target.value))} className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Décote attaque (DH)</label>
              <input type="number" step="0.5" value={decote} onChange={e => setDecote(Number(e.target.value))} className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm" />
            </div>
            <p className="text-[11px] text-slate-500 flex-1 min-w-[200px]">
              PV théorique = (PA + charge) × (1 + marge). <strong>PV proposé</strong> : si notre PA &lt; PA concurrent → PA + marge concurrent (on reste moins cher) ; si PA égal → on casse le PV (−décote) ; sinon on garde notre marge.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="px-3 py-2">Article</th><th className="px-3 py-2 text-right">PA</th><th className="px-3 py-2 text-right">Charge</th>
                <th className="px-3 py-2 text-right">Coût</th><th className="px-3 py-2 text-right">PV actuel</th><th className="px-3 py-2 text-right">PV théo.</th>
                <th className="px-3 py-2 text-right">PA conc.</th><th className="px-3 py-2 text-right">PV conc. (est.)</th>
                <th className="px-3 py-2 text-right">PV proposé</th><th className="px-3 py-2 text-right">Marge</th><th className="px-3 py-2">Stratégie</th>
              </tr></thead>
              <tbody>
                {pvRows.map(r => (
                  <tr key={r.nom} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-3 py-2 font-semibold text-slate-800">{r.nom}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{fmt1(r.pa)}</td>
                    <td className="px-3 py-2 text-right text-amber-600">{fmt1(r.charge)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmt1(r.cout)}</td>
                    <td className="px-3 py-2 text-right text-slate-500">{fmt1(r.pvClient)}</td>
                    <td className="px-3 py-2 text-right text-slate-700">{fmt1(r.pvTheo)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{r.paConc > 0 ? fmt1(r.paConc) : "—"}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{r.pvConcEst > 0 ? fmt1(r.pvConcEst) : "—"}</td>
                    <td className="px-3 py-2 text-right font-black text-emerald-700">{fmt1(r.pvPropose)}</td>
                    <td className={`px-3 py-2 text-right font-bold ${r.margeProposeePct < 8 ? "text-red-600" : "text-slate-700"}`}>{fmt1(r.margeProposeePct)}%</td>
                    <td className="px-3 py-2 text-[11px] text-slate-500">{r.nbRel > 0 ? r.strategie : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400">Les PA concurrents viennent de l&apos;import « synthese_achats » (relevés Marché). Importe-les pour activer la comparaison.</p>
        </div>
      )}

      {/* ── COMPORTEMENT ──────────────────────────────────────────────────── */}
      {tab === "comportement" && (
        <div className="flex flex-col gap-3">
          {comportement.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              Aucun relevé concurrent. Importe des relevés dans « Prix &amp; Marge » pour activer l&apos;analyse comportementale.
            </div>
          ) : comportement.map(c => (
            <div key={c.nom} className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900">{c.nom}</span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${tone(c.ton)}`}>{c.profil}</span>
                  {c.volatil && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Volatil / promo</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{c.skus} SKU · {c.count} relevés</span>
                  <span>Écart prix moyen : <strong className={c.avgDelta > 0 ? "text-red-600" : "text-emerald-600"}>{c.avgDelta >= 0 ? "+" : ""}{fmt1(c.avgDelta)}%</strong></span>
                  <span>Volatilité : <strong>{fmt1(c.volPct)}%</strong></span>
                </div>
              </div>
              <p className="text-sm text-slate-600">{c.reco}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── FLUX & TRAJECTOIRE ────────────────────────────────────────────── */}
      {tab === "flux" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={exportFlux} className="px-3 py-2 rounded-xl text-sm font-bold bg-slate-700 text-white">⬇ Modèle / export flux</button>
            {canEdit && <button onClick={() => fluxFileRef.current?.click()} className="px-3 py-2 rounded-xl text-sm font-bold bg-blue-600 text-white">⬆ Importer flux (CSV)</button>}
            {canEdit && flux.length > 0 && <button onClick={clearFlux} className="px-3 py-2 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-200">Vider les flux</button>}
            <input ref={fluxFileRef} type="file" accept=".csv,text/csv" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) importFlux(f); e.target.value = "" }} />
          </div>
          <p className="text-xs text-slate-500">Colonnes import attendues : <code>Date;Concurrent;SKU;Prix;Volume</code> — une ligne par date/relevé. L&apos;algorithme décortique la trajectoire (tendance, volatilité, variation).</p>

          {trajectoires.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
              Aucun flux importé. Télécharge le modèle, remplis-le (historique de prix par concurrent &amp; SKU), puis réimporte-le.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-3 py-2">Concurrent</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2 text-center">Points</th>
                  <th className="px-3 py-2 text-center">Tendance</th><th className="px-3 py-2 text-right">Variation</th>
                  <th className="px-3 py-2 text-right">Volatilité</th><th className="px-3 py-2 text-right">Dernier prix</th><th className="px-3 py-2 text-right">Volume</th>
                </tr></thead>
                <tbody>
                  {trajectoires.map((t, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-semibold text-slate-800">{t.concurrent}</td>
                      <td className="px-3 py-2 text-slate-600">{t.sku}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{t.points}</td>
                      <td className="px-3 py-2 text-center"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tone(t.ton)}`}>{t.trend}</span></td>
                      <td className={`px-3 py-2 text-right font-bold ${t.variation > 0 ? "text-red-600" : t.variation < 0 ? "text-emerald-600" : "text-slate-500"}`}>{t.variation >= 0 ? "+" : ""}{fmt1(t.variation)}%</td>
                      <td className="px-3 py-2 text-right text-slate-600">{fmt1(t.volPct)}%</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800">{fmt1(t.dernierPrix)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{t.volumeTotal ? fmt(t.volumeTotal) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── IMPORT EXCEL ───────────────────────────────────────────────────── */}
      {tab === "import" && <BOImportConcurrence />}
    </div>
  )
}

// ─── Carte Top N ──────────────────────────────────────────────────────────────
function TopCard({ title, rows, unit, fmt }: {
  title: string
  rows: { k: string; ca: number; t: number }[]
  unit: string
  fmt: (n: number) => string
}) {
  const top = rows.slice(0, 5)
  const max = top[0]?.ca || 1
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="text-sm font-black text-slate-800 mb-3">{title}</p>
      {top.length === 0 ? (
        <p className="text-xs text-slate-400">Aucune donnée de commande.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {top.map((r, i) => (
            <div key={r.k} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-700 truncate">{i + 1}. {r.k}</span>
                <span className="text-slate-500 shrink-0 ml-2">{fmt(r.ca)} DH · {fmt(r.t)} {unit}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${Math.max(4, (r.ca / max) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
