// ═══════════════════════════════════════════════════════════════════════════
//  BOComparatifExterne — Comparatif données externes (GestFlux & Iziry) vs FreshLink
//  • GestFlux "reception" : prix achat (achats/arrivages) vs notre PA
//  • Iziry "bons_livraison" : CA livré par période vs nos BL
//  • Iziry "factures" : volume facturation vs nos factures
//  Synchronisation : premier chargement = depuis avril 2026 ; quotidien = aujourd'hui
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useMemo } from "react"
import { store, type User } from "@/lib/store"

// ── Types ─────────────────────────────────────────────────────────────────────
interface GfReception {
  id: string; date: string; article: string; qte_recue: number
  nb_caisses: number; prix_vente: number; qualite: number; heure: string
}
interface IzBL {
  id: string; numero: string; client_id: string; statut: string
  montant_ht: number; montant_ttc: number; droits_timbre: number
  date_livraison: string; created_at: string
}
interface IzFacture {
  id: string; numero: string; bon_livraison_id: string; client_id: string
  date_facture: string; montant_ht: number; montant_ttc: number
  droits_timbre: number; statut: string
}
interface IzClient {
  id: string; code: string; raison_sociale: string; ville: string
}
interface IzArticle {
  id: string; reference: string; libelle: string; unite: string
  famille: string; actif: boolean; prix_achat?: number
}

type SyncStatus = "idle" | "loading" | "ok" | "error"

// ── Cache keys ────────────────────────────────────────────────────────────────
const CACHE = {
  gfRecep:    "fl_ext_gf_reception",
  izBL:       "fl_ext_iz_bl",
  izFact:     "fl_ext_iz_factures",
  izClients:  "fl_ext_iz_clients",
  izArticles: "fl_ext_iz_articles",
  lastSync:   "fl_ext_last_sync",
}

function loadCache<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") } catch { return [] }
}
function saveCache(key: string, data: unknown[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
async function getToken(source: "gestflux" | "iziry"): Promise<string | null> {
  try {
    const res = await fetch("/api/ext/db-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        email:    source === "gestflux" ? "hamza@alephcapital.io" : "hamza@iziry.local",
        password: source === "gestflux" ? "comptable1" : "123456",
      }),
    })
    if (!res.ok) return null
    const j = await res.json() as { ok: boolean; access_token?: string }
    return j.access_token ?? null
  } catch { return null }
}

async function sbFetch<T>(
  url: string, anonKey: string, token: string | null, table: string, qs: string
): Promise<T[]> {
  const bearer = token ?? anonKey
  try {
    const res = await fetch(`${url}/rest/v1/${table}?${qs}`, {
      headers: {
        "apikey": anonKey, "Authorization": `Bearer ${bearer}`,
        "Accept": "application/json", "Prefer": "count=exact",
      },
    })
    if (!res.ok) return []
    return await res.json() as T[]
  } catch { return [] }
}

const GF_URL = "https://dngqklliynfoqkalttpu.supabase.co"
const GF_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZ3FrbGxpeW5mb3FrYWx0dHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTY3NTQsImV4cCI6MjA4OTQ5Mjc1NH0.wJADBNlsyDq7t1wAPZkNpJkPZFpfUrbczdphoXZVyhA"
const IZ_URL = "https://gmbvrjxteoxbiyternfz.supabase.co"
const IZ_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtYnZyanh0ZW94Yml5dGVybmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1OTgxNjAsImV4cCI6MjA5MTE3NDE2MH0.lZ53-ZzyM9hdV2AE1N6OyPRj9_45mwlKXFglA9ZlJBE"

const APRIL = "2026-04-01"

async function syncAll(full: boolean): Promise<{
  gfRecep: GfReception[]; izBL: IzBL[]; izFact: IzFacture[]
  izClients: IzClient[]; izArticles: IzArticle[]
}> {
  const today = new Date().toISOString().slice(0, 10)
  const since = full ? APRIL : today

  const [gToken, iToken] = await Promise.all([
    getToken("gestflux"),
    getToken("iziry"),
  ])

  // Fetch all in parallel
  const [gfRecep, izBL, izFact, izClients, izArticles] = await Promise.all([
    sbFetch<GfReception>(GF_URL, GF_KEY, gToken, "reception",
      `select=id,date,article,qte_recue,nb_caisses,prix_vente,qualite,heure&date=gte.${since}&order=date.desc&limit=2000`),
    sbFetch<IzBL>(IZ_URL, IZ_KEY, iToken, "bons_livraison",
      `select=id,numero,client_id,statut,montant_ht,montant_ttc,droits_timbre,date_livraison,created_at&date_livraison=gte.${since}T00:00:00&order=date_livraison.desc&limit=2000`),
    sbFetch<IzFacture>(IZ_URL, IZ_KEY, iToken, "factures",
      `select=id,numero,bon_livraison_id,client_id,date_facture,montant_ht,montant_ttc,droits_timbre,statut&date_facture=gte.${since}T00:00:00&order=date_facture.desc&limit=2000`),
    sbFetch<IzClient>(IZ_URL, IZ_KEY, iToken, "clients",
      "select=id,code,raison_sociale,ville&limit=500"),
    sbFetch<IzArticle>(IZ_URL, IZ_KEY, iToken, "articles",
      "select=id,reference,libelle,unite,famille,actif&limit=500"),
  ])

  return { gfRecep, izBL, izFact, izClients, izArticles }
}

// ── Utility ───────────────────────────────────────────────────────────────────
function fmt(n: number, d = 0) { return n.toLocaleString("fr-MA", { minimumFractionDigits: d, maximumFractionDigits: d }) }
function fmtDate(s: string) { return s ? s.slice(0, 10) : "—" }
function normName(s: unknown): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0600-\u06ff]/g, " ").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim()
}

type SubTab = "achats" | "livraisons" | "factures" | "articles"

// ── Component ─────────────────────────────────────────────────────────────────
export default function BOComparatifExterne({ user: _user }: { user: User }) {
  const [subTab, setSubTab] = useState<SubTab>("achats")
  const [status, setStatus] = useState<SyncStatus>("idle")
  const [lastSync, setLastSync] = useState<string>(localStorage.getItem(CACHE.lastSync) ?? "")
  const [msg, setMsg] = useState<string | null>(null)

  const [gfRecep,    setGfRecep]    = useState<GfReception[]>(() => loadCache(CACHE.gfRecep))
  const [izBL,       setIzBL]       = useState<IzBL[]>(() => loadCache(CACHE.izBL))
  const [izFact,     setIzFact]     = useState<IzFacture[]>(() => loadCache(CACHE.izFact))
  const [izClients,  setIzClients]  = useState<IzClient[]>(() => loadCache(CACHE.izClients))
  const [izArticles, setIzArticles] = useState<IzArticle[]>(() => loadCache(CACHE.izArticles))

  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("2026-04-01")
  const [dateTo,   setDateTo]   = useState("")

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 5000) }

  const runSync = useCallback(async (full: boolean) => {
    setStatus("loading")
    flash(full ? "Chargement depuis avril 2026… (peut prendre quelques secondes)" : "Synchronisation aujourd'hui…")
    try {
      const data = await syncAll(full)

      // For incremental sync: merge, deduplicate by id
      const merge = <T extends { id: string }>(prev: T[], next: T[]): T[] => {
        const map = new Map<string, T>()
        prev.forEach(r => map.set(r.id, r))
        next.forEach(r => map.set(r.id, r))
        return [...map.values()]
      }

      const newGf    = full ? data.gfRecep    : merge(gfRecep,    data.gfRecep)
      const newBL    = full ? data.izBL        : merge(izBL,       data.izBL)
      const newFact  = full ? data.izFact      : merge(izFact,     data.izFact)
      const newCli   = data.izClients.length   ? data.izClients   : izClients
      const newArt   = data.izArticles.length  ? data.izArticles  : izArticles

      setGfRecep(newGf);    saveCache(CACHE.gfRecep,    newGf)
      setIzBL(newBL);        saveCache(CACHE.izBL,       newBL)
      setIzFact(newFact);    saveCache(CACHE.izFact,     newFact)
      setIzClients(newCli);  saveCache(CACHE.izClients,  newCli)
      setIzArticles(newArt); saveCache(CACHE.izArticles, newArt)

      const ts = new Date().toLocaleString("fr-MA")
      setLastSync(ts); localStorage.setItem(CACHE.lastSync, ts)
      setStatus("ok")
      flash(`✓ Synchronisé — ${newGf.length} réceptions GestFlux · ${newBL.length} BL Iziry · ${newFact.length} factures Iziry`)
    } catch {
      setStatus("error")
      flash("Erreur de synchronisation. Vérifiez la connexion.")
    }
  }, [gfRecep, izBL, izFact, izClients, izArticles])

  // Auto-sync today on mount if cache exists, full sync if empty
  useEffect(() => {
    if (gfRecep.length === 0 && izBL.length === 0) {
      runSync(true)
    } else {
      // Silent daily sync of today
      runSync(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Date filter ──────────────────────────────────────────────────────────
  const inRange = (d: string) => {
    const x = d.slice(0, 10)
    if (dateFrom && x < dateFrom) return false
    if (dateTo   && x > dateTo)   return false
    return true
  }

  // ── FreshLink data ───────────────────────────────────────────────────────
  const flArticles = store.getArticles()
  const flByNorm   = useMemo(() => {
    const m: Record<string, { pa: number; nom: string; unite: string }> = {}
    flArticles.forEach(a => { m[normName(a.nom)] = { pa: Number(a.prixAchat) || 0, nom: a.nom, unite: a.unite ?? "kg" } })
    return m
  }, [flArticles])

  const clientMap = useMemo(() => {
    const m: Record<string, string> = {}
    izClients.forEach(c => { m[c.id] = c.raison_sociale })
    return m
  }, [izClients])

  // ── GestFlux Achats ──────────────────────────────────────────────────────
  const gfFiltered = useMemo(() => {
    return gfRecep.filter(r => inRange(r.date) && (
      !search || normName(r.article).includes(normName(search))
    ))
  }, [gfRecep, dateFrom, dateTo, search])

  const gfAgg = useMemo(() => {
    const m: Record<string, { article: string; qteGf: number; prixGf: number; count: number; lastDate: string }> = {}
    gfFiltered.forEach(r => {
      const k = normName(r.article)
      const prev = m[k] ?? { article: r.article, qteGf: 0, prixGf: 0, count: 0, lastDate: "" }
      prev.qteGf  += r.qte_recue
      prev.prixGf  = r.prix_vente > 0 ? r.prix_vente : prev.prixGf
      prev.count  += 1
      if (r.date > prev.lastDate) prev.lastDate = r.date
      m[k] = prev
    })
    return Object.entries(m).map(([k, v]) => {
      const fl   = flByNorm[k]
      const paFl = fl?.pa ?? 0
      const diff = v.prixGf > 0 && paFl > 0 ? ((paFl - v.prixGf) / v.prixGf) * 100 : null
      return { ...v, paFl, diff, normKey: k }
    }).sort((a, b) => b.qteGf - a.qteGf)
  }, [gfFiltered, flByNorm])

  // ── Iziry BL ─────────────────────────────────────────────────────────────
  const blFiltered = useMemo(() => {
    return izBL.filter(r => inRange(r.date_livraison) && (
      !search || (clientMap[r.client_id] ?? "").toLowerCase().includes(search.toLowerCase())
    ))
  }, [izBL, dateFrom, dateTo, search, clientMap])

  const blStats = useMemo(() => {
    const total = blFiltered.reduce((s, r) => s + r.montant_ttc, 0)
    const byStatus: Record<string, number> = {}
    blFiltered.forEach(r => { byStatus[r.statut] = (byStatus[r.statut] ?? 0) + 1 })
    return { total, count: blFiltered.length, byStatus }
  }, [blFiltered])

  // ── Iziry Factures ────────────────────────────────────────────────────────
  const factFiltered = useMemo(() => {
    return izFact.filter(r => inRange(r.date_facture) && (
      !search || (clientMap[r.client_id] ?? "").toLowerCase().includes(search.toLowerCase()) ||
      r.numero.toLowerCase().includes(search.toLowerCase())
    ))
  }, [izFact, dateFrom, dateTo, search, clientMap])

  const factStats = useMemo(() => {
    const total = factFiltered.reduce((s, r) => s + r.montant_ttc, 0)
    const byStatus: Record<string, number> = {}
    factFiltered.forEach(r => { byStatus[r.statut] = (byStatus[r.statut] ?? 0) + 1 })
    return { total, count: factFiltered.length, byStatus }
  }, [factFiltered])

  // ── Iziry Articles ────────────────────────────────────────────────────────
  const artFiltered = useMemo(() => {
    return izArticles.filter(a =>
      !search || normName(a.libelle).includes(normName(search)) || a.reference.toLowerCase().includes(search.toLowerCase())
    )
  }, [izArticles, search])

  const artComp = useMemo(() => {
    return artFiltered.map(a => {
      const fl = flByNorm[normName(a.libelle)]
      return { ...a, paFl: fl?.pa ?? 0, nomFl: fl?.nom ?? null }
    })
  }, [artFiltered, flByNorm])

  // ── UI helpers ────────────────────────────────────────────────────────────
  const diffBadge = (diff: number | null) => {
    if (diff === null) return <span className="text-slate-300 text-[10px]">—</span>
    const cls = diff > 5 ? "bg-red-100 text-red-700" : diff < -5 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>{diff > 0 ? "+" : ""}{diff.toFixed(1)}%</span>
  }
  const statBadge = (s: string) => {
    const c: Record<string, string> = {
      emise: "bg-blue-100 text-blue-700", payee: "bg-emerald-100 text-emerald-700",
      livre: "bg-emerald-100 text-emerald-700", en_cours: "bg-amber-100 text-amber-700",
      annulee: "bg-red-100 text-red-700",
    }
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${c[s] ?? "bg-slate-100 text-slate-500"}`}>{s}</span>
  }

  const TABS: [SubTab, string][] = [
    ["achats",     `🛒 Achats GestFlux (${gfRecep.length})`],
    ["livraisons", `🚚 BL Iziry (${izBL.length})`],
    ["factures",   `🧾 Factures Iziry (${izFact.length})`],
    ["articles",   `📦 Articles Iziry (${izArticles.length})`],
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-black text-slate-900">Comparatif Données Externes</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            GestFlux (achats/arrivages) · Iziry (facturation, BL) vs FreshLink
            {lastSync && <span className="ml-2 text-slate-400">· Sync {lastSync}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => runSync(false)} disabled={status === "loading"}
            className="px-3 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold disabled:opacity-50 hover:bg-slate-700">
            {status === "loading" ? "⏳ Sync…" : "↺ Sync aujourd'hui"}
          </button>
          <button onClick={() => { if (confirm("Charger TOUS les données depuis avril 2026 ? (peut prendre 10s)")) runSync(true) }}
            disabled={status === "loading"}
            className="px-3 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold disabled:opacity-50 hover:bg-violet-700">
            📥 Import complet (avril→)
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-semibold shadow ${status === "error" ? "bg-red-600" : "bg-blue-600"} text-white`}>
          {msg}
        </div>
      )}

      {/* KPI bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { l: "Arrivages GestFlux", v: `${gfRecep.length}`, sub: `${fmt(gfRecep.reduce((s, r) => s + r.qte_recue, 0))} kg`, c: "blue" },
          { l: "BL Iziry", v: fmt(izBL.reduce((s, r) => s + r.montant_ttc, 0)), sub: `${izBL.length} BL`, c: "violet" },
          { l: "Facturé Iziry", v: fmt(izFact.reduce((s, r) => s + r.montant_ttc, 0)), sub: `${izFact.length} factures`, c: "emerald" },
          { l: "Articles Iziry", v: `${izArticles.filter(a => a.actif).length} actifs`, sub: `/${izArticles.length} total`, c: "amber" },
        ].map(k => (
          <div key={k.l} className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{k.l}</p>
            <p className={`text-xl font-black mt-0.5 ${k.c === "blue" ? "text-blue-700" : k.c === "violet" ? "text-violet-700" : k.c === "emerald" ? "text-emerald-700" : "text-amber-700"}`}>{k.v}</p>
            <p className="text-[10px] text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-xl p-3">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 flex-1 min-w-[160px]">
          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher article, client…"
            className="text-xs bg-transparent focus:outline-none w-full text-slate-700 placeholder:text-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Du</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Au</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50" />
        </div>
        {(dateFrom !== "2026-04-01" || dateTo) && (
          <button onClick={() => { setDateFrom("2026-04-01"); setDateTo("") }}
            className="text-xs text-slate-400 hover:text-red-500">↺ Réinit</button>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(([k, l]) => (
          <button key={k} onClick={() => setSubTab(k)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${subTab === k ? "bg-slate-900 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── Achats GestFlux ─────────────────────────────────────────────── */}
      {subTab === "achats" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-800">Arrivages GestFlux vs notre PA FreshLink</p>
              <p className="text-[11px] text-slate-400">{gfAgg.length} articles · {gfFiltered.length} lignes · Rouge = notre PA supérieur · Vert = notre PA inférieur</p>
            </div>
            <span className="text-xs text-slate-500 font-semibold">
              Total reçu : {fmt(gfFiltered.reduce((s, r) => s + r.qte_recue, 0))} kg
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                  <th className="px-4 py-2.5 text-left font-bold">Article GestFlux</th>
                  <th className="px-3 py-2.5 text-right font-bold">Qté reçue (kg)</th>
                  <th className="px-3 py-2.5 text-right font-bold">Prix GestFlux</th>
                  <th className="px-3 py-2.5 text-left font-bold">Article FreshLink</th>
                  <th className="px-3 py-2.5 text-right font-bold">Notre PA</th>
                  <th className="px-3 py-2.5 text-center font-bold">Écart</th>
                  <th className="px-3 py-2.5 text-center font-bold">Passages</th>
                  <th className="px-3 py-2.5 text-left font-bold">Dernier arrivage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {gfAgg.slice(0, 100).map((r, i) => (
                  <tr key={i} className={`hover:bg-slate-50 ${r.paFl > 0 && r.prixGf > 0 && Math.abs((r.paFl - r.prixGf) / r.prixGf * 100) > 20 ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-2 font-medium text-slate-800 max-w-[200px] truncate" title={r.article}>{r.article}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">{fmt(r.qteGf, 1)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">
                      {r.prixGf > 0 ? `${fmt(r.prixGf, 2)} DH` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-slate-500 max-w-[160px] truncate" title={r.nomFl ?? undefined}>
                      {r.nomFl ?? <span className="text-slate-300 italic">Non trouvé</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">
                      {r.paFl > 0 ? `${fmt(r.paFl, 2)} DH` : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">{diffBadge(r.diff)}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{r.count}</td>
                    <td className="px-3 py-2 text-slate-400">{fmtDate(r.lastDate)}</td>
                  </tr>
                ))}
                {gfAgg.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Aucun arrivage. Cliquez sur "Import complet" ou "Sync aujourd'hui".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── BL Iziry ────────────────────────────────────────────────────── */}
      {subTab === "livraisons" && (
        <div className="flex flex-col gap-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">BL total</p>
              <p className="text-2xl font-black text-violet-700">{fmt(blStats.total)} DH</p>
              <p className="text-xs text-slate-400">{blStats.count} bons</p>
            </div>
            {Object.entries(blStats.byStatus).map(([s, n]) => (
              <div key={s} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">{s}</p>
                <p className="text-xl font-black text-slate-700">{n}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-black text-slate-800">Bons de Livraison — Iziry</p>
              <p className="text-[11px] text-slate-400">{blFiltered.length} BL sur la période</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                    <th className="px-4 py-2.5 text-left font-bold">Numéro</th>
                    <th className="px-3 py-2.5 text-left font-bold">Client</th>
                    <th className="px-3 py-2.5 text-center font-bold">Statut</th>
                    <th className="px-3 py-2.5 text-right font-bold">Montant HT</th>
                    <th className="px-3 py-2.5 text-right font-bold">Timbre</th>
                    <th className="px-3 py-2.5 text-right font-bold">Montant TTC</th>
                    <th className="px-3 py-2.5 text-left font-bold">Date livraison</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {blFiltered.slice(0, 100).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-slate-700 text-[11px]">{r.numero}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">{clientMap[r.client_id] ?? r.client_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-center">{statBadge(r.statut)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">{fmt(r.montant_ht, 2)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">{fmt(r.droits_timbre, 2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-violet-700">{fmt(r.montant_ttc, 2)}</td>
                      <td className="px-3 py-2 text-slate-400">{fmtDate(r.date_livraison)}</td>
                    </tr>
                  ))}
                  {blFiltered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun BL sur cette période.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {blFiltered.length > 100 && <p className="text-center text-xs text-slate-400 py-2">Affichage des 100 premiers sur {blFiltered.length}</p>}
          </div>
        </div>
      )}

      {/* ── Factures Iziry ──────────────────────────────────────────────── */}
      {subTab === "factures" && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
              <p className="text-[10px] font-bold uppercase text-slate-400">Facturé TTC</p>
              <p className="text-2xl font-black text-emerald-700">{fmt(factStats.total)} DH</p>
              <p className="text-xs text-slate-400">{factStats.count} factures</p>
            </div>
            {Object.entries(factStats.byStatus).map(([s, n]) => (
              <div key={s} className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                <p className="text-[10px] font-bold uppercase text-slate-400">{s}</p>
                <p className="text-xl font-black text-slate-700">{n}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-sm font-black text-slate-800">Factures — Iziry</p>
              <p className="text-[11px] text-slate-400">{factFiltered.length} factures sur la période</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                    <th className="px-4 py-2.5 text-left font-bold">Numéro</th>
                    <th className="px-3 py-2.5 text-left font-bold">Client</th>
                    <th className="px-3 py-2.5 text-center font-bold">Statut</th>
                    <th className="px-3 py-2.5 text-right font-bold">Montant HT</th>
                    <th className="px-3 py-2.5 text-right font-bold">Timbre</th>
                    <th className="px-3 py-2.5 text-right font-bold">Montant TTC</th>
                    <th className="px-3 py-2.5 text-left font-bold">Date facture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {factFiltered.slice(0, 100).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-slate-700 text-[11px]">{r.numero}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">{clientMap[r.client_id] ?? r.client_id.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-center">{statBadge(r.statut)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">{fmt(r.montant_ht, 2)}</td>
                      <td className="px-3 py-2 text-right font-mono text-slate-400">{fmt(r.droits_timbre, 2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{fmt(r.montant_ttc, 2)}</td>
                      <td className="px-3 py-2 text-slate-400">{fmtDate(r.date_facture)}</td>
                    </tr>
                  ))}
                  {factFiltered.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucune facture sur cette période.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {factFiltered.length > 100 && <p className="text-center text-xs text-slate-400 py-2">Affichage des 100 premiers sur {factFiltered.length}</p>}
          </div>
        </div>
      )}

      {/* ── Articles Iziry vs FreshLink ──────────────────────────────────── */}
      {subTab === "articles" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-slate-800">Catalogue Iziry vs FreshLink</p>
              <p className="text-[11px] text-slate-400">{artComp.length} articles · Vert = article matchée dans FreshLink · Gris = non trouvé</p>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-600 font-bold">{artComp.filter(a => a.nomFl).length} matchés</span>
              <span className="text-slate-400">{artComp.filter(a => !a.nomFl).length} non matchés</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wide">
                  <th className="px-4 py-2.5 text-left font-bold">Réf Iziry</th>
                  <th className="px-3 py-2.5 text-left font-bold">Article Iziry</th>
                  <th className="px-3 py-2.5 text-left font-bold">Famille</th>
                  <th className="px-3 py-2.5 text-left font-bold">Unité</th>
                  <th className="px-3 py-2.5 text-center font-bold">Actif</th>
                  <th className="px-3 py-2.5 text-left font-bold">Article FreshLink</th>
                  <th className="px-3 py-2.5 text-right font-bold">Notre PA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {artComp.slice(0, 150).map((a, i) => (
                  <tr key={i} className={`hover:bg-slate-50 ${a.nomFl ? "" : "opacity-70"}`}>
                    <td className="px-4 py-2 font-mono text-slate-500 text-[10px]">{a.reference}</td>
                    <td className="px-3 py-2 font-medium text-slate-800 max-w-[180px] truncate" title={a.libelle}>{a.libelle}</td>
                    <td className="px-3 py-2 text-slate-500">{a.famille}</td>
                    <td className="px-3 py-2 text-slate-500">{a.unite}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${a.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                        {a.actif ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">
                      {a.nomFl
                        ? <span className="text-emerald-700 font-semibold">{a.nomFl}</span>
                        : <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">
                      {a.paFl > 0 ? `${fmt(a.paFl, 2)} DH` : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
                {artComp.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun article chargé.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
