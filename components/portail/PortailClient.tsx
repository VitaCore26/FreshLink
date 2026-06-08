"use client"

import { useState, useEffect, useCallback } from "react"
import { store, type User, type Commande, type Article, type Client, type LigneCommande, DELAI_RECOUVREMENT_LABELS } from "@/lib/store"
import { upsertCommande } from "@/lib/supabase/db"
import FreshLinkLogo from "@/components/ui/FreshLinkLogo"

// Returns tomorrow's date as YYYY-MM-DD (J+1 default)
function getJ1(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}

interface Props { user: User; onLogout: () => void }

// ── API response shapes ───────────────────────────────────────────────────────
interface WalletTx { id: string; date?: string; type?: string; montant?: number; soldeApres?: number; motif?: string }
interface Invoice { id: string; date?: string; numero?: string; montantTTC?: number; montant?: number; statut?: string; echeance?: string }
interface Promo { id: string; titre?: string; nom?: string; description?: string; valeur?: number; type?: string; dateFin?: string }
interface DashboardData {
  client: Client
  wallet: { balance: number; recentTx: WalletTx[] }
  promotions: Promo[]
  contrat: Record<string, unknown> | null
  organisation: Record<string, unknown> | null
  invoices: Invoice[]
  referrals: { total: number; converted: number }
}
interface OrderTracking { statut?: string; chauffeur?: string; eta?: string; gpsLat?: number; gpsLng?: number; position?: string }
interface PortalOrder {
  id: string
  date?: string
  statut: string
  montantTotal: number
  nbArticles: number
  source?: string
  lignes: LigneCommande[]
  adresseLivraison?: string | null
  notesClient?: string | null
  tracking?: OrderTracking | null
}

const STATUT_CONFIG: Record<string, { label: string; labelAr: string; cls: string }> = {
  en_attente:            { label: "En attente",      labelAr: "في الانتظار",    cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  en_attente_approbation:{ label: "En approbation",  labelAr: "بانتظار الموافقة", cls: "bg-orange-100 text-orange-800 border-orange-200" },
  valide:                { label: "Validee",         labelAr: "مقبولة",         cls: "bg-blue-100 text-blue-800 border-blue-200" },
  refuse:                { label: "Refusee",         labelAr: "مرفوضة",         cls: "bg-red-100 text-red-800 border-red-200" },
  en_transit:            { label: "En livraison",    labelAr: "قيد التوصيل",    cls: "bg-cyan-100 text-cyan-800 border-cyan-200" },
  livre:                 { label: "Livree",          labelAr: "تم التسليم",      cls: "bg-green-100 text-green-800 border-green-200" },
  retour:                { label: "Retour",          labelAr: "مرتجع",          cls: "bg-rose-100 text-rose-800 border-rose-200" },
}

const INVOICE_STATUT: Record<string, { label: string; cls: string }> = {
  payee:     { label: "Payée",      cls: "bg-green-100 text-green-800 border-green-200" },
  paye:      { label: "Payée",      cls: "bg-green-100 text-green-800 border-green-200" },
  impayee:   { label: "Impayée",    cls: "bg-red-100 text-red-800 border-red-200" },
  partielle: { label: "Partielle",  cls: "bg-amber-100 text-amber-800 border-amber-200" },
  en_attente:{ label: "En attente", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" },
}

// Famille icons map
const FAMILLE_ICON: Record<string, string> = {
  "Légumes fruits": "🍅", "Légumes racines": "🥕", "Légumes feuilles": "🥦",
  "Herbes aromatiques": "🌿", "Agrumes": "🍊", "Fruits tropicaux": "🍌",
  "Fruits rouges": "🍓", "Fruits secs": "🌰",
}

type Tab = "dashboard" | "commandes" | "commande" | "catalogue" | "factures" | "wallet" | "parrainage"

const TABS: { id: Tab; label: string; labelAr: string }[] = [
  { id: "dashboard",  label: "Tableau de bord", labelAr: "لوحة القيادة" },
  { id: "commandes",  label: "Mes commandes",   labelAr: "طلبياتي" },
  { id: "commande",   label: "Passer commande", labelAr: "طلب جديد" },
  { id: "catalogue",  label: "Catalogue",       labelAr: "الكتالوج" },
  { id: "factures",   label: "Factures",        labelAr: "الفواتير" },
  { id: "wallet",     label: "Wallet",          labelAr: "المحفظة" },
  { id: "parrainage", label: "Parrainage",      labelAr: "الإحالة" },
]

interface LigneForm {
  articleId: string
  quantite: string
}

const money = (n: number) => `${(n ?? 0).toLocaleString("fr-MA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`

export default function PortailClient({ user, onLogout }: Props) {
  const [tab, setTab] = useState<Tab>("dashboard")
  const [loading, setLoading] = useState(true)
  const [dataError, setDataError] = useState("")

  const [orders, setOrders] = useState<PortalOrder[]>([])
  const [articles, setArticles] = useState<Article[]>([])
  const [client, setClient] = useState<Client | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filterStatut, setFilterStatut] = useState("tous")
  const [search, setSearch] = useState("")

  // --- New order form state ---
  const [lignes, setLignes] = useState<LigneForm[]>([{ articleId: "", quantite: "" }])
  const [dateLivraison, setDateLivraison] = useState(getJ1())
  const [heureLivraison, setHeureLivraison] = useState("08:00")
  const [notes, setNotes] = useState("")
  const [articleSearch, setArticleSearch] = useState("")
  const [familleFilter, setFamilleFilter] = useState("Toutes")
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const clientId = user.clientId ?? ""

  // ── Data fetching — Supabase-first via service-role portal APIs, localStorage fallback ──
  const refresh = useCallback(async () => {
    setLoading(true)
    setDataError("")

    // 1. Articles (anon-readable table, served through service-role sync-read)
    try {
      const res = await fetch(`/api/sync-read?table=fl_articles`, { cache: "no-store" })
      const json = await res.json()
      if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
        setArticles(json.data.map((r: { id: string; payload: Record<string, unknown> }) => ({ id: r.id, ...(r.payload ?? {}) }) as Article))
      } else {
        setArticles(store.getArticles())
      }
    } catch {
      setArticles(store.getArticles())
    }

    if (!clientId) { setLoading(false); return }

    // 2. Dashboard (client profile, wallet, promos, contrat, invoices, referrals)
    try {
      const res = await fetch(`/api/portal/client/${encodeURIComponent(clientId)}`, { cache: "no-store" })
      if (res.ok) {
        const d: DashboardData = await res.json()
        setDashboard(d)
        setClient(d.client ?? null)
      } else {
        const local = store.getClients().find(c => c.id === clientId) ?? null
        setClient(local)
        if (!local) setDataError("Profil client introuvable.")
      }
    } catch {
      const local = store.getClients().find(c => c.id === clientId) ?? null
      setClient(local)
    }

    // 3. Orders with tracking
    try {
      const res = await fetch(`/api/portal/client/${encodeURIComponent(clientId)}/orders`, { cache: "no-store" })
      if (res.ok) {
        const { orders: o } = await res.json()
        setOrders(Array.isArray(o) ? o : [])
      } else {
        const local = store.getCommandes().filter(c => c.clientId === clientId)
        setOrders(local.map(localToPortalOrder))
      }
    } catch {
      const local = store.getCommandes().filter(c => c.clientId === clientId)
      setOrders(local.map(localToPortalOrder))
    }

    setLoading(false)
  }, [clientId])

  useEffect(() => { refresh() }, [refresh])

  const familles = ["Toutes", ...Array.from(new Set(articles.map(a => a.famille ?? "").filter(Boolean)))]

  // Prix adapté à la catégorie du client connecté
  const clientCategorie: "chr" | "marchand" | "particulier" | undefined =
    client?.categorie ??
    ((client as unknown as { type?: string })?.type === "chr" ? "chr" :
      (client as unknown as { type?: string })?.type === "marchand" ? "marchand" : undefined)
  const artPrix = (art: Article): number => store.computePV(art, clientCategorie)
  const isCHR = clientCategorie === "chr"

  const filteredCatalogue = articles.filter(a => {
    const matchSearch = !articleSearch || a.nom.toLowerCase().includes(articleSearch.toLowerCase()) || (a.nomAr ?? "").includes(articleSearch)
    const matchFamille = familleFilter === "Toutes" || a.famille === familleFilter
    return matchSearch && matchFamille
  })

  const addLigne = () => setLignes(prev => [...prev, { articleId: "", quantite: "" }])
  const removeLigne = (i: number) => setLignes(prev => prev.filter((_, j) => j !== i))
  const setLigne = (i: number, patch: Partial<LigneForm>) =>
    setLignes(prev => prev.map((l, j) => j === i ? { ...l, ...patch } : l))

  // Quick add from catalogue card
  const quickAdd = (artId: string) => {
    const existing = lignes.findIndex(l => l.articleId === artId)
    if (existing >= 0) { setTab("commande"); return }
    setLignes(prev => {
      const emptyIdx = prev.findIndex(l => !l.articleId)
      if (emptyIdx >= 0) {
        const n = [...prev]; n[emptyIdx] = { articleId: artId, quantite: "1" }; return n
      }
      return [...prev, { articleId: artId, quantite: "1" }]
    })
    setTab("commande")
  }

  const handleSubmit = async () => {
    setSubmitError("")
    if (!client) { setSubmitError("Compte client non configure. Contactez votre commercial."); return }
    const validLignes = lignes.filter(l => l.articleId && Number(l.quantite) > 0)
    if (validLignes.length === 0) { setSubmitError("Ajoutez au moins un article avec une quantite."); return }

    const cmdLignes: LigneCommande[] = validLignes.map(l => {
      const art = articles.find(a => a.id === l.articleId)!
      const pv = artPrix(art)
      const qty = Number(l.quantite)
      return {
        articleId: art.id,
        articleNom: art.nom,
        unite: art.unite,
        quantite: qty,
        prixUnitaire: pv,
        prixVente: pv,
        total: pv * qty,
      } as LigneCommande
    })

    const cmd: Commande = {
      id: store.genId(),
      date: store.today(),
      commercialId: "portail",
      commercialNom: "Portail Client",
      clientId: client.id,
      clientNom: client.nom,
      secteur: client.secteur,
      zone: client.zone,
      gpsLat: 0, gpsLng: 0,
      lignes: cmdLignes,
      heurelivraison: `${dateLivraison} ${heureLivraison}`,
      statut: "en_attente",
      emailDestinataire: user.email,
      notes: notes || undefined,
    }

    setSubmitting(true)
    try {
      // Canonical write path: persists locally AND posts to /api/sync-write (service role)
      await upsertCommande(cmd)
      setLignes([{ articleId: "", quantite: "" }])
      setNotes("")
      setDateLivraison(getJ1())
      setHeureLivraison("08:00")
      setSubmitSuccess(true)
      setTimeout(() => { setSubmitSuccess(false); setTab("commandes"); refresh() }, 2000)
    } catch {
      setSubmitError("Erreur lors de l'envoi. Verifiez votre connexion et reessayez.")
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = orders.filter(c => {
    if (filterStatut !== "tous" && c.statut !== filterStatut) return false
    if (search) {
      const s = search.toLowerCase()
      return c.id.toLowerCase().includes(s) ||
        (c.lignes ?? []).some(l => (l.articleNom ?? "").toLowerCase().includes(s))
    }
    return true
  })

  const livrees = orders.filter(c => c.statut === "livre").length
  const enCours = orders.filter(c => ["en_attente", "valide", "en_transit"].includes(c.statut)).length

  const walletBalance = dashboard?.wallet.balance ?? 0
  const loyaltyPoints = (dashboard?.client as unknown as { loyaltyPoints?: number })?.loyaltyPoints ?? 0
  const invoices = dashboard?.invoices ?? []
  const impayees = invoices.filter(i => i.statut && !["payee", "paye"].includes(i.statut))
  const promotions = dashboard?.promotions ?? []

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      {/* Header */}
      <header className="bg-sidebar text-sidebar-foreground px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-3">
          <FreshLinkLogo size={34} variant="full-white" />
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white">{client?.nom ?? user.name}</p>
            <p className="text-[10px] text-sidebar-foreground/60">Portail Client / بوابة الزبون</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(client?.nom ?? user.name ?? "?")[0]}
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sidebar-border text-xs text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Deconnexion</span>
          </button>
        </div>
      </header>

      {/* Tab bar — horizontally scrollable on mobile */}
      <nav className="bg-card border-b border-border sticky top-[56px] z-30 overflow-x-auto">
        <div className="max-w-5xl mx-auto flex gap-1 px-2">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`shrink-0 px-3.5 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 flex flex-col gap-5">

        {loading && (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <svg className="w-6 h-6 animate-spin mr-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
            Chargement de votre espace…
          </div>
        )}

        {!loading && dataError && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {dataError}
          </div>
        )}

        {!loading && (
        <>
        {/* ═══════════════ DASHBOARD ═══════════════ */}
        {tab === "dashboard" && (
          <div className="flex flex-col gap-5">
            {/* Welcome + client card */}
            {client && (
              <div className="rounded-2xl border border-border bg-card p-4 flex flex-col sm:flex-row gap-4 items-start">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-foreground text-base">{client.nom}</h2>
                  <p className="text-sm text-muted-foreground">{[client.secteur, client.zone].filter(Boolean).join(" — ")}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {client.telephone && <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">{client.telephone}</span>}
                    {client.type && <span className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium capitalize">{client.type}</span>}
                    {client.adresse && <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">{client.adresse}</span>}
                  </div>
                  {client.creditAutorise !== undefined && (
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                      {client.creditAutorise ? (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 font-semibold border border-green-200">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          Credit autorise
                        </span>
                      ) : client.creditStatut === "attente_validation" ? (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-orange-100 text-orange-800 font-semibold border border-orange-200">
                          Credit en attente de validation
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-semibold border border-red-200">
                          Credit non autorise
                        </span>
                      )}
                      {client.delaiRecouvrement && (
                        <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">
                          Recouvrement : {DELAI_RECOUVREMENT_LABELS[client.delaiRecouvrement]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* KPI grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Solde Wallet" labelAr="رصيد المحفظة" value={money(walletBalance)} accent="text-primary"
                icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2m-6-4h6a2 2 0 012 2v0a2 2 0 01-2 2h-6a2 2 0 01-2-2v0a2 2 0 012-2z" />
              <KpiCard label="Commandes" labelAr="الطلبيات" value={String(orders.length)} accent="text-blue-600"
                icon="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              <KpiCard label="En cours" labelAr="قيد المعالجة" value={String(enCours)} accent="text-cyan-600"
                icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              <KpiCard label="Points fidélité" labelAr="نقاط الولاء" value={String(loyaltyPoints)} accent="text-amber-600"
                icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </div>

            {/* Two-column: invoices to pay + active promos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Unpaid invoices */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground text-sm">Factures à régler</h3>
                  <button onClick={() => setTab("factures")} className="text-xs font-semibold text-primary hover:underline">Voir tout</button>
                </div>
                {impayees.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune facture en attente 🎉</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {impayees.slice(0, 4).map(inv => (
                      <div key={inv.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
                        <div>
                          <p className="font-semibold text-foreground">{inv.numero ?? inv.id.slice(0, 10)}</p>
                          <p className="text-xs text-muted-foreground">{inv.date ?? ""}</p>
                        </div>
                        <span className="font-bold text-red-600">{money(inv.montantTTC ?? inv.montant ?? 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active promotions */}
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-foreground text-sm">Promotions actives</h3>
                </div>
                {promotions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune promotion en cours</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {promotions.slice(0, 4).map(p => (
                      <div key={p.id} className="flex items-center gap-3 text-sm rounded-xl bg-primary/5 border border-primary/15 px-3 py-2">
                        <span className="text-lg">🎁</span>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{p.titre ?? p.nom ?? "Promotion"}</p>
                          {p.description && <p className="text-xs text-muted-foreground truncate">{p.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CTA */}
            <button onClick={() => setTab("commande")}
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-opacity shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Passer une nouvelle commande / طلب جديد
            </button>
          </div>
        )}

        {/* ═══════════════ COMMANDES ═══════════════ */}
        {tab === "commandes" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
                className="flex-1 min-w-[180px] px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none">
                <option value="tous">Tous statuts</option>
                {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="font-semibold">Aucune commande</p>
                <p className="text-sm">لا توجد طلبيات</p>
              </div>
            ) : filtered.map(cmd => {
              const cfg = STATUT_CONFIG[cmd.statut] ?? STATUT_CONFIG.en_attente
              const isExpanded = expandedId === cmd.id
              const total = orderTotal(cmd)
              return (
                <div key={cmd.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button onClick={() => setExpandedId(isExpanded ? null : cmd.id)}
                    className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-muted/40 transition-colors">
                    <div className={`w-2 h-10 rounded-full shrink-0 ${
                      cmd.statut === "livre" ? "bg-green-500" :
                      cmd.statut === "en_transit" ? "bg-cyan-500" :
                      cmd.statut === "valide" ? "bg-blue-500" :
                      cmd.statut === "refuse" ? "bg-red-400" : "bg-yellow-400"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm font-mono">{cmd.id.slice(0, 12)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}`}>{cfg.label} / {cfg.labelAr}</span>
                        {cmd.tracking && cmd.statut === "en_transit" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 animate-pulse">📍 Suivi live</span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        <span>{cmd.date}</span>
                        <span>{(cmd.lignes?.length ?? cmd.nbArticles ?? 0)} article{(cmd.lignes?.length ?? cmd.nbArticles ?? 0) > 1 ? "s" : ""}</span>
                        <span className="font-semibold text-foreground">{money(total)}</span>
                      </div>
                    </div>
                    <svg className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 flex flex-col gap-3 bg-muted/20">
                      {/* Tracking banner */}
                      {cmd.tracking && (
                        <div className="px-3 py-2.5 rounded-xl bg-cyan-50 border border-cyan-200 text-sm text-cyan-900 flex items-center gap-2">
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          <span>
                            {cmd.tracking.chauffeur && <><span className="font-semibold">Chauffeur :</span> {cmd.tracking.chauffeur}. </>}
                            {cmd.tracking.eta && <><span className="font-semibold">ETA :</span> {cmd.tracking.eta}. </>}
                            {cmd.tracking.position && <span>{cmd.tracking.position}</span>}
                          </span>
                        </div>
                      )}

                      {(cmd.lignes?.length ?? 0) > 0 && (
                        <div className="rounded-xl border border-border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Article</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Qte</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">PV</th>
                                <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {cmd.lignes.map((l, i) => (
                                <tr key={i} className="border-t border-border">
                                  <td className="px-3 py-2 font-medium">{l.articleNom}</td>
                                  <td className="px-3 py-2 text-right">{l.quantite} {l.unite || ""}</td>
                                  <td className="px-3 py-2 text-right">{money(l.prixVente ?? l.prixUnitaire ?? 0)}</td>
                                  <td className="px-3 py-2 text-right font-bold text-primary">{money((l.prixVente ?? l.prixUnitaire ?? 0) * l.quantite)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-primary/30 bg-primary/5">
                                <td colSpan={3} className="px-3 py-2 text-right font-bold text-sm">Total commande</td>
                                <td className="px-3 py-2 text-right font-black text-primary">{money(total)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {cmd.adresseLivraison && (
                        <div className="px-3 py-2 rounded-xl bg-muted/40 border border-border text-sm text-foreground">
                          <span className="font-semibold">Livraison : </span>{cmd.adresseLivraison}
                        </div>
                      )}
                      {cmd.notesClient && (
                        <div className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                          <span className="font-semibold">Notes: </span>{cmd.notesClient}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ═══════════════ PASSER COMMANDE ═══════════════ */}
        {tab === "commande" && (
          <div className="flex flex-col gap-4">
            {submitSuccess && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-green-50 border border-green-200 text-green-800 font-semibold text-sm">
                <svg className="w-5 h-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Commande envoyee ! Vous serez contacte pour confirmation. / تم ارسال الطلب!
              </div>
            )}
            {submitError && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {submitError}
              </div>
            )}

            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-base">Nouvelle commande / طلبية جديدة</h3>
                  <p className="text-xs text-muted-foreground">{store.today()}</p>
                </div>
                <button onClick={() => setTab("catalogue")}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  Voir catalogue
                </button>
              </div>

              <div className="flex flex-col gap-3">
                {lignes.map((l, i) => {
                  const art = articles.find(a => a.id === l.articleId)
                  const pv = art ? artPrix(art) : 0
                  const lineTotal = pv * Number(l.quantite || 0)
                  return (
                    <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Article {i + 1}</span>
                        {lignes.length > 1 && (
                          <button onClick={() => removeLigne(i)} className="p-1 text-destructive hover:bg-red-50 rounded-lg transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        )}
                      </div>

                      <select value={l.articleId} onChange={e => setLigne(i, { articleId: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="">-- Choisir un produit / اختر منتجا --</option>
                        {articles.filter(a => a.stockDisponible > 0).map(a => (
                          <option key={a.id} value={a.id}>{FAMILLE_ICON[a.famille ?? ""] ?? ""} {a.nom} ({a.nomAr}) — {a.unite}</option>
                        ))}
                      </select>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-foreground">Quantite / الكمية {art ? `(${art.unite})` : ""}</label>
                          <input type="number" min="0.1" step="0.5" placeholder="0" value={l.quantite}
                            onChange={e => setLigne(i, { quantite: e.target.value })}
                            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-foreground">Sous-total</label>
                          <div className={`px-3 py-2.5 rounded-xl border ${lineTotal > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"} text-sm font-bold text-primary`}>
                            {lineTotal > 0 ? money(lineTotal) : "—"}
                          </div>
                        </div>
                      </div>

                      {art && (
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{art.famille}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${art.stockDisponible > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                            {art.stockDisponible > 0 ? `Stock: ${art.stockDisponible} ${art.unite}` : "Rupture"}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                <button onClick={addLigne}
                  className="flex items-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-primary/40 text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Ajouter un produit / إضافة منتج
                </button>
              </div>

              {/* Date livraison */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  Date de livraison souhaitee
                  <span className="text-[10px] font-normal text-muted-foreground">(par defaut J+1)</span>
                </label>
                <div className="flex gap-2 items-center">
                  <input type="date" value={dateLivraison} min={getJ1()} onChange={e => setDateLivraison(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button type="button" onClick={() => setDateLivraison(getJ1())}
                    className="px-3 py-2 rounded-xl border border-primary text-primary text-xs font-semibold hover:bg-primary/5 transition-colors">J+1</button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Heure de livraison souhaitee / وقت التسليم المطلوب</label>
                  <input type="time" value={heureLivraison} onChange={e => setHeureLivraison(e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                  <div className="flex gap-2 flex-wrap mt-1">
                    {["06:00", "08:00", "10:00", "14:00"].map(h => (
                      <button key={h} type="button" onClick={() => setHeureLivraison(h)}
                        className={`text-[10px] px-2 py-1 rounded-lg border font-semibold transition-colors ${heureLivraison === h ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>{h}</button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">Notes / ملاحظات</label>
                  <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Instructions speciales de livraison..."
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Total estime</p>
                  <p className="text-xl font-black text-primary">
                    {money(lignes.reduce((s, l) => {
                      const art = articles.find(a => a.id === l.articleId)
                      if (!art) return s
                      return s + artPrix(art) * Number(l.quantite || 0)
                    }, 0))}
                  </p>
                </div>
                <button onClick={handleSubmit} disabled={submitting || submitSuccess}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md">
                  {submitting
                    ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                  {submitting ? "Envoi…" : "Envoyer la commande / ارسال الطلب"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════ CATALOGUE ═══════════════ */}
        {tab === "catalogue" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              {familles.map(f => (
                <button key={f} onClick={() => setFamilleFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${familleFilter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  {FAMILLE_ICON[f] ? `${FAMILLE_ICON[f]} ` : ""}{f}
                </button>
              ))}
            </div>

            <input value={articleSearch} onChange={e => setArticleSearch(e.target.value)}
              placeholder="Rechercher un produit / ابحث عن منتج..."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredCatalogue.length === 0 ? (
                <div className="col-span-full text-center py-16 text-muted-foreground">
                  <p className="font-semibold">Aucun article</p>
                  <p className="text-sm">لا توجد منتجات</p>
                </div>
              ) : filteredCatalogue.map(art => {
                const inOrder = lignes.some(l => l.articleId === art.id)
                return (
                  <div key={art.id} className={`rounded-2xl border bg-card p-3 flex flex-col gap-2 transition-all ${inOrder ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="font-bold text-foreground text-sm leading-tight">{art.nom}</p>
                        {art.nomAr && <p className="font-arabic text-[12px] text-muted-foreground" dir="rtl" lang="ar">{art.nomAr}</p>}
                      </div>
                      <span className="text-lg shrink-0">{FAMILLE_ICON[art.famille ?? ""] ?? ""}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-xs">
                      <span className="text-muted-foreground">{art.unite}</span>
                      <span className={`font-semibold ${art.stockDisponible > 0 ? "text-green-700" : "text-destructive"}`}>
                        {art.stockDisponible > 0 ? "Disponible" : "Rupture"}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="font-black text-primary text-sm">{money(artPrix(art))}</span>
                        <span className="text-[10px] text-muted-foreground">/{art.unite}</span>
                        {isCHR && art.prixCHR && art.prixCHR > 0 && (
                          <span className="text-[8px] font-black bg-purple-100 text-purple-700 border border-purple-200 px-1 py-0.5 rounded-full">CHR</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => quickAdd(art.id)} disabled={art.stockDisponible === 0}
                      className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${inOrder ? "bg-primary/10 text-primary border border-primary" : art.stockDisponible > 0 ? "bg-primary text-primary-foreground hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"}`}>
                      {inOrder ? "Dans la commande" : art.stockDisponible > 0 ? "+ Ajouter" : "Indisponible"}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══════════════ FACTURES ═══════════════ */}
        {tab === "factures" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Total factures" labelAr="مجموع الفواتير" value={String(invoices.length)} accent="text-foreground"
                icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              <KpiCard label="Impayées" labelAr="غير مدفوعة" value={String(impayees.length)} accent="text-red-600"
                icon="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <KpiCard label="Montant dû" labelAr="المبلغ المستحق" value={money(impayees.reduce((s, i) => s + (i.montantTTC ?? i.montant ?? 0), 0))} accent="text-amber-600"
                icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </div>

            {invoices.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="font-semibold">Aucune facture</p>
                <p className="text-sm">لا توجد فواتير</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">N° / Date</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Montant</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => {
                      const cfg = INVOICE_STATUT[inv.statut ?? ""] ?? { label: inv.statut ?? "—", cls: "bg-muted text-muted-foreground border-border" }
                      return (
                        <tr key={inv.id} className="border-t border-border">
                          <td className="px-4 py-3">
                            <p className="font-semibold text-foreground">{inv.numero ?? inv.id.slice(0, 12)}</p>
                            <p className="text-xs text-muted-foreground">{inv.date ?? ""}{inv.echeance ? ` · échéance ${inv.echeance}` : ""}</p>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-foreground">{money(inv.montantTTC ?? inv.montant ?? 0)}</td>
                          <td className="px-4 py-3 text-right"><span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${cfg.cls}`}>{cfg.label}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ WALLET ═══════════════ */}
        {tab === "wallet" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex flex-col items-center text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Solde disponible / الرصيد المتاح</p>
              <p className="text-4xl font-black text-primary mt-2">{money(walletBalance)}</p>
              {loyaltyPoints > 0 && (
                <p className="text-sm text-amber-600 font-semibold mt-2">⭐ {loyaltyPoints} points de fidélité</p>
              )}
            </div>

            <h3 className="font-bold text-foreground text-sm">Historique des transactions / سجل المعاملات</h3>
            {(dashboard?.wallet.recentTx ?? []).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="font-semibold">Aucune transaction</p>
                <p className="text-sm">لا توجد معاملات</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
                {(dashboard?.wallet.recentTx ?? []).map(tx => {
                  const credit = (tx.montant ?? 0) >= 0
                  return (
                    <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${credit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={credit ? "M12 4v16m8-8H4" : "M20 12H4"} /></svg>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{tx.motif ?? tx.type ?? "Transaction"}</p>
                          <p className="text-xs text-muted-foreground">{tx.date ?? ""}</p>
                        </div>
                      </div>
                      <span className={`font-bold text-sm ${credit ? "text-green-600" : "text-red-600"}`}>{credit ? "+" : ""}{money(tx.montant ?? 0)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ PARRAINAGE ═══════════════ */}
        {tab === "parrainage" && (
          <ParrainageTab clientId={clientId} referrals={dashboard?.referrals ?? { total: 0, converted: 0 }} />
        )}
        </>
        )}
      </main>

      <footer className="border-t border-border bg-card px-4 py-3 flex items-center justify-center">
        <p className="text-[11px] text-muted-foreground text-center">
          &copy; 2026 <span className="font-semibold text-foreground">Vita Fresh</span> — By{" "}
          <span className="font-bold text-primary">VitaCore Group</span>
          {" "}&mdash; Tous droits reserves / جميع الحقوق محفوظة
        </p>
      </footer>
    </div>
  )
}

// ── Helper components ──────────────────────────────────────────────────────────

function KpiCard({ label, labelAr, value, accent, icon }: { label: string; labelAr: string; value: string; accent: string; icon: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <svg className={`w-4 h-4 ${accent} opacity-60`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} /></svg>
      </div>
      <p className={`text-xl font-black ${accent}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground/60">{labelAr}</p>
    </div>
  )
}

function ParrainageTab({ clientId, referrals }: { clientId: string; referrals: { total: number; converted: number } }) {
  const code = `VITA-${(clientId || "000000").slice(-6).toUpperCase()}`
  const shareUrl = `https://shop.vita-core.org/?parrain=${encodeURIComponent(code)}`
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6 flex flex-col items-center text-center gap-3">
        <span className="text-3xl">🤝</span>
        <div>
          <h3 className="font-black text-foreground text-lg">Parrainez & gagnez</h3>
          <p className="text-sm text-muted-foreground mt-1">Invitez un commerce, vous gagnez tous les deux des récompenses.</p>
          <p className="text-xs text-muted-foreground/70" dir="rtl">ادعُ تاجراً واربحا معاً مكافآت</p>
        </div>
        <div className="w-full max-w-sm flex flex-col gap-2 mt-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Votre code parrain</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-3 rounded-xl bg-card border border-border font-mono font-bold text-primary text-center">{code}</code>
            <button onClick={copy}
              className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
              {copied ? "Copié ✓" : "Copier le lien"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="Filleuls invités" labelAr="المدعوون" value={String(referrals.total)} accent="text-blue-600"
          icon="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
        <KpiCard label="Convertis" labelAr="تم تحويلهم" value={String(referrals.converted)} accent="text-primary"
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground mb-1">Comment ça marche ?</p>
        <ol className="list-decimal list-inside flex flex-col gap-1">
          <li>Partagez votre lien parrain avec un commerce.</li>
          <li>Il crée son compte et passe sa première commande.</li>
          <li>Vous recevez tous les deux une récompense créditée sur votre Wallet.</li>
        </ol>
      </div>
    </div>
  )
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

function orderTotal(o: PortalOrder): number {
  if (Array.isArray(o.lignes) && o.lignes.length > 0) {
    const sum = o.lignes.reduce((s, l) => s + (l.prixVente ?? l.prixUnitaire ?? 0) * (l.quantite ?? 0), 0)
    if (sum > 0) return sum
  }
  return o.montantTotal ?? 0
}

function localToPortalOrder(c: Commande): PortalOrder {
  return {
    id: c.id,
    date: c.date,
    statut: c.statut,
    montantTotal: c.lignes.reduce((s, l) => s + (l.prixVente ?? 0) * l.quantite, 0),
    nbArticles: c.lignes.length,
    source: "erp",
    lignes: c.lignes,
    adresseLivraison: null,
    notesClient: c.notes ?? null,
    tracking: null,
  }
}
