"use client"

import { useState, useEffect, useRef } from "react"
import { store, type User, type UserRole, type UserAccessType, ROLE_LABELS, ROLE_COLORS } from "@/lib/store"
import { sendEmail } from "@/lib/email"

function generatePassword(len = 10): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#"
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

const ALL_ROLES: UserRole[] = [
  "super_admin","admin","resp_commercial","team_leader",
  "cash_man","financier",
  "rh_manager","comptable",
  "prevendeur","resp_logistique","magasinier","dispatcheur","livreur",
  "acheteur","ctrl_achat","ctrl_prep",
  "client","fournisseur"
]

// Roles grouped by default interface
const ROLE_GROUPS: { label: string; labelAr: string; roles: UserRole[] }[] = [
  {
    label: "Direction / Back-office",
    labelAr: "الإدارة والمكتب",
    roles: ["super_admin", "admin", "resp_commercial", "team_leader"],
  },
  {
    label: "Finance & Caisse",
    labelAr: "المالية والصندوق",
    roles: ["financier", "cash_man"],
  },
  {
    label: "RH & Comptabilite",
    labelAr: "الموارد البشرية والمحاسبة",
    roles: ["rh_manager", "comptable"],
  },
  {
    label: "Mobile — Terrain",
    labelAr: "الميدان",
    roles: ["prevendeur", "resp_logistique", "magasinier", "dispatcheur", "livreur"],
  },
  {
    label: "Achat & Controle",
    labelAr: "الشراء والمراقبة",
    roles: ["acheteur", "ctrl_achat", "ctrl_prep"],
  },
  {
    label: "Externe",
    labelAr: "خارجي",
    roles: ["client", "fournisseur"],
  },
]

const PERM_LABELS: { key: keyof User; label: string; labelAr: string }[] = [
  { key: "canViewAchat", label: "Achats", labelAr: "المشتريات" },
  { key: "canViewCommercial", label: "Commercial", labelAr: "التجاري" },
  { key: "canViewLogistique", label: "Logistique", labelAr: "اللوجستيك" },
  { key: "canViewStock", label: "Stock", labelAr: "المخزون" },
  { key: "canViewCash", label: "Cash & BL", labelAr: "الكاش" },
  { key: "canViewFinance", label: "Finance", labelAr: "المالية" },
  { key: "canViewRecap", label: "Récap", labelAr: "الملخص" },
  { key: "canViewDatabase", label: "Admin / Base données", labelAr: "قاعدة البيانات" },
  { key: "canViewRH", label: "RH & Comptabilité RH", labelAr: "الموارد البشرية" },
  { key: "canViewExternal", label: "Clients & Fournisseurs", labelAr: "الزبائن والموردون" },
  { key: "canCreateCommandeBO", label: "Créer commandes (BO)", labelAr: "إنشاء الطلبيات" },
]

// Section groups for permission UI — maps each nav section to its permKey
interface PermSection {
  group: string
  groupAr: string
  color: string
  pages: { label: string; labelAr: string; permKey: keyof User }[]
}

// ── MOBILE sections (what the user can see on the mobile app) ─────────────────
const MOBILE_PERM_SECTIONS: PermSection[] = [
  {
    group: "Commandes & Ventes (Mobile)", groupAr: "الطلبيات والمبيعات",
    color: "emerald",
    pages: [
      { label: "Prise de commande (prevendeur)", labelAr: "الطلبيات", permKey: "canViewCommercial" },
      { label: "Bilan & Objectifs prevendeur",   labelAr: "الأهداف",   permKey: "canViewCommercial" },
    ],
  },
  {
    group: "Achat terrain (Mobile)", groupAr: "الشراء الميداني",
    color: "amber",
    pages: [
      { label: "Bons d'achat (acheteur)",        labelAr: "وصولات الشراء", permKey: "canViewAchat" },
      { label: "Controle achat",                 labelAr: "مراقبة الشراء", permKey: "canViewAchat" },
    ],
  },
  {
    group: "Magasinier & Reception (Mobile)", groupAr: "المستودع والاستلام",
    color: "cyan",
    pages: [
      { label: "Reception marchandise",          labelAr: "الاستلام الميداني", permKey: "canViewAchat" },
      { label: "Validation BL (magasinier)",     labelAr: "التحقق من وصل التسليم", permKey: "canViewLogistique" },
      { label: "Preparation commandes",          labelAr: "تحضير الطلبيات",   permKey: "canViewLogistique" },
      { label: "Controle preparation",           labelAr: "مراقبة التحضير",   permKey: "canViewLogistique" },
    ],
  },
  {
    group: "Livraison terrain (Mobile)", groupAr: "التوصيل الميداني",
    color: "violet",
    pages: [
      { label: "Bons de livraison (livreur)",    labelAr: "وصولات التوصيل",  permKey: "canViewLogistique" },
      { label: "Retours clients",                labelAr: "المرتجعات",        permKey: "canViewLogistique" },
    ],
  },
]

// ── BACK-OFFICE sections (what the user can see in the BO) ────────────────────
const BACKOFFICE_PERM_SECTIONS: PermSection[] = [
  {
    group: "Analyse & KPI", groupAr: "التحليل",
    color: "indigo",
    pages: [
      { label: "Synthese & Recap",               labelAr: "الملخص",            permKey: "canViewRecap" },
      { label: "Finance & Caisse",               labelAr: "المالية",           permKey: "canViewFinance" },
      { label: "Rapport Livraison",              labelAr: "تقرير التوصيل",     permKey: "canViewLogistique" },
    ],
  },
  {
    group: "Achat Back-office", groupAr: "المشتريات",
    color: "amber",
    pages: [
      { label: "Bons d'achat",                   labelAr: "وصولات الشراء",     permKey: "canViewAchat" },
      { label: "Commandes Fournisseurs (PO)",     labelAr: "أوامر الشراء",     permKey: "canViewAchat" },
      { label: "Reception Achat BO",             labelAr: "الاستلام",          permKey: "canViewAchat" },
      { label: "Credit Fournisseur",             labelAr: "ائتمان الموردين",   permKey: "canViewAchat" },
      { label: "Analyse Achat",                  labelAr: "تحليل المشتريات",   permKey: "canViewAchat" },
    ],
  },
  {
    group: "Commercial Back-office", groupAr: "التجاري",
    color: "emerald",
    pages: [
      { label: "Commandes (BO)",                 labelAr: "الطلبيات",          permKey: "canViewCommercial" },
      { label: "Affectation Commerciale",        labelAr: "التوزيع التجاري",   permKey: "canViewCommercial" },
      { label: "Cash & BL",                      labelAr: "النقديات",          permKey: "canViewCash" },
      { label: "Prospection IA",                 labelAr: "الاستهداف الذكي",   permKey: "canViewCommercial" },
      { label: "Creer commandes (BO)",           labelAr: "إنشاء الطلبيات",    permKey: "canCreateCommandeBO" },
    ],
  },
  {
    group: "Logistique Back-office", groupAr: "اللوجستيك",
    color: "cyan",
    pages: [
      { label: "Stock & Inventaire",             labelAr: "المخزون",           permKey: "canViewStock" },
      { label: "Dispatch & Livreurs",            labelAr: "التوزيع",           permKey: "canViewLogistique" },
      { label: "Preparation (BO)",               labelAr: "وصولات التحضير",    permKey: "canViewLogistique" },
      { label: "Retours",                        labelAr: "المرتجعات",         permKey: "canViewLogistique" },
    ],
  },
  {
    group: "Donnees", groupAr: "البيانات",
    color: "violet",
    pages: [
      { label: "Catalogue Produits",             labelAr: "الفواكه والخضر",    permKey: "canViewStock" },
      { label: "Clients & Fournisseurs",         labelAr: "الزبائن والموردون", permKey: "canViewExternal" },
    ],
  },
  {
    group: "RH & Comptabilite", groupAr: "الموارد البشرية",
    color: "violet",
    pages: [
      { label: "Productivite & Salaires (Ourai)", labelAr: "الإنتاجية والرواتب", permKey: "canViewRH" },
      { label: "Comptabilite RH (Azmi)",           labelAr: "محاسبة الموارد",    permKey: "canViewRH" },
    ],
  },
  {
    group: "Administration", groupAr: "الإدارة",
    color: "rose",
    pages: [
      { label: "Utilisateurs & Roles",           labelAr: "المستخدمون",        permKey: "canViewDatabase" },
      { label: "Droits Camera",                  labelAr: "صلاحيات الكاميرا", permKey: "canViewDatabase" },
      { label: "Base de donnees & Parametres",   labelAr: "قاعدة البيانات",    permKey: "canViewDatabase" },
    ],
  },
]

// Combined for "all" view and legacy
const PERM_SECTIONS: PermSection[] = [...MOBILE_PERM_SECTIONS, ...BACKOFFICE_PERM_SECTIONS]

const EMPTY_USER: Omit<User, "id"> = {
  name: "", email: "", password: "1234", role: "prevendeur", accessType: undefined, secteur: "", depotId: undefined,
  phone: "", actif: true,
  canViewAchat: false, canViewCommercial: false, canViewLogistique: false,
  canViewStock: false, canViewCash: false, canViewFinance: false, canViewRecap: false,
  canViewDatabase: false, canViewRH: false, canViewExternal: false, canCreateCommandeBO: false,
  objectifClients: 0, objectifTonnage: 0,
  objectifJournalierCA: 0, objectifHebdomadaireCA: 0, objectifMensuelCA: 0,
  objectifJournalierClients: 0, objectifHebdomadaireClients: 0, objectifMensuelClients: 0,
}

// ─────────────────────────────────────────────────────────────
// PermissionsTabs — Mobile / Back-office separated permissions UI
// ─────────────────────────────────────────────────────────────

type PermTab = "mobile" | "backoffice"

function PermissionsTabs({
  form,
  setForm,
}: {
  form: Omit<User, "id">
  setForm: React.Dispatch<React.SetStateAction<Omit<User, "id">>>
}) {
  const [permTab, setPermTab] = useState<PermTab>("mobile")

  const activeSections = permTab === "mobile" ? MOBILE_PERM_SECTIONS : BACKOFFICE_PERM_SECTIONS

  const colorMap: Record<string, string> = {
    indigo: "bg-indigo-600", amber: "bg-amber-500", emerald: "bg-emerald-600",
    cyan: "bg-cyan-600", violet: "bg-violet-600", rose: "bg-rose-600",
  }
  const lightMap: Record<string, string> = {
    indigo: "bg-indigo-50 border-indigo-200", amber: "bg-amber-50 border-amber-200",
    emerald: "bg-emerald-50 border-emerald-200", cyan: "bg-cyan-50 border-cyan-200",
    violet: "bg-violet-50 border-violet-200", rose: "bg-rose-50 border-rose-200",
  }
  const textMap: Record<string, string> = {
    indigo: "text-indigo-700", amber: "text-amber-700", emerald: "text-emerald-700",
    cyan: "text-cyan-700", violet: "text-violet-700", rose: "text-rose-700",
  }

  const handleToggleAll = (on: boolean) => {
    const update: Partial<Omit<User, "id">> = {}
    PERM_LABELS.forEach(p => { update[p.key] = on as never })
    setForm(prev => ({ ...prev, ...update }))
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Droits d&apos;acces / الصلاحيات</h4>
          <p className="text-[10px] text-muted-foreground mt-0.5">Separees par interface — Mobile et Back-office</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => handleToggleAll(true)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
            Tout activer
          </button>
          <button type="button" onClick={() => handleToggleAll(false)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
            Tout desactiver
          </button>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        <button type="button" onClick={() => setPermTab("mobile")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${permTab === "mobile" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Droits Mobile
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">App terrain</span>
        </button>
        <button type="button" onClick={() => setPermTab("backoffice")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${permTab === "backoffice" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Droits Back-office
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Gestion BO</span>
        </button>
      </div>

      {/* Context note */}
      <div className={`flex items-start gap-2 px-3 py-2 rounded-xl text-xs border ${permTab === "mobile" ? "bg-green-50 border-green-200 text-green-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
        <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {permTab === "mobile"
          ? "Ces droits controlent ce que l'utilisateur peut faire depuis l'application mobile terrain (prevendeur, acheteur, magasinier, livreur...)."
          : "Ces droits controlent ce que l'utilisateur peut voir et faire depuis l'interface back-office (tableaux de bord, commandes, stock, administration...)."
        }
      </div>

      {/* Sections */}
      <div className="flex flex-col rounded-xl overflow-hidden border border-border">
        {activeSections.map((section, si) => {
          const uniqueKeys = [...new Set(section.pages.map(p => p.permKey))]
          const allOn = uniqueKeys.every(k => !!form[k as keyof typeof form])
          const anyOn = uniqueKeys.some(k => !!form[k as keyof typeof form])

          return (
            <div key={section.group} className={`border-b border-border last:border-b-0 ${si % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
              {/* Section header + master toggle */}
              <div className={`flex items-center justify-between px-4 py-2 ${lightMap[section.color]}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${colorMap[section.color]}`} />
                  <span className={`text-xs font-bold ${textMap[section.color]}`}>{section.group}</span>
                  <span className="text-[10px] text-muted-foreground" dir="rtl">{section.groupAr}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium ${allOn ? "text-emerald-600" : anyOn ? "text-amber-600" : "text-muted-foreground"}`}>
                    {allOn ? "Tout actif" : anyOn ? "Partiel" : "Desactive"}
                  </span>
                  <button type="button"
                    onClick={() => {
                      const update: Partial<Omit<User, "id">> = {}
                      uniqueKeys.forEach(k => { update[k as keyof typeof update] = !allOn as never })
                      setForm(prev => ({ ...prev, ...update }))
                    }}
                    className={`relative w-9 h-5 rounded-full transition-colors ${allOn ? "bg-emerald-500" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${allOn ? "left-4" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Individual permissions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-border">
                {section.pages.map((page, pi) => {
                  const isOn = !!(form[page.permKey as keyof typeof form])
                  return (
                    <div key={pi}
                      className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 transition-colors border-border sm:odd:border-r">
                      <button
                        type="button"
                        aria-label={`${isOn ? "Desactiver" : "Activer"} ${page.label}`}
                        onClick={e => {
                          e.stopPropagation()
                          setForm(prev => ({ ...prev, [page.permKey]: !prev[page.permKey as keyof typeof prev] }))
                        }}
                        className={`relative w-9 h-5 rounded-full shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${isOn ? "bg-emerald-500" : "bg-slate-200"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isOn ? "left-4" : "left-0.5"}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{page.label}</p>
                        <p className="text-[10px] text-slate-400" dir="rtl">{page.labelAr}</p>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold shrink-0 ${isOn ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                        {isOn ? "OUI" : "NON"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-foreground">Acces restreint</p>
        <p className="text-sm text-muted-foreground mt-1">Gestion des utilisateurs reservee aux administrateurs.</p>
      </div>
    </div>
  )
}

export default function BOUsers({ currentUser }: { currentUser: User }) {
  // --- ALL hooks MUST come before any conditional return (Rules of Hooks) ---
  const [users, setUsers] = useState<User[]>([])
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState<UserRole | "">("")
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<Omit<User, "id">>(EMPTY_USER)
  const [saved, setSaved] = useState(false)
  const [genPwdState, setGenPwdState] = useState<{ userId: string; pwd: string; sending: boolean; sent: boolean } | null>(null)
  const [showRoles, setShowRoles] = useState(false)

  // Access check — computed AFTER hooks
  const canAccess = currentUser.role === "admin" || currentUser.role === "super_admin"

  useEffect(() => { if (canAccess) setUsers(store.getUsers()) }, [canAccess])

  // Guard AFTER hooks — safe conditional render
  if (!canAccess) return <AccessDenied />

  // Access levels:
  // super_admin + admin → full CRUD on ALL users
  // resp_commercial → can create/edit prevendeur + team_leader only (their team)
  // resp_logistique  → can create/edit magasinier + dispatcheur + livreur only (their team)
  // others           → read-only: name, phone, email, secteur only
  const isFullAdmin = currentUser.role === "super_admin" || currentUser.role === "admin"

  const TEAM_LEADER_ALLOWED: Record<string, UserRole[]> = {
    resp_commercial: ["prevendeur", "team_leader"],
    resp_logistique: ["magasinier", "dispatcheur", "livreur"],
  }
  const isTeamLeader = currentUser.role === "resp_commercial" || currentUser.role === "resp_logistique"
  const teamAllowedRoles: UserRole[] = TEAM_LEADER_ALLOWED[currentUser.role] ?? []

  // Alias so JSX references isSuperAdmin work without crashes
  const isSuperAdmin = isFullAdmin
  const canManageUsers = isFullAdmin
  const canCreateTeamMember = isTeamLeader
  // resp_commercial can edit objectifs of their team members
  const canEditObjectifs = currentUser.role === "resp_commercial" || currentUser.role === "team_leader" || isFullAdmin
  const canEditUser = (u: User) => {
    if (isFullAdmin) return true
    if (isTeamLeader && teamAllowedRoles.includes(u.role)) return true
    return false
  }
  const canDeleteUser = (u: User) => isFullAdmin
  const canSeeFullDetails = (u: User) => isFullAdmin || (isTeamLeader && teamAllowedRoles.includes(u.role))

  // Roles available in new-user form depending on current user role
  const creatableRoles: UserRole[] = isFullAdmin
    ? ALL_ROLES
    : isTeamLeader
      ? teamAllowedRoles
      : []

  const canOpenNewForm = isFullAdmin || isTeamLeader

  const reload = () => setUsers(store.getUsers())

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = filterRole === "" || u.role === filterRole
    return matchSearch && matchRole
  })

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_USER)
    setShowForm(true)
  }

  const openEdit = (u: User) => {
    if (!canEditUser(u)) return
    setEditing(u)
    setForm({
      name: u.name, email: u.email, password: u.password, role: u.role, accessType: u.accessType,
      secteur: u.secteur || "", depotId: u.depotId, phone: u.phone || "", actif: u.actif,
      canViewAchat: u.canViewAchat || false, canViewCommercial: u.canViewCommercial || false,
      canViewLogistique: u.canViewLogistique || false, canViewStock: u.canViewStock || false,
      canViewCash: u.canViewCash || false, canViewFinance: u.canViewFinance || false,
      canViewRecap: u.canViewRecap || false, canViewDatabase: u.canViewDatabase || false,
      canViewRH: u.canViewRH || false, canViewExternal: u.canViewExternal || false,
      canCreateCommandeBO: u.canCreateCommandeBO || false,
      objectifClients: u.objectifClients || 0, objectifTonnage: u.objectifTonnage || 0,
      objectifJournalierCA: u.objectifJournalierCA || 0,
      objectifHebdomadaireCA: u.objectifHebdomadaireCA || 0,
      objectifMensuelCA: u.objectifMensuelCA || 0,
      objectifJournalierClients: u.objectifJournalierClients || 0,
      objectifHebdomadaireClients: u.objectifHebdomadaireClients || 0,
      objectifMensuelClients: u.objectifMensuelClients || 0,
      passwordMobile: u.passwordMobile, passwordBO: u.passwordBO,
      photoUrl: u.photoUrl, telephone: u.telephone,
      requireCameraAuth: u.requireCameraAuth, fournisseurId: u.fournisseurId, clientId: u.clientId,
    })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) return
    const all = store.getUsers()
    if (editing) {
      const idx = all.findIndex(u => u.id === editing.id)
      if (idx >= 0) { all[idx] = { ...all[idx], ...form }; store.saveUsers(all) }
    } else {
      all.push({ ...form, id: store.genId() })
      store.saveUsers(all)
    }
    reload()
    setShowForm(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleActive = (u: User) => {
    const all = store.getUsers()
    const idx = all.findIndex(x => x.id === u.id)
    if (idx >= 0) { all[idx].actif = !all[idx].actif; store.saveUsers(all); reload() }
  }

  const handleDelete = (u: User) => {
    if (!canDeleteUser(u)) return
    if (!confirm(`Supprimer l'utilisateur "${u.name}" ?`)) return
    const all = store.getUsers().filter(x => x.id !== u.id)
    store.saveUsers(all)
    reload()
  }

  const handleGeneratePassword = async (u: User) => {
    const pwd = generatePassword()
    setGenPwdState({ userId: u.id, pwd, sending: true, sent: false })
    // Save new password
    const all = store.getUsers()
    const idx = all.findIndex(x => x.id === u.id)
    if (idx >= 0) { all[idx] = { ...all[idx], password: pwd }; store.saveUsers(all); reload() }
    // Send via email
    if (u.email && u.email.includes("@")) {
      await sendEmail({
        to_email: u.email,
        subject: `FreshLink Pro — Nouveau mot de passe pour ${u.name}`,
        body: [
          `Bonjour ${u.name},`,
          "",
          "Un administrateur a généré un nouveau mot de passe pour votre compte FreshLink Pro.",
          "",
          `  Identifiant : ${u.email || u.name}`,
          `  Nouveau mot de passe : ${pwd}`,
          "",
          "Merci de vous connecter avec ces nouvelles informations.",
          "",
          "---",
          `مرحبا ${u.name}،`,
          "تم توليد كلمة مرور جديدة من طرف المسؤول.",
          `  كلمة المرور الجديدة: ${pwd}`,
        ].join("\n"),
      })
    }
    setGenPwdState(prev => prev ? { ...prev, sending: false, sent: true } : null)
    setTimeout(() => setGenPwdState(null), 5000)
  }

  const roleStats = ALL_ROLES.map(r => ({ role: r, count: users.filter(u => u.role === r).length }))
    .filter(r => r.count > 0)

  // Export CSV
  const exportCSV = () => {
    const cols = ["id", "name", "email", "role", "secteur", "phone", "actif"]
    const rows = users.map(u => cols.map(c => `"${String((u as Record<string, unknown>)[c] ?? "")}"`).join(","))
    const csv = [cols.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `utilisateurs_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  // Export JSON
  const exportJSON = () => {
    const clean = users.map(u => ({ ...u, password: "***" }))
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `utilisateurs_${new Date().toISOString().split("T")[0]}.json`
    a.click()
  }

  // Import JSON
  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const imported: User[] = JSON.parse(ev.target?.result as string)
        if (!Array.isArray(imported)) { alert("Format invalide: le fichier doit contenir un tableau d'utilisateurs."); return }
        const existing = store.getUsers()
        let added = 0
        for (const u of imported) {
          if (!u.id || !u.name || !u.email) continue
          if (!existing.find(x => x.id === u.id)) {
            existing.push({ ...u, password: u.password || "1234" })
            added++
          }
        }
        store.saveUsers(existing)
        reload()
        setSaved(true)
        alert(`${added} utilisateur(s) importé(s) avec succès.`)
      } catch { alert("Erreur de lecture du fichier JSON.") }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  // Role reference data shown in the roles legend card
  const ROLE_DETAILS: { role: UserRole; label: string; acces: string; droits: string; reception: boolean }[] = [
    { role: "super_admin",      label: "Super Admin",          acces: "Back-office complet", droits: "Tous les droits, parametres systeme, base de donnees, utilisateurs",                           reception: true  },
    { role: "admin",            label: "Administrateur",       acces: "Back-office complet", droits: "Memes droits que super_admin sauf certains parametres critiques",                               reception: true  },
    { role: "resp_commercial",  label: "Resp. Commercial",     acces: "Back-office",         droits: "Commandes, clients, affectation commerciale, recap, caisse",                                    reception: false },
    { role: "team_leader",      label: "Team Leader",          acces: "Back-office",         droits: "Commandes, caisse, recap — supervise les prevendeurs",                                          reception: false },
    { role: "prevendeur",       label: "Pre-vendeur",          acces: "Mobile",              droits: "Prise de commandes clients, visite terrain, objectifs journaliers",                             reception: false },
    { role: "resp_logistique",  label: "Resp. Logistique",     acces: "Back-office + Mobile",droits: "Stock, dispatch, livraison, bons de preparation, RECEPTION MARCHANDISE",                       reception: true  },
    { role: "magasinier",       label: "Magasinier",           acces: "Mobile",              droits: "RECEPTION marchandise, VALIDATION BL, preparation commandes, controle prep",                  reception: true  },
    { role: "dispatcheur",      label: "Dispatcheur",          acces: "Mobile",              droits: "Affectation livreurs, planning tournees, RECEPTION MARCHANDISE",                                reception: true  },
    { role: "livreur",          label: "Livreur",              acces: "Mobile",              droits: "Bons de livraison, rapport tournee, retours clients",                                           reception: false },
    { role: "acheteur",         label: "Acheteur",             acces: "Mobile",              droits: "Bons d'achat, besoin par SKU, historique prix fournisseurs — PAS de reception",                reception: false },
    { role: "ctrl_achat",       label: "Controleur Achat",     acces: "Mobile",              droits: "Verification qualite et prix des achats effectues",                                             reception: false },
    { role: "ctrl_prep",        label: "Controleur Preparation",acces:"Mobile",              droits: "Verification des bons de preparation avant depart livreur",                                    reception: false },
    { role: "cash_man",         label: "Cash Manager",         acces: "Back-office",         droits: "Encaissements, BL, suivi caisse journaliere",                                                   reception: false },
    { role: "financier",        label: "Financier",            acces: "Back-office",         droits: "Bilan, tresorerie, tableaux de bord financiers",                                               reception: false },
    { role: "client",           label: "Client",               acces: "Portail client",      droits: "Consultation commandes et historique via portail dedie",                                        reception: false },
    { role: "fournisseur",      label: "Fournisseur",          acces: "Portail fournisseur", droits: "Consultation des PO, statuts livraisons via portail dedie",                                    reception: false },
  ]

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Gestion Utilisateurs <span className="text-muted-foreground font-normal text-base mr-1">/ إدارة المستخدمين</span>
          </h2>
          <p className="text-sm text-muted-foreground">{users.length} utilisateur(s) — {users.filter(u => u.actif).length} actifs</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            CSV
          </button>
          <button onClick={exportJSON}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            JSON
          </button>
          {isSuperAdmin && (
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" /></svg>
              Importer JSON
              <input type="file" accept=".json" className="hidden" onChange={importJSON} />
            </label>
          )}
          {canOpenNewForm && (
            <button onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-opacity">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {isTeamLeader ? "Ajouter membre equipe" : "Nouvel utilisateur"}
            </button>
          )}
        </div>
      </div>

      {/* Roles Reference Card */}
      <div className="border border-indigo-200 rounded-2xl overflow-hidden">
        <button
          onClick={() => setShowRoles(p => !p)}
          className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 transition-colors text-left">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            <span className="text-sm font-semibold text-indigo-800">Guide des roles et droits d&apos;acces</span>
            <span className="text-xs text-indigo-500 hidden sm:inline">— Qui peut faire quoi ?</span>
          </div>
          <svg className={`w-4 h-4 text-indigo-600 transition-transform ${showRoles ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {showRoles && (
              <div className="overflow-x-auto bg-white">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-indigo-700 text-white">
                      <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wide">Role</th>
                      <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide text-[10px]">
                        <span className="flex items-center justify-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          Mobile
                        </span>
                      </th>
                      <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide text-[10px]">
                        <span className="flex items-center justify-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          Back-office
                        </span>
                      </th>
                      <th className="text-left px-4 py-2.5 font-semibold uppercase tracking-wide">Droits principaux</th>
                      <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide text-[10px]">Reception</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ROLE_DETAILS.map((r, i) => (
                      <tr key={r.role} style={{ background: i % 2 === 0 ? "white" : "#f8f8ff", borderTop: "1px solid #e0e7ff" }}>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${ROLE_COLORS[r.role as UserRole]}`}>
                            {r.label}
                          </span>
                        </td>
                        {/* Mobile access */}
                        <td className="px-3 py-2.5 text-center">
                          {(r.acces.includes("Mobile") || r.acces.includes("Portail"))
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>
                            : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></span>
                          }
                        </td>
                        {/* Back-office access */}
                        <td className="px-3 py-2.5 text-center">
                          {(r.acces.includes("Back-office") || r.acces.includes("complet"))
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></span>
                            : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 text-slate-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-[11px]">{r.droits}</td>
                        <td className="px-3 py-2.5 text-center">
                          {r.reception
                            ? <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </span>
                            : <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-500">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                              </span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5C3.312 18.333 4.274 20 5.814 20z" /></svg>
                  <span><strong>Important — Reception marchandise:</strong> Seuls les roles marques <strong className="text-green-700">Oui</strong> peuvent effectuer une reception (Logistique + Admin). L&apos;acheteur cree des bons d&apos;achat mais ne peut pas receptionner les marchandises.</span>
                </div>
            </div>
          )}
        </div>

      {saved && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Utilisateur sauvegardé avec succès
        </div>
      )}

      {/* Generated password toast */}
      {genPwdState && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${genPwdState.sent ? "bg-green-50 border-green-200 text-green-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
          {genPwdState.sending ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
          ) : (
            <svg className="w-4 h-4 shrink-0 mt-0.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          )}
          <div>
            <p className="font-semibold">{genPwdState.sending ? "Génération en cours..." : "Mot de passe généré et envoyé"}</p>
            {!genPwdState.sending && (
              <p className="text-xs mt-0.5">
                Nouveau mot de passe : <code className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-green-200">{genPwdState.pwd}</code>
                <span className="ml-2 text-muted-foreground">(envoyé par email si configuré)</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Role stats chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {roleStats.map(({ role, count }) => (
          <button key={role} onClick={() => setFilterRole(filterRole === role ? "" : role)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${filterRole === role ? "text-white border-transparent" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}
            style={filterRole === role ? { background: "oklch(0.38 0.2 260)" } : {}}>
            <span className={`w-1.5 h-1.5 rounded-full ${ROLE_COLORS[role]}`} />
            {ROLE_LABELS[role]} ({count})
          </button>
        ))}
        {filterRole && (
          <button onClick={() => setFilterRole("")} className="text-xs text-muted-foreground hover:text-foreground underline">
            Tout afficher
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou email..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      {/* Read-only notice for non-managers */}
      {!canOpenNewForm && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted border border-border text-muted-foreground text-xs">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Acces en lecture seule — vous pouvez voir les noms, contacts et secteurs uniquement. / قراءة فقط
        </div>
      )}

      {/* Team leader notice */}
      {isTeamLeader && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Vous pouvez creer et modifier uniquement les membres de votre equipe
          {" "}({teamAllowedRoles.map(r => ROLE_LABELS[r]).join(", ")}).
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sidebar text-sidebar-foreground">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Nom / الاسم</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Secteur</th>
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Depot</th>
                {canOpenNewForm && <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Statut</th>}
                {isFullAdmin && <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Permissions</th>}
                {canOpenNewForm && <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Aucun utilisateur trouve</td></tr>
              ) : filtered.map((u, i) => (
                <tr key={u.id} className={i % 2 === 0 ? "bg-card" : "bg-muted/30"} style={{ borderTop: "1px solid var(--border)" }}>
                  {/* Name — always visible */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {u.photoUrl ? (
                        <img
                          src={u.photoUrl}
                          alt={u.name}
                          className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                        />
                      ) : (
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${ROLE_COLORS[u.role]}`}>
                          {u.name[0]}
                        </div>
                      )}
                      <p className="font-semibold text-foreground">{u.name}</p>
                    </div>
                  </td>
                  {/* Contact — always visible (phone + email) */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {u.phone && <span>{u.phone}</span>}
                      <span>{u.email}</span>
                    </div>
                  </td>
                  {/* Role badge */}
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${ROLE_COLORS[u.role]}`}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  {/* Secteur — always visible */}
                  <td className="px-4 py-3 text-muted-foreground text-sm">{u.secteur || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-sm">
                    {u.depotId ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                        </svg>
                        {store.getDepots().find(d => d.id === u.depotId)?.nom ?? u.depotId}
                      </span>
                    ) : <span className="text-muted-foreground/50">Tous</span>}
                  </td>
                  {/* Statut — only for managers */}
                  {canOpenNewForm && (
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.actif ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {u.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                  )}
                  {/* Permissions — full admin only */}
                  {isFullAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.canViewAchat && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">Achat</span>}
                        {u.canViewCommercial && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Commercial</span>}
                        {u.canViewLogistique && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700">Logistique</span>}
                        {u.canViewStock && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-100 text-cyan-700">Stock</span>}
                        {u.canViewCash && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">Cash</span>}
                        {u.canViewFinance && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Finance</span>}
                        {u.canViewRecap && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">Recap</span>}
                        {u.canViewDatabase && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">Admin</span>}
                        {u.canViewExternal && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-100 text-violet-700">Clients</span>}
                        {!u.canViewAchat && !u.canViewCommercial && !u.canViewLogistique && !u.canViewStock && !u.canViewCash && !u.canViewFinance && !u.canViewRecap && !u.canViewDatabase && (
                          <span className="text-[10px] text-muted-foreground italic">Aucune permission</span>
                        )}
                      </div>
                    </td>
                  )}
                  {/* Actions — only if can edit this user */}
                  {canOpenNewForm && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canEditUser(u) && (
                          <button onClick={() => openEdit(u)} title="Modifier"
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                        )}
                        {isFullAdmin && (
                          <>
                            <button onClick={() => handleGeneratePassword(u)} title="Generer un mot de passe"
                              disabled={genPwdState?.userId === u.id && genPwdState.sending}
                              className="p-1.5 rounded-lg hover:bg-violet-50 text-muted-foreground hover:text-violet-600 transition-colors disabled:opacity-50">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </button>
                            <button onClick={() => toggleActive(u)} title={u.actif ? "Desactiver" : "Activer"}
                              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              {u.actif
                                ? <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                : <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                            </button>
                            {u.id !== currentUser.id && (
                              <button onClick={() => handleDelete(u)} title="Supprimer"
                                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="font-bold text-foreground">{editing ? "Modifier l&apos;utilisateur" : "Nouvel utilisateur"}</h3>
                <p className="text-xs text-muted-foreground">{editing ? "تعديل المستخدم" : "مستخدم جديد"}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5">
              {!canManageUsers && canEditObjectifs && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  En tant que Responsable Commercial, vous pouvez uniquement modifier les objectifs des prévendeurs.
                </div>
              )}
              {/* Identity — only for admins */}
              {canManageUsers && <div>
                <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Identite / الهوية</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  {/* Photo profile — spans full width */}
                  <div className="sm:col-span-2 flex items-center gap-4">
                    {/* Avatar preview */}
                    <div className="relative shrink-0">
                      {(form as User).photoUrl ? (
                        <img
                          src={(form as User).photoUrl}
                          alt="Photo profil"
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary shadow"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center">
                          <svg className="w-7 h-7 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      {(form as User).photoUrl && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, photoUrl: undefined } as typeof form)}
                          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center text-[10px] font-bold hover:opacity-90">
                          &times;
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <label className="text-xs font-semibold text-foreground">Photo de profil / صورة الملف الشخصي</label>
                      <label className="cursor-pointer flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors text-xs text-primary font-medium">
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Choisir une photo / اختر صورة
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const reader = new FileReader()
                            reader.onload = ev => {
                              setForm({ ...form, photoUrl: ev.target?.result as string } as typeof form)
                            }
                            reader.readAsDataURL(file)
                          }}
                        />
                      </label>
                      <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP — Max 2 MB</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground">Nom complet *</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Mohamed Alami" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground">Email *</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="user@freshlink.ma" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground">Mot de passe</label>
                    <div className="flex gap-2">
                      <input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                        className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                        placeholder="1234" />
                      <button type="button"
                        onClick={() => setForm({ ...form, password: generatePassword() })}
                        title="Générer un mot de passe fort"
                        className="px-3 py-2.5 rounded-xl border border-violet-300 bg-violet-50 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors shrink-0">
                        Générer
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground">Téléphone</label>
                    <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="0661234567" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-foreground">Secteur / Zone</label>
                    <input type="text" value={form.secteur} onChange={e => setForm({ ...form, secteur: e.target.value })}
                      className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Nord, Centre..." />
                  </div>

                  {/* Depot assignment — visible for roles that need depot access */}
                  {(form.role === "magasinier" || form.role === "acheteur" || form.role === "livreur" || form.role === "admin" || form.role === "super_admin") && (
                    <div className="flex flex-col gap-1 sm:col-span-2">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                        </svg>
                        Depot assigne / المستودع
                        <span className="text-[10px] font-normal text-muted-foreground">(optionnel — filtre la vision du magasinier)</span>
                      </label>
                      {(() => {
                        const depots = store.getDepots().filter(d => d.actif)
                        return (
                          <select
                            value={form.depotId ?? ""}
                            onChange={e => setForm({ ...form, depotId: e.target.value || undefined } as typeof form)}
                            className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">— Tous les depots (aucune restriction)</option>
                            {depots.map(d => (
                              <option key={d.id} value={d.id}>
                                {d.nom}{d.ville ? ` — ${d.ville}` : ""}{d.responsableNom ? ` (resp: ${d.responsableNom})` : ""}
                              </option>
                            ))}
                          </select>
                        )
                      })()}
                      <p className="text-[10px] text-muted-foreground">
                        Si un depot est assigne, le magasinier/acheteur ne verra que les bons destines a ce depot.
                        Laissez vide pour voir tous les depots.
                      </p>
                    </div>
                  )}

                  {/* Grouped Role Selector */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">Role * / الدور</label>
                    <div className="flex flex-col gap-2">
                      {ROLE_GROUPS.map(group => {
                        // Filter to only roles this user is allowed to assign
                        const visibleRoles = group.roles.filter(r => creatableRoles.includes(r))
                        if (visibleRoles.length === 0) return null
                        return (
                          <div key={group.label}>
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">{group.label}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {visibleRoles.map(r => (
                                <button key={r} type="button"
                                  onClick={() => setForm({ ...form, role: r })}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${form.role === r ? "text-primary-foreground border-transparent shadow-sm bg-primary" : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary"}`}>
                                  {ROLE_LABELS[r]}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Access Type */}
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-foreground">Interface d&apos;acces / واجهة الوصول</label>
                    <p className="text-[10px] text-muted-foreground">Par défaut, basé sur le rôle. Vous pouvez forcer une interface.</p>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {([
                        { val: undefined,    label: "Auto (rôle)",       tag: "AUTO" },
                        { val: "mobile",     label: "Mobile",            tag: "MOB" },
                        { val: "backoffice", label: "Back-office",       tag: "BO" },
                        { val: "both",       label: "Mobile + Back-office", tag: "2x" },
                      ] as { val: UserAccessType | undefined; label: string; tag: string }[]).map(opt => (
                        <button key={opt.label} type="button"
                          onClick={() => setForm({ ...form, accessType: opt.val })}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${form.accessType === opt.val ? "text-white border-transparent shadow-sm" : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary"}`}
                          style={form.accessType === opt.val ? { background: "oklch(0.38 0.2 260)" } : {}}>
                          <span className={`text-[9px] font-black px-1 py-0.5 rounded ${form.accessType === opt.val ? "bg-white/20" : "bg-muted"}`}>{opt.tag}</span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dual password section — only when accessType === "both" */}
                  {form.accessType === "both" && (
                    <div className="flex flex-col gap-3 sm:col-span-2">
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                        <p className="text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">Mots de passe par interface</p>
                        <p className="text-[11px] text-blue-700 mb-3">
                          Definissez un mot de passe different pour chaque interface. La connexion redirigera automatiquement sans afficher le selecteur.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              Mot de passe Mobile
                            </label>
                            <input type="text"
                              value={(form as { passwordMobile?: string }).passwordMobile ?? ""}
                              onChange={e => setForm({ ...form, passwordMobile: e.target.value } as typeof form)}
                              className="px-3 py-2 rounded-xl border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="ex: 1234" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                              <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              Mot de passe Back-office
                            </label>
                            <input type="text"
                              value={(form as { passwordBO?: string }).passwordBO ?? ""}
                              onChange={e => setForm({ ...form, passwordBO: e.target.value } as typeof form)}
                              className="px-3 py-2 rounded-xl border border-border bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="ex: BO1234" />
                          </div>
                        </div>
                        {(form as { passwordMobile?: string }).passwordMobile && (form as { passwordBO?: string }).passwordBO && (
                          <div className="mt-2 p-2 rounded-lg bg-white border border-blue-200 text-[11px] text-blue-800">
                            Mobile : <strong className="font-mono">{(form as { passwordMobile?: string }).passwordMobile}</strong>
                            {" → "}interface terrain |{" "}
                            BO : <strong className="font-mono">{(form as { passwordBO?: string }).passwordBO}</strong>
                            {" → "}interface gestion
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Hidden legacy role select for open form (unused but keep to avoid TS issue) */}
                  <div className="hidden">
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })}>
                      {ALL_ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>}

              {/* Objectifs prevendeur */}
              {(form.role === "prevendeur" || form.role === "resp_commercial" || form.role === "team_leader") && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3">Objectifs / الأهداف</h4>
                  <div className="flex flex-col gap-4">
                    {/* CA Objectifs */}
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">CA (Chiffre d&apos;affaires en DH)</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Journalier</label>
                          <input type="number" value={form.objectifJournalierCA ?? 0}
                            onChange={e => setForm({ ...form, objectifJournalierCA: Number(e.target.value) })}
                            className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Hebdomadaire</label>
                          <input type="number" value={form.objectifHebdomadaireCA ?? 0}
                            onChange={e => setForm({ ...form, objectifHebdomadaireCA: Number(e.target.value) })}
                            className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Mensuel</label>
                          <input type="number" value={form.objectifMensuelCA ?? 0}
                            onChange={e => setForm({ ...form, objectifMensuelCA: Number(e.target.value) })}
                            className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                      </div>
                    </div>
                    {/* Clients Objectifs */}
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Clients visités</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Journalier</label>
                          <input type="number" value={form.objectifJournalierClients ?? 0}
                            onChange={e => setForm({ ...form, objectifJournalierClients: Number(e.target.value) })}
                            className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Hebdomadaire</label>
                          <input type="number" value={form.objectifHebdomadaireClients ?? 0}
                            onChange={e => setForm({ ...form, objectifHebdomadaireClients: Number(e.target.value) })}
                            className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-muted-foreground">Mensuel</label>
                          <input type="number" value={form.objectifMensuelClients ?? 0}
                            onChange={e => setForm({ ...form, objectifMensuelClients: Number(e.target.value) })}
                            className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                      </div>
                    </div>
                    {/* Legacy tonnage */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Objectif tonnage mensuel (kg)</label>
                        <input type="number" value={form.objectifTonnage ?? 0}
                          onChange={e => setForm({ ...form, objectifTonnage: Number(e.target.value) })}
                          className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Permissions — Mobile vs Back-office tabs */}
              <PermissionsTabs form={form} setForm={setForm} />
              {/* Legacy permissions block — removed, replaced by PermissionsTabs above */}

              {/* Workflows info */}
              <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "oklch(0.38 0.2 260 / 0.06)", border: "1px solid oklch(0.38 0.2 260 / 0.2)" }}>
                <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "oklch(0.38 0.2 260)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Les workflows email (validation commande, besoin achat, récap journalier) sont envoyés à l'adresse email renseignée. Pour WhatsApp, l'application génère un lien <code className="font-mono">wa.me/</code> vers le numéro de téléphone.
                </p>
              </div>

              {/* Securite — Camera & Micro obligatoire */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "oklch(0.14 0.018 148)" }}>
                  <svg className="w-4 h-4 shrink-0" style={{ color: "oklch(0.65 0.18 148)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-bold" style={{ color: "oklch(0.75 0.14 148)" }}>Securite — Acces terrain</span>
                </div>
                <label className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Activer camera &amp; micro obligatoire</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      L&apos;utilisateur devra autoriser la camera et le micro avant d&apos;acceder a l&apos;application.
                      {form.name?.toLowerCase().startsWith("demo") && (
                        <span className="ml-1 text-amber-500 font-medium">(Comptes demo — toujours ignore)</span>
                      )}
                    </p>
                  </div>
                  <div
                    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${(form as Record<string,unknown>).requireCameraAuth ? "bg-emerald-500" : "bg-muted"}`}
                    onClick={() => setForm({ ...form, requireCameraAuth: !(form as Record<string,unknown>).requireCameraAuth } as typeof form)}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${(form as Record<string,unknown>).requireCameraAuth ? "left-6" : "left-1"}`} />
                  </div>
                </label>
              </div>

              {/* Statut */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`relative w-11 h-6 rounded-full transition-colors ${form.actif ? "bg-green-500" : "bg-muted"}`}
                  onClick={() => setForm({ ...form, actif: !form.actif })}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.actif ? "left-6" : "left-1"}`} />
                </div>
                <span className="text-sm font-semibold text-foreground">{form.actif ? "Compte actif" : "Compte inactif"}</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Annuler
              </button>
              <button onClick={handleSave}
                disabled={!form.name.trim() || !form.email.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: "oklch(0.38 0.2 260)" }}>
                {editing ? "Enregistrer les modifications" : "Cr\u00e9er l&apos;utilisateur"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
