"use client"

import React, { useState, useEffect, useCallback, Component } from "react"
import dynamic from "next/dynamic"
import type { User } from "@/lib/store"
import { store, ROLE_LABELS, ROLE_COLORS, isDemoUser } from "@/lib/store"

// ─────────────────────────────────────────────────────────────
// ERROR BOUNDARY — catches any render crash inside a panel
// instead of letting the whole page go white
// ─────────────────────────────────────────────────────────────
interface EBState { hasError: boolean; msg: string }
class PanelErrorBoundary extends Component<{ children: React.ReactNode; label: string }, EBState> {
  constructor(props: { children: React.ReactNode; label: string }) {
    super(props)
    this.state = { hasError: false, msg: "" }
  }
  static getDerivedStateFromError(err: unknown): EBState {
    return { hasError: true, msg: err instanceof Error ? err.message : String(err) }
  }
  componentDidCatch(err: unknown) {
    console.error("[PanelErrorBoundary]", err)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-slate-800 text-base">{this.props.label} — Erreur de chargement</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs font-mono break-all">{this.state.msg}</p>
          </div>
          <button
            onClick={() => this.setState({ hasError: false, msg: "" })}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
            Reessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ALL panels loaded dynamically — one broken import never crashes the whole BO
const L = (label: string) => () => <div className="p-8 text-center text-muted-foreground text-sm">{label}</div>
const BODashboard            = dynamic(() => import("./BODashboard"),            { ssr: false, loading: L("Chargement tableau de bord...") })
const BOAchat                = dynamic(() => import("./BOAchat"),                { ssr: false, loading: L("Chargement achats...") })
const BOReception            = dynamic(() => import("./BOReception"),            { ssr: false, loading: L("Chargement reception...") })
const BOCommercial           = dynamic(() => import("./BOCommercial"),           { ssr: false, loading: L("Chargement commercial...") })
const BOStock                = dynamic(() => import("./BOStock"),                { ssr: false, loading: L("Chargement stock...") })
const BODispatch             = dynamic(() => import("./BODispatch"),             { ssr: false, loading: L("Chargement dispatch...") })
const BOFournisseurs         = dynamic(() => import("./BOFournisseurs"),         { ssr: false, loading: L("Chargement fournisseurs...") })
const BORapportLivraison     = dynamic(() => import("./BORapportLivraison"),     { ssr: false, loading: L("Chargement rapport...") })
const BOBonPreparation       = dynamic(() => import("./BOBonPreparation"),       { ssr: false, loading: L("Chargement preparation...") })
const BOCash                 = dynamic(() => import("./BOCash"),                 { ssr: false, loading: L("Chargement cash...") })
const BORetour               = dynamic(() => import("./BORetour"),               { ssr: false, loading: L("Chargement retours...") })
const BORecap                = dynamic(() => import("./BORecap"),                { ssr: false, loading: L("Chargement recap...") })
const BOPurchaseOrders       = dynamic(() => import("./BOPurchaseOrders"),       { ssr: false, loading: L("Chargement PO...") })
const BOUsers                = dynamic(() => import("./BOUsers"),                { ssr: false, loading: L("Chargement utilisateurs...") })
const BOSettings             = dynamic(() => import("./BOSettings"),             { ssr: false, loading: L("Chargement parametres...") })
const BOFinance              = dynamic(() => import("./BOFinance"),              { ssr: false, loading: L("Chargement finance...") })
const BOArticles             = dynamic(() => import("./BOArticles"),             { ssr: false, loading: L("Chargement articles...") })
const BOWhatsApp             = dynamic(() => import("./BOWhatsApp"),             { ssr: false, loading: L("Chargement WhatsApp...") })
const BOAffectationCommerciale = dynamic(() => import("./BOAffectationCommerciale"), { ssr: false, loading: L("Chargement affectation...") })
const BOGoogleSheets         = dynamic(() => import("./BOGoogleSheets"),         { ssr: false, loading: L("Chargement Google Sheets...") })
const BOComptesExternes      = dynamic(() => import("./BOComptesExternes"),      { ssr: false, loading: L("Chargement comptes...") })
const BOProspection          = dynamic(() => import("./BOProspection"),          { ssr: false, loading: L("Chargement prospection...") })
const BOCreditFournisseur    = dynamic(() => import("./BOCreditFournisseur"),    { ssr: false, loading: L("Chargement credit...") })
const AgentsIAPanel          = dynamic(() => import("./AgentsIAPanel"),          { ssr: false, loading: L("Chargement agent IA...") })
const BOGPSTracker           = dynamic(() => import("./BOGPSTracker"),           { ssr: false, loading: L("Chargement GPS...") })
const FeedbackPanel          = dynamic(() => import("./FeedbackPanel"),          { ssr: false, loading: L("Chargement feedbacks...") })
const TripChargesPanel       = dynamic(() => import("./TripChargesPanel"),       { ssr: false, loading: L("Chargement charges...") })
const AnalyseAchatPanel      = dynamic(() => import("./AnalyseAchatPanel"),      { ssr: false, loading: L("Chargement analyse achat...") })
const AnalyseReceptionPanel  = dynamic(() => import("./AnalyseReceptionPanel"),  { ssr: false, loading: L("Chargement analyse reception...") })
const ShelfLifePanel         = dynamic(() => import("./ShelfLifePanel"),         { ssr: false, loading: L("Chargement shelf life...") })
const ForecastPanel          = dynamic(() => import("./ForecastPanel"),          { ssr: false, loading: L("Chargement forecast...") })
const ASHELMarketPanel       = dynamic(() => import("./ASHELMarketPanel"),       { ssr: false, loading: L("Chargement ASHEL...") })
const CameraPermissionsPanel = dynamic(() => import("./CameraPermissionsPanel"), { ssr: false, loading: L("Chargement permissions...") })
const CutoffNotificationsPanel = dynamic(() => import("./CutoffNotificationsPanel"), { ssr: false, loading: L("Chargement cutoffs...") })
const CaissesVidesPanel      = dynamic(() => import("./CaissesVidesPanel"),      { ssr: false, loading: L("Chargement caisses vides...") })
const DeployGuidePanel       = dynamic(() => import("./DeployGuidePanel"),       { ssr: false, loading: L("Chargement guide...") })
const BODepots               = dynamic(() => import("./BODepots"),               { ssr: false, loading: L("Chargement depots...") })
const BOResources            = dynamic(() => import("./BOResources"),            { ssr: false, loading: L("Chargement RH...") })
const BOComptabiliteRH       = dynamic(() => import("./BOComptabiliteRH"),       { ssr: false, loading: L("Chargement compta RH...") })
const BODatabase             = dynamic(() => import("./BODatabase"),             { ssr: false, loading: L("Chargement base de donnees...") })

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export type Tab =
  | "dashboard" | "achat" | "reception" | "po"
  | "commercial" | "affectation" | "dispatch" | "livraisons"
  | "stock" | "retour" | "cash"
  | "recap" | "rapport_livraison" | "preparation"
  | "fournisseurs" | "articles"
  | "finance" | "whatsapp"
  | "users" | "database" | "settings" | "gsheets"
  | "comptes_externes"
  | "prospection" | "credit_fournisseur" | "agents_ia"
  | "gps_tracker"
  | "feedback" | "trip_charges" | "analyse_achat" | "analyse_reception"
  | "caisses_vides" | "shelf_life" | "forecast" | "ashel_market"
  | "camera_perms" | "cutoffs" | "deploy_guide"
  | "azmi_agent" | "hicham_agent" | "ourai_agent"
  | "depots"
  | "rh_productivite" | "rh_comptabilite"

interface NavItem {
  id: Tab
  label: string
  labelAr: string
  icon: React.ReactNode
  permKey?: keyof User
  badge?: number
}

interface NavGroup {
  label: string
  labelAr: string
  items: NavItem[]
}

// ─────────────────────────────────────────────────────────────
// ICON HELPER
// ─────────────────────────────────────────────────────────────

function Icon({ d, className = "w-[18px] h-[18px]" }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
// NAV CONFIGURATION
// ─────────────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  // ── ANALYSE & KPI ──────────────────────────────────────────────────────────
  {
    label: "Analyse & KPI", labelAr: "التحليل",
    items: [
      { id: "recap",    label: "Synthese & Recap",   labelAr: "الملخص",      permKey: "canViewRecap",   icon: <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
      { id: "finance",  label: "Finance & Caisse",   labelAr: "المالية",     permKey: "canViewFinance", icon: <Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 11v-1m0-8h.01M20 12a8 8 0 11-16 0 8 8 0 0116 0z" /> },
      { id: "rapport_livraison", label: "Rapport Livraison", labelAr: "تقرير التوصيل", permKey: "canViewLogistique", icon: <Icon d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    ],
  },
  // ── ACHAT ──────────────────────────────────────────────────────────────────
  {
    label: "Achat", labelAr: "المشتريات",
    items: [
      { id: "achat",            label: "Bons d'achat",       labelAr: "وصولات الشراء",         permKey: "canViewAchat", icon: <Icon d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /> },
      { id: "po",               label: "Commandes Fournisseurs", labelAr: "أوامر الشراء",       permKey: "canViewAchat", icon: <Icon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
      { id: "credit_fournisseur", label: "Credit Fournisseur", labelAr: "ائتمان الموردين",     permKey: "canViewAchat", icon: <Icon d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /> },
      { id: "fournisseurs",     label: "Fournisseurs",        labelAr: "الموردون",              permKey: "canViewAchat", icon: <Icon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
      { id: "reception",        label: "Réception Achat",     labelAr: "الاستلام",              permKey: "canViewAchat", icon: <Icon d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /> },
      { id: "analyse_achat",       label: "Analyse Achat",       labelAr: "تحليل المشتريات",    permKey: "canViewAchat", icon: <Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
      { id: "analyse_reception",   label: "Analyse Reception",   labelAr: "تحليل الاستلام",     permKey: "canViewAchat", icon: <Icon d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    ],
  },
  // ── COMMERCIAL ────────────────────────────────────────────────────────────
  {
    label: "Commercial", labelAr: "التجاري",
    items: [
      { id: "commercial",   label: "Commandes",          labelAr: "الطلبيات",         permKey: "canViewCommercial", icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
      { id: "affectation",  label: "Affectation",        labelAr: "التوزيع التجاري", permKey: "canViewCommercial", icon: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
      { id: "cash",         label: "Cash & BL",          labelAr: "النقديات",         permKey: "canViewCash",       icon: <Icon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /> },
      { id: "prospection",  label: "Prospection IA",     labelAr: "الاستهداف الذكي", permKey: "canViewCommercial", icon: <Icon d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /> },
    ],
  },
  // ── LOGISTIQUE ────────────────────────────────────────────────────────────
  {
    label: "Logistique", labelAr: "اللوجستيك",
    items: [
      { id: "stock",        label: "Stock & Inventaire",  labelAr: "المخزون",         permKey: "canViewStock",      icon: <Icon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
      { id: "shelf_life",   label: "Shelf Life & DLC",    labelAr: "تاريخ الصلاحية",  permKey: "canViewStock",      icon: <Icon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
      { id: "forecast",     label: "Forecast & Achat Auto", labelAr: "التوقعات",      permKey: "canViewStock",      icon: <Icon d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /> },
      { id: "dispatch",     label: "Dispatch & Livreurs", labelAr: "التوزيع",         permKey: "canViewLogistique", icon: <Icon d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /> },
      { id: "preparation",  label: "Preparation",         labelAr: "وصولات التحضير",  permKey: "canViewLogistique", icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
      { id: "retour",       label: "Retours",             labelAr: "المرتجعات",       permKey: "canViewLogistique", icon: <Icon d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /> },
      { id: "trip_charges", label: "Charges Trip",        labelAr: "مصاريف الرحلة",   permKey: "canViewLogistique", icon: <Icon d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M15 7h.01M9 7H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M7 7V5a2 2 0 012-2h8a2 2 0 012 2v2" /> },
      { id: "caisses_vides", label: "Caisses Vides",      labelAr: "الصناديق الفارغة", permKey: "canViewLogistique", icon: <Icon d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /> },
    ],
  },
  // ── DONNÉES ───────────────────────────────────────────────────────────────
  {
    label: "Donnees", labelAr: "البيانات",
    items: [
      { id: "articles",        label: "Catalogue Produits",    labelAr: "الفواكه والخضر",      permKey: "canViewStock",    icon: <Icon d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
      { id: "comptes_externes", label: "Clients & Fournisseurs", labelAr: "الزبائن والموردون", permKey: "canViewExternal", icon: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    ],
  },
  // ── COMMUNICATION ────────────────────────────────────────────────────────
  {
    label: "Communication", labelAr: "التواصل",
    items: [
      {
        id: "whatsapp", label: "WhatsApp Pro", labelAr: "واتساب", permKey: "canViewCommercial",
        icon: (
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        ),
      },
    ],
  },
  // ── AGENTS IA ─────────────────────────────────────────────────────────────
  {
    label: "Agents IA", labelAr: "عملاء الذكاء",
    items: [
      { id: "gps_tracker", label: "GPS Livreurs & Commerciaux", labelAr: "تتبع GPS", icon: (
        <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )},
      { id: "agents_ia",   label: "Tous les Agents IA",       labelAr: "عملاء الذكاء",    icon: <Icon d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.694-1.338 2.694H4.136c-1.368 0-2.337-1.694-1.338-2.694L4 15.3" /> },
      { id: "ashel_market", label: "ASHEL — Achat Marche",       labelAr: "شيل الشراء",       icon: <Icon d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /> },
      { id: "azmi_agent",   label: "AZMI — Finance",             labelAr: "عزمي المالي",      icon: <Icon d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 13v-1m0-2c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
      { id: "hicham_agent", label: "HICHAM — Controle",          labelAr: "هشام المراقب",     icon: <Icon d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
      { id: "ourai_agent",  label: "OURAI — RH & Paie",          labelAr: "أوراي الموارد البشرية", permKey: "canViewRH" as keyof User, icon: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
    ],
  },
  // ── COMMUNICATION & AVIS ─────────────────────────────────────────────────
  {
    label: "Avis & Retours", labelAr: "الآراء والتقييمات",
    items: [
      { id: "feedback", label: "Feedbacks & Avis", labelAr: "الآراء والتقييمات", icon: <Icon d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> },
    ],
  },
  // ── RESSOURCES HUMAINES ───────────────────────────────────────────────────
  {
    label: "Ressources Humaines", labelAr: "الموارد البشرية",
    items: [
      { id: "rh_productivite", label: "RH — Ourai (Productivité & Salaires)", labelAr: "الموارد البشرية", permKey: "canViewRH" as keyof User, icon: <Icon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /> },
      { id: "rh_comptabilite", label: "Comptabilité RH — Azmi", labelAr: "محاسبة الموارد", permKey: "canViewRH" as keyof User, icon: <Icon d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M12 7h.01M15 7h.01M9 7H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M7 7V5a2 2 0 012-2h8a2 2 0 012 2v2" /> },
    ],
  },
  // ── ADMINISTRATION ────────────────────────────────────────────────────────
  {
    label: "Administration", labelAr: "الإدارة",
    items: [
      { id: "users",        label: "Utilisateurs & Roles", labelAr: "المستخدمون",       permKey: "canViewDatabase", icon: <Icon d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
      { id: "depots",       label: "Multi-Depots",          labelAr: "المستودعات",       permKey: "canViewDatabase", icon: <Icon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
      { id: "camera_perms", label: "Droits Caméra",        labelAr: "صلاحيات الكاميرا", permKey: "canViewDatabase", icon: <Icon d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" /> },
      { id: "cutoffs",      label: "Notifications Cut-off", labelAr: "إشعارات الإيقاف",  permKey: "canViewDatabase", icon: <Icon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /> },
      { id: "database",     label: "Base de donnees",       labelAr: "قاعدة البيانات",  permKey: "canViewDatabase", icon: <Icon d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /> },
      { id: "settings",     label: "Parametres",            labelAr: "الإعدادات",        permKey: "canViewDatabase", icon: <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> },
      { id: "deploy_guide", label: "Deploiement Vercel",     labelAr: "النشر على Vercel", permKey: "canViewDatabase", icon: <Icon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
      {
        id: "gsheets", label: "Google Sheets", labelAr: "جوجل شيتس", permKey: "canViewDatabase" as keyof User,
        icon: (
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 7h8M8 11h8M8 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M4 6h16" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        ),
      },
    ],
  },
]

// ─────────────────────────────────────────────────────────────
// PANELS — lazy, safe, no crashes
// ─────────────────────────────────────────────────────────────

const PANELS: Record<Tab, (u: User) => React.ReactNode> = {
  dashboard:         (u) => <BODashboard user={u} />,
  achat:             (u) => <BOAchat user={u} />,
  reception:         (u) => <BOReception user={u} />,
  po:                (u) => <BOPurchaseOrders user={u} />,
  commercial:        (u) => <BOCommercial user={u} />,
  affectation:       (u) => <BOAffectationCommerciale user={u} />,
  dispatch:          (u) => <BODispatch user={u} />,
  fournisseurs:      (u) => <BOFournisseurs user={u} />,
  preparation:       (u) => <BOBonPreparation user={u} />,
  rapport_livraison: (u) => <BORapportLivraison user={u} />,
  stock:             (u) => <BOStock user={u} />,
  retour:            (u) => <BORetour user={u} />,
  articles:          (u) => <BOArticles user={u} />,
  finance:           (u) => <BOFinance user={u} />,
  whatsapp:          (u) => <BOWhatsApp user={u} />,
  cash:              (u) => <BOCash user={u} />,
  livraisons:        (u) => <BOCash user={u} />,
  recap:             (u) => <BORecap user={u} />,
  users:             (u) => <BOUsers currentUser={u} />,
  depots:            (u) => <BODepots user={u} />,
  database:          (u) => <BODatabase user={u} />,
  settings:          (u) => <BOSettings user={u} />,
  gsheets:           (u) => <BOGoogleSheets user={u} />,
  comptes_externes:  (u) => <BOComptesExternes user={u} />,
  prospection:       (u) => <BOProspection user={u} />,
  credit_fournisseur:(u) => <BOCreditFournisseur user={u} />,
  agents_ia:         (u) => <AgentsIAPanel user={u} initialAgent="ashel" />,
  azmi_agent:        (u) => <AgentsIAPanel user={u} initialAgent="azmi" />,
  hicham_agent:      (u) => <AgentsIAPanel user={u} initialAgent="hicham" />,
  ourai_agent:       (u) => <AgentsIAPanel user={u} initialAgent="ourai" />,
  gps_tracker:       (u) => <BOGPSTracker user={u} />,
  feedback:          (u) => <FeedbackPanel user={u} />,
  trip_charges:      (_u) => <TripChargesPanel />,
  caisses_vides:     (_u) => <CaissesVidesPanel />,
  analyse_achat:       (_u) => <AnalyseAchatPanel />,
  analyse_reception:   (_u) => <AnalyseReceptionPanel />,
  shelf_life:          (_u) => <ShelfLifePanel />,
  forecast:            (_u) => <ForecastPanel />,
  ashel_market:        (_u) => <ASHELMarketPanel />,
  camera_perms:      (u) => <CameraPermissionsPanel currentUser={u} />,
  cutoffs:           (_u) => <CutoffNotificationsPanel />,
  deploy_guide:      (_u) => <DeployGuidePanel />,
  rh_productivite:   (u) => <BOResources user={u} />,
  rh_comptabilite:   (u) => <BOComptabiliteRH user={u} />,
}

// ─────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────

interface Props { user: User; onLogout: () => void }

export default function BackOfficeLayout({ user, onLogout }: Props) {
  const [activeTab, setActiveTab]       = useState<Tab>("dashboard")
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [isOnline, setIsOnline]         = useState(true)
  const [sbStatus, setSbStatus]         = useState<"checking" | "connected" | "error">("checking")
  const [showProfil, setShowProfil]     = useState(false)
  const [profilPhoto, setProfilPhoto]   = useState(user.photoUrl ?? "")
  const [navSearch, setNavSearch]       = useState("")
  const isDemo           = isDemoUser(user)
  const isSuperAdmin     = user.role === "super_admin" || user.role === "admin"  // admin + super_admin bypass most permKeys
  const isStrictSuperAdmin = user.role === "super_admin"                          // camera / mic / raw hardware: super_admin ONLY
  const isAdminOrAbove   = user.role === "super_admin" || user.role === "admin"  // database / settings / gsheets: admin + super_admin

  // Supabase connectivity check
  useEffect(() => {
    let cancelled = false
    async function ping() {
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const sb = createClient()
        const { error } = await sb.from("fl_config").select("id").limit(1).maybeSingle()
        if (!cancelled) setSbStatus(error ? "error" : "connected")
      } catch {
        if (!cancelled) setSbStatus("error")
      }
    }
    ping()
    const timer = setInterval(ping, 60_000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  // Online / offline detection
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const on  = () => setIsOnline(true)
    const off = () => setIsOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off) }
  }, [])

  // Close sidebar on ESC
  useEffect(() => {
    if (!sidebarOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSidebarOpen(false) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [sidebarOpen])

  const isVisible = useCallback((item: NavItem): boolean => {
    if (!item.permKey) return true
    // database / settings / gsheets / users (canViewDatabase): only admin + super_admin
    if (item.permKey === "canViewDatabase") return isAdminOrAbove
    // All other permKeys: super_admin + admin bypass, others check their flag
    if (isSuperAdmin) return true
    return (user as Record<string, unknown>)[item.permKey as string] === true
  }, [isSuperAdmin, isAdminOrAbove, user])

  const navigate = useCallback((tab: Tab) => {
    setActiveTab(tab)
    setSidebarOpen(false)
  }, [])

  const allItems   = NAV_GROUPS.flatMap(g => g.items)
  const activeItem = allItems.find(i => i.id === activeTab)

  // Filter nav by search
  const searchQ = navSearch.toLowerCase().trim()
  const filteredGroups = NAV_GROUPS.map(g => ({
    ...g,
    items: g.items.filter(item =>
      isVisible(item) && (
        !searchQ ||
        item.label.toLowerCase().includes(searchQ) ||
        item.labelAr?.includes(navSearch)
      )
    )
  })).filter(g => g.items.length > 0)

  // ── Group icon colors by group label (light-theme friendly) ──
  const GROUP_ICON_COLOR: Record<string, string> = {
    "Analyse & KPI":    "text-emerald-600",
    "Achat":            "text-amber-600",
    "Commercial":       "text-lime-600",
    "Logistique":       "text-sky-600",
    "Donnees":          "text-orange-600",
    "Communication":    "text-teal-600",
    "Agents IA":        "text-violet-600",
    "Administration":   "text-yellow-600",
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ background: "oklch(0.07 0.015 255)", color: "oklch(0.95 0.005 250)" }}>

      {/* Desktop sidebar — collapsible */}
      <div className={`hidden lg:flex flex-col shrink-0 transition-all duration-300 ${sidebarCollapsed ? "w-16" : "w-60"}`}>
        <SidebarContent
          user={user}
          activeTab={activeTab}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          profilPhoto={profilPhoto}
          navSearch={navSearch}
          setNavSearch={setNavSearch}
          filteredGroups={filteredGroups}
          searchQ={searchQ}
          GROUP_ICON_COLOR={GROUP_ICON_COLOR}
          navigate={navigate}
          onLogout={onLogout}
          onOpenProfil={() => setShowProfil(true)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Drawer */}
          <div className="w-60 shrink-0 shadow-2xl">
            <SidebarContent
              user={user}
              activeTab={activeTab}
              sidebarCollapsed={sidebarCollapsed}
              setSidebarCollapsed={setSidebarCollapsed}
              profilPhoto={profilPhoto}
              navSearch={navSearch}
              setNavSearch={setNavSearch}
              filteredGroups={filteredGroups}
              searchQ={searchQ}
              GROUP_ICON_COLOR={GROUP_ICON_COLOR}
              navigate={navigate}
              onLogout={onLogout}
              onOpenProfil={() => setShowProfil(true)}
            />
          </div>
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* ── Topbar ─────────────────────────────────────── */}
        <header className="flex items-center justify-between px-4 lg:px-5 py-3 shrink-0 gap-3 bg-white border-b border-slate-200 shadow-sm">

          {/* Left: hamburger + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
              aria-label="Ouvrir le menu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400 hidden sm:inline font-medium">
                  {NAV_GROUPS.find(g => g.items.some(i => i.id === activeTab))?.label ?? "Dashboard"}
                </span>
                <svg className="w-3 h-3 text-slate-300 hidden sm:block shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <h1 className="text-sm font-bold text-slate-800 truncate">
                  {activeItem?.label ?? "Tableau de bord"}
                </h1>
                {activeItem?.labelAr && (
                  <span className="text-[10px] text-slate-400 hidden md:inline shrink-0">
                    {activeItem.labelAr}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {new Date().toLocaleDateString("fr-MA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          {/* Right: status chips + user */}
          <div className="flex items-center gap-2 shrink-0">

            {/* Online / Offline */}
            <div className={[
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
              isOnline
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            ].join(" ")}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <span className="hidden sm:inline">{isOnline ? "En ligne" : "Hors ligne"}</span>
            </div>

            {/* Supabase status */}
            <div
              title={sbStatus === "connected" ? "Supabase connecte" : sbStatus === "error" ? "Supabase non connecte" : "Verification Supabase..."}
              className={[
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-default select-none",
                sbStatus === "connected"  ? "bg-sky-50   border-sky-200   text-sky-700"
                : sbStatus === "error"    ? "bg-rose-50  border-rose-200  text-rose-700"
                                          : "bg-slate-50 border-slate-200 text-slate-500"
              ].join(" ")}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                sbStatus === "connected"  ? "bg-sky-500 animate-pulse"
                : sbStatus === "error"    ? "bg-rose-500"
                                          : "bg-slate-400 animate-pulse"
              }`} />
              <span className="hidden sm:inline">
                {sbStatus === "connected" ? "Supabase" : sbStatus === "error" ? "DB offline" : "DB..."}
              </span>
            </div>

            {/* Demo badge */}
            {isDemo && (
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Demo
              </div>
            )}

            {/* Avatar + name */}
            <button
              onClick={() => setShowProfil(true)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors">
              {profilPhoto ? (
                <img src={profilPhoto} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white ${ROLE_COLORS[user.role]}`}>
                  {user.name[0]?.toUpperCase()}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-700 leading-none">{user.name}</p>
                <p className="text-[10px] text-slate-400">{ROLE_LABELS[user.role]}</p>
              </div>
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Deconnexion
            </button>
          </div>
        </header>

        {/* Demo banner */}
        {isDemo && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs shrink-0">
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              <strong>Compte Demo</strong> — Modifications sauvegardees localement uniquement.{" "}
              <span className="opacity-60">حساب تجريبي — التعديلات محلية فقط</span>
            </span>
          </div>
        )}

        {/* ── Tab pill row — quick access ── */}
        <div className="flex items-center gap-1.5 px-4 lg:px-5 py-2 border-b border-slate-200 bg-slate-50 overflow-x-auto shrink-0 no-scrollbar">
          <TabPill id="dashboard" activeTab={activeTab} navigate={navigate} label="Dashboard" />
          {NAV_GROUPS.flatMap(g => g.items.filter(isVisible)).map(item => (
            <TabPill key={item.id} id={item.id} activeTab={activeTab} navigate={navigate} label={item.label} />
          ))}
        </div>

        {/* ── Content ────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="p-4 lg:p-6 min-h-full">
            <PanelErrorBoundary key={activeTab} label={allItems.find(i => i.id === activeTab)?.label ?? activeTab}>
              {PANELS[activeTab]?.(user) ?? (
                <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
                  Section non disponible
                </div>
              )}
            </PanelErrorBoundary>
          </div>
        </main>

        {/* ── Footer ─────────────────────────────────────── */}
        <footer className="shrink-0 border-t border-slate-200 bg-white px-6 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            &copy; 2026{" "}
            <span className="font-black text-slate-700">FRESH<span className="text-green-600">LINK</span> PRO</span>
            {" "}— By <span className="font-bold text-blue-600">Jawad</span>
          </p>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            جميع الحقوق محفوظة
          </p>
        </footer>
      </div>

      {/* ── Profil modal ──────────────────────────────────── */}
      {showProfil && (
        <ProfilModal
          user={user}
          profilPhoto={profilPhoto}
          setProfilPhoto={setProfilPhoto}
          onClose={() => setShowProfil(false)}
          canUseCamera={isStrictSuperAdmin}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SIDEBAR CONTENT COMPONENT — extracted to avoid remount on every render
// ─────────────────────────────────────────────────────────────

interface SidebarContentProps {
  user: User
  activeTab: Tab
  sidebarCollapsed: boolean
  setSidebarCollapsed: (v: boolean) => void
  profilPhoto: string
  navSearch: string
  setNavSearch: (v: string) => void
  filteredGroups: Array<{ label: string; labelAr: string; items: NavItem[] }>
  searchQ: string
  GROUP_ICON_COLOR: Record<string, string>
  navigate: (t: Tab) => void
  onLogout: () => void
  onOpenProfil: () => void
}

function SidebarContent({
  user, activeTab, sidebarCollapsed, setSidebarCollapsed,
  profilPhoto, navSearch, setNavSearch, filteredGroups, searchQ,
  GROUP_ICON_COLOR, navigate, onLogout, onOpenProfil
}: SidebarContentProps) {
  return (
    <aside className="flex flex-col h-full bg-white border-r border-slate-200">

      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-slate-200 ${sidebarCollapsed ? "justify-center px-2" : ""}`}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: "#1B4332" }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path d="M12 3 C12 3 19 7 19 13 C19 17.4 16 20 12 20 C8 20 5 17.4 5 13 C5 7 12 3 12 3Z" fill="#4ADE80" opacity="0.9" />
            <path d="M12 20 L12 9" stroke="#1B4332" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M12 15 L15 12" stroke="#1B4332" strokeWidth="1.1" strokeLinecap="round" />
            <path d="M12 17.5 L9 15" stroke="#1B4332" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="font-black text-sm leading-tight truncate">
              <span className="text-slate-800">FRESH</span><span className="text-green-600">LINK</span>{" "}
              <span className="text-[9px] font-black tracking-widest text-green-700 uppercase">PRO</span>
            </p>
            <p className="text-[10px] text-slate-400 font-medium truncate">Distribution &amp; Logistique</p>
          </div>
        )}
      </div>

      {/* Dashboard shortcut */}
      <div className={`px-2 pt-3 pb-1 ${sidebarCollapsed ? "px-2" : "px-3"}`}>
        <button
          onClick={() => navigate("dashboard")}
          title={sidebarCollapsed ? "Tableau de bord" : undefined}
          className={[
            "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 group",
            sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2.5",
            activeTab === "dashboard"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-800",
          ].join(" ")}
        >
          <svg className={`w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:scale-110 ${activeTab === "dashboard" ? "text-white" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          {!sidebarCollapsed && (
            <span className="flex-1 text-left">Tableau de bord</span>
          )}
        </button>
      </div>

      {/* Search bar */}
      {!sidebarCollapsed && (
        <div className="px-3 py-2 border-b border-slate-200">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={navSearch}
              onChange={e => setNavSearch(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border border-slate-200 text-slate-700 placeholder-slate-400 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
            />
            {navSearch && (
              <button onClick={() => setNavSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2 thin-scroll">
        {!sidebarCollapsed && searchQ && (
          <p className="px-3 py-1 text-[10px] text-slate-400">
            {filteredGroups.flatMap(g => g.items).length} resultat(s) pour &quot;{navSearch}&quot;
          </p>
        )}
        {filteredGroups.map(group => {
          const iconColor = GROUP_ICON_COLOR[group.label] ?? "text-slate-500"
          return (
            <div key={group.label} className="mb-1">
              {/* Group label */}
              {!sidebarCollapsed && !searchQ && (
                <div className="flex items-center gap-2 px-3 py-1.5 mb-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-slate-200" />
                </div>
              )}
              {/* Items */}
              {group.items.map(item => {
                const isActive = activeTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => { navigate(item.id); setNavSearch("") }}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={[
                      "w-full flex items-center gap-3 rounded-xl text-sm transition-all duration-150 group mb-0.5",
                      sidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2",
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-800 font-medium",
                    ].join(" ")}
                  >
                    <span className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? "text-white" : iconColor}`}>
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="flex-1 truncate text-left text-[13px]">{item.label}</span>
                        {item.badge ? (
                          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-600 text-white">
                            {item.badge}
                          </span>
                        ) : isActive ? (
                          <svg className="w-3.5 h-3.5 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        ) : null}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
        {/* Empty search state */}
        {searchQ && filteredGroups.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs">Aucun resultat</p>
          </div>
        )}
      </nav>

      {/* Collapse toggle — desktop only */}
      <div className="px-2 py-2 border-t border-slate-200 hidden lg:block">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all text-xs"
        >
          <svg className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!sidebarCollapsed && <span>Reduire</span>}
        </button>
      </div>

      {/* User footer */}
      <div className="px-2 py-3 border-t border-slate-200">
        <button
          onClick={onOpenProfil}
          className={`w-full flex items-center gap-2.5 rounded-xl hover:bg-slate-100 transition-colors text-left ${sidebarCollapsed ? "justify-center p-2" : "px-2 py-2"}`}
        >
          {profilPhoto ? (
            <img src={profilPhoto} alt={user.name}
              className="w-8 h-8 rounded-full object-cover border-2 border-slate-200 shrink-0" />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${ROLE_COLORS[user.role]}`}>
              {user.name[0]?.toUpperCase()}
            </div>
          )}
          {!sidebarCollapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-slate-700">{user.name}</p>
                <p className="text-[10px] truncate text-slate-400">{ROLE_LABELS[user.role]}</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onLogout() }}
                title="Deconnexion"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}

// ─────────────────────────────────────────────────────────────
// TAB PILL — used in the quick-access strip
// ─────────────────────────────────────────────────────────────

function TabPill({ id, activeTab, navigate, label }: {
  id: Tab; activeTab: Tab; navigate: (t: Tab) => void; label: string
}) {
  const isActive = activeTab === id
  return (
    <button
      onClick={() => navigate(id)}
      className={[
        "shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
        isActive
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200",
      ].join(" ")}
    >
      {label}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// PROFIL MODAL
// ─────────────────────────────────────────────────────────────

function ProfilModal({ user, profilPhoto, setProfilPhoto, onClose, canUseCamera }: {
  user: User
  profilPhoto: string
  setProfilPhoto: (url: string) => void
  onClose: () => void
  canUseCamera: boolean   // true only for super_admin
}) {
  const PERM_KEYS: (keyof User)[] = [
    "canViewAchat","canViewCommercial","canViewLogistique",
    "canViewStock","canViewCash","canViewFinance","canViewRecap","canViewDatabase",
  ]
  const PERM_MAP: Partial<Record<keyof User, string>> = {
    canViewAchat: "Achats", canViewCommercial: "Commercial",
    canViewLogistique: "Logistique", canViewStock: "Stock",
    canViewCash: "Cash", canViewFinance: "Finance",
    canViewRecap: "Récap", canViewDatabase: "Base données",
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-gray-900 rounded-2xl border border-gray-800 shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 text-white bg-gray-800 border-b border-gray-700">
          <h2 className="font-bold text-sm">Mon Profil / ملفي الشخصي</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[80vh]">

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {profilPhoto ? (
                <img src={profilPhoto} alt={user.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-primary shadow-lg" />
              ) : (
                <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white border-4 shadow-lg ${ROLE_COLORS[user.role]}`}
                  style={{ borderColor: "rgba(255,255,255,0.15)" }}>
                  {user.name[0]?.toUpperCase()}
                </div>
              )}
              {canUseCamera ? (
                <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center cursor-pointer shadow border-2 border-card hover:opacity-90 transition-opacity" title="Modifier la photo (super admin)">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <input type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = ev => {
                        const url = ev.target?.result as string
                        setProfilPhoto(url)
                        const users = store.getUsers()
                        const idx = users.findIndex(u => u.id === user.id)
                        if (idx >= 0) { users[idx] = { ...users[idx], photoUrl: url }; store.saveUsers(users) }
                      }
                      reader.readAsDataURL(file)
                    }} />
                </label>
              ) : (
                <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center" title="Camera/micro: super admin uniquement">
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{user.name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-muted/40 border border-border p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Role</p>
              <span className={`text-xs font-bold px-2 py-1 rounded-full text-white inline-block ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <div className="rounded-xl bg-muted/40 border border-border p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Accès</p>
              <p className="text-sm font-semibold text-foreground capitalize">{user.accessType ?? "standard"}</p>
            </div>
            {user.secteur && (
              <div className="col-span-2 rounded-xl bg-muted/40 border border-border p-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Secteur</p>
                <p className="text-sm font-semibold text-foreground">{user.secteur}</p>
              </div>
            )}
            <div className="col-span-2 rounded-xl bg-muted/40 border border-border p-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">ID</p>
              <p className="text-xs font-mono text-muted-foreground">{user.id}</p>
            </div>
          </div>

          {/* Permissions */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Permissions</p>
            <div className="flex flex-wrap gap-1.5">
              {PERM_KEYS.filter(k => user[k]).map(k => (
                <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold border border-primary/20">
                  {PERM_MAP[k]}
                </span>
              ))}
              {PERM_KEYS.filter(k => user[k]).length === 0 && (
                <span className="text-xs text-muted-foreground">Aucune permission spécifique</span>
              )}
            </div>
          </div>

          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
