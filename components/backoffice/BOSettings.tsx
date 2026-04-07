"use client"

import { useState, useEffect, useRef } from "react"
import { store, type EmailConfig, type MotifRetour, type CompanyConfig, type WorkflowConfig, type ContenantTare } from "@/lib/store"
import { saveEmailJSConfig, getEmailJSConfigPublic, testEmailJSConnection } from "@/lib/email"

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
        <p className="text-sm text-muted-foreground mt-1">Cette section est reservee aux administrateurs.</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">هذا القسم للمسؤولين فقط</p>
      </div>
    </div>
  )
}

export default function BOSettings({ user }: { user: { id: string; name: string; role: string } }) {
  // --- ALL hooks MUST come before any conditional return (Rules of Hooks) ---
  const [config, setConfig] = useState<EmailConfig>(() => store.getEmailConfig())
  const [motifs, setMotifs] = useState<MotifRetour[]>([])
  const [newMotif, setNewMotif] = useState({ label: "", labelAr: "" })
  const [saved, setSaved] = useState("")
  const [tab, setTab] = useState<"entreprise" | "workflow" | "emails" | "emailjs" | "motifs" | "contenants" | "dataguard" | "vercel">("entreprise")
  const [ejsCfg, setEjsCfg] = useState({ serviceId: "", templateId: "", publicKey: "" })
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [dgMsg, setDgMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const [company, setCompany] = useState<CompanyConfig>(() => store.getCompanyConfig())
  const [workflow, setWorkflow] = useState<WorkflowConfig>(() => store.getWorkflowConfig())
  const [contenants, setContenants] = useState<ContenantTare[]>([])
  const [contenantSaved, setContenantSaved] = useState("")

  // Access check — computed AFTER hooks
  const canAccess = user.role === "admin" || user.role === "super_admin"
  const canEditEmails = canAccess

  useEffect(() => {
    if (!canAccess) return
    setConfig(store.getEmailConfig())
    setMotifs(store.getMotifs())
    setCompany(store.getCompanyConfig())
    setWorkflow(store.getWorkflowConfig())
    setContenants(store.getContenantsConfig())
    const ejs = getEmailJSConfigPublic()
    setEjsCfg({ serviceId: ejs.serviceId, templateId: ejs.templateId, publicKey: ejs.publicKey })
  }, [canAccess])

  // Guard AFTER hooks — safe conditional render
  if (!canAccess) return <AccessDenied />

  const handleSaveConfig = () => {
    store.saveEmailConfig(config)
    setSaved("Configuration sauvegardée"); setTimeout(() => setSaved(""), 2000)
  }

  const handleAddMotif = () => {
    if (!newMotif.label.trim()) return
    const m: MotifRetour = { id: store.genId(), label: newMotif.label, labelAr: newMotif.labelAr, actif: true }
    const all = [...motifs, m]
    store.saveMotifs(all)
    setMotifs(all)
    setNewMotif({ label: "", labelAr: "" })
  }

  const toggleMotif = (id: string) => {
    const all = motifs.map(m => m.id === id ? { ...m, actif: !m.actif } : m)
    store.saveMotifs(all); setMotifs(all)
  }

  const deleteMotif = (id: string) => {
    const all = motifs.filter(m => m.id !== id)
    store.saveMotifs(all); setMotifs(all)
  }

  // DataGuard helpers
  const handleExport = () => {
    try {
      const snapshot: Record<string, unknown> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k) snapshot[k] = localStorage.getItem(k)
      }
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `freshlink-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setDgMsg({ ok: true, text: "Sauvegarde exportée avec succès." })
      setTimeout(() => setDgMsg(null), 3000)
    } catch (e) {
      setDgMsg({ ok: false, text: "Erreur lors de l'export." })
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string)
        if (typeof data !== "object" || data === null) throw new Error("Format invalide")
        Object.entries(data).forEach(([k, v]) => {
          if (typeof v === "string") localStorage.setItem(k, v)
        })
        setDgMsg({ ok: true, text: "Données restaurées. Rechargez la page pour voir les changements." })
        setTimeout(() => setDgMsg(null), 5000)
      } catch {
        setDgMsg({ ok: false, text: "Fichier invalide. Vérifiez le format JSON." })
        setTimeout(() => setDgMsg(null), 4000)
      }
    }
    reader.readAsText(file)
    // reset input
    if (importRef.current) importRef.current.value = ""
  }

  const handleClearAll = () => {
    localStorage.clear()
    setShowClearConfirm(false)
    setDgMsg({ ok: true, text: "Toutes les données ont été effacées. Rechargez la page." })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCompany(c => ({ ...c, logo: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  const TABS = [
    { id: "entreprise" as const, label: "Entreprise", labelAr: "معلومات الشركة" },
    { id: "workflow" as const,   label: "Validation commandes", labelAr: "الموافقة على الطلبيات" },
    { id: "emails" as const,     label: "Emails & Notifications", labelAr: "البريد الإلكتروني" },
    { id: "emailjs" as const,    label: "EmailJS (SMTP)", labelAr: "إعداد البريد" },
    { id: "motifs" as const,     label: "Motifs retour", labelAr: "أسباب الإرجاع" },
    { id: "contenants" as const, label: "Poids contenants", labelAr: "أوزان الحاويات" },
    { id: "dataguard" as const,  label: "DataGuard", labelAr: "حماية البيانات" },
{ id: "vercel" as const,     label: "Deploiement Vercel", labelAr: "النشر على Vercel" },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-foreground">Paramètres <span className="text-muted-foreground font-normal text-base mr-1">/ الإعدادات</span></h2>
        <p className="text-sm text-muted-foreground">Configuration des emails, motifs retour et workflows</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {saved}
        </div>
      )}

      <div className="flex gap-1 p-1 rounded-xl bg-muted overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* === ENTREPRISE === */}
      {tab === "entreprise" && (
        <div className="flex flex-col gap-5">

          {/* Logo + preview */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-sm">Logo & En-tête / الشعار والترويسة</h3>
            <div className="flex items-start gap-6 flex-wrap">
              <div className="flex flex-col items-center gap-3">
                <div className="w-32 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted overflow-hidden">
                  {company.logo
                    ? <img src={company.logo} alt="Logo" className="w-full h-full object-contain" />
                    : <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  }
                </div>
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <button onClick={() => logoRef.current?.click()}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
                  {company.logo ? "Changer le logo" : "Importer le logo"}
                </button>
                {company.logo && (
                  <button onClick={() => setCompany(c => ({ ...c, logo: undefined }))}
                    className="text-xs text-red-600 hover:underline">Supprimer</button>
                )}
              </div>
              {/* Apercu entete BL */}
              <div className="flex-1 min-w-48">
                <p className="text-xs text-muted-foreground mb-2">Apercu en-tête (BL / Facture)</p>
                <div className="rounded-xl border border-border p-3 text-xs" style={{ borderTopColor: company.couleurEntete, borderTopWidth: 4 }}>
                  <div className="flex items-center gap-3">
                    {company.logo && <img src={company.logo} alt="Logo" className="h-10 object-contain" />}
                    <div>
                      <p className="font-bold text-sm text-foreground">{company.nom || "Nom entreprise"}</p>
                      <p className="text-muted-foreground">{company.adresse}{company.ville ? `, ${company.ville}` : ""}</p>
                      <p className="text-muted-foreground">{company.telephone} — {company.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold">Couleur de l&apos;en-tête</label>
              <div className="flex items-center gap-3">
                <input type="color" value={company.couleurEntete || "#1e3a5f"}
                  onChange={e => setCompany(c => ({ ...c, couleurEntete: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <span className="text-xs font-mono text-muted-foreground">{company.couleurEntete || "#1e3a5f"}</span>
              </div>
            </div>
          </div>

          {/* Informations générales */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-sm">Informations générales / المعلومات العامة</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                { f: "nom", label: "Raison sociale / الاسم التجاري", placeholder: "FreshLink Maroc" },
                { f: "telephone", label: "Téléphone", placeholder: "0522 000 000" },
                { f: "email", label: "Email", placeholder: "contact@freshlink.ma" },
                { f: "siteWeb", label: "Site web (optionnel)", placeholder: "www.freshlink.ma" },
              ].map(({ f, label, placeholder }) => (
                <div key={f} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">{label}</label>
                  <input type="text" value={(company as Record<string,string>)[f] || ""}
                    onChange={e => setCompany(c => ({ ...c, [f]: e.target.value }))}
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={placeholder} />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Adresse</label>
                <input type="text" value={company.adresse || ""}
                  onChange={e => setCompany(c => ({ ...c, adresse: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Bd Anfa, Quartier Gauthier" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Ville / المدينة</label>
                <input type="text" value={company.ville || "Casablanca"}
                  onChange={e => setCompany(c => ({ ...c, ville: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Casablanca" />
              </div>
            </div>
          </div>

          {/* Données fiscales Maroc */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-sm">Données fiscales Maroc / البيانات الجبائية</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { f: "ice", label: "ICE (20 chiffres)", placeholder: "00000000000000000000" },
                { f: "rc", label: "RC (Registre de commerce)", placeholder: "123456" },
                { f: "if_fiscal", label: "IF (Identifiant fiscal)", placeholder: "12345678" },
                { f: "tp", label: "TP (Taxe professionnelle)", placeholder: "12345678" },
                { f: "cnss", label: "CNSS", placeholder: "1234567" },
              ].map(({ f, label, placeholder }) => (
                <div key={f} className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-foreground">{label}</label>
                  <input type="text" value={(company as Record<string,string>)[f] || ""}
                    onChange={e => setCompany(c => ({ ...c, [f]: e.target.value }))}
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={placeholder} />
                </div>
              ))}
            </div>
          </div>

          {/* Mentions BL / Facture */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-sm">Mentions sur les documents / ملاحظات على الوثائق</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Mentions BL</label>
                <textarea rows={2} value={company.mentionsBL || ""}
                  onChange={e => setCompany(c => ({ ...c, mentionsBL: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Marchandises voyagent aux risques et périls du destinataire..." />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Mentions Facture</label>
                <textarea rows={2} value={company.mentionsFacture || ""}
                  onChange={e => setCompany(c => ({ ...c, mentionsFacture: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="Pénalité de retard: 1,5% par mois. Escompte si paiement avant échéance: 2%..." />
              </div>
            </div>
          </div>

          <button onClick={() => { store.saveCompanyConfig(company); setSaved("Entreprise sauvegardée"); setTimeout(() => setSaved(""), 2500) }}
            className="self-start flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "oklch(0.38 0.2 260)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Sauvegarder les informations entreprise
          </button>
        </div>
      )}

      {/* === WORKFLOW VALIDATION === */}
      {tab === "workflow" && (
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-800">
            <p className="font-bold mb-1">Workflow de validation des commandes</p>
            <p className="text-xs leading-relaxed">Définissez qui doit approuver les commandes des prévendeurs avant qu&apos;elles soient prises en compte pour la livraison.</p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-sm">Mode de validation / نمط المصادقة</h3>
            {[
              {
                v: "direct" as const,
                label: "Validation directe (automatique)",
                labelAr: "مباشر — دون موافقة",
                desc: "La commande est immédiatement validée dès la saisie par le prévendeur. Aucune approbation requise.",
                color: "border-green-300 bg-green-50",
                dot: "bg-green-500",
              },
              {
                v: "responsable" as const,
                label: "Approbation Responsable Commercial",
                labelAr: "موافقة المسؤول التجاري",
                desc: "La commande reste en attente jusqu'à l'approbation du Responsable Commercial ou d'un Admin.",
                color: "border-blue-300 bg-blue-50",
                dot: "bg-blue-500",
              },
              {
                v: "admin" as const,
                label: "Approbation Admin / Super Admin uniquement",
                labelAr: "موافقة المدير فقط",
                desc: "Seul un Admin ou Super Admin peut valider les commandes. Niveau de contrôle maximal.",
                color: "border-violet-300 bg-violet-50",
                dot: "bg-violet-600",
              },
            ].map(opt => (
              <label key={opt.v} className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${workflow.validationCommande === opt.v ? opt.color : "border-border bg-background"}`}>
                <input type="radio" name="workflow" className="hidden"
                  checked={workflow.validationCommande === opt.v}
                  onChange={() => setWorkflow({ validationCommande: opt.v })} />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${workflow.validationCommande === opt.v ? "border-transparent" : "border-border"}`}>
                  {workflow.validationCommande === opt.v && <div className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />}
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.labelAr}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Roles autorisés à approuver */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <h4 className="font-semibold text-sm mb-3">Qui peut approuver / رفض أو قبول الطلبيات</h4>
            <div className="flex flex-col gap-2 text-xs text-muted-foreground">
              {workflow.validationCommande === "direct" && (
                <p className="text-green-700 font-medium">Mode direct : aucune intervention requise. Les commandes sont automatiquement validées.</p>
              )}
              {workflow.validationCommande === "responsable" && (
                <ul className="space-y-1">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" /> Responsable Commercial</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" /> Admin</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" /> Super Admin</li>
                </ul>
              )}
              {workflow.validationCommande === "admin" && (
                <ul className="space-y-1">
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" /> Admin</li>
                  <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" /> Super Admin</li>
                </ul>
              )}
            </div>
          </div>

          <button onClick={() => { store.saveWorkflowConfig(workflow); setSaved("Workflow sauvegardé"); setTimeout(() => setSaved(""), 2500) }}
            className="self-start flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "oklch(0.38 0.2 260)" }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Sauvegarder le workflow
          </button>
        </div>
      )}

      {/* Email config */}
      {tab === "emails" && (
        <div className="flex flex-col gap-4">
          {/* Lock notice for non-admin */}
          {!canEditEmails && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>
                <strong>Acces restreint</strong> — La modification des adresses email de notification est reservee aux <strong>Admin</strong> et <strong>Super Admin</strong> uniquement.
              </span>
            </div>
          )}

          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">Adresses email de notification / عناوين الإشعار</h3>
              {canEditEmails && (
                <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5 font-semibold">Modifiable</span>
              )}
              {!canEditEmails && (
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground bg-muted border border-border rounded-full px-2.5 py-0.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Lecture seule
                </span>
              )}
            </div>
            {[
              { key: "achat" as keyof EmailConfig, label: "Email achat / الشراء", placeholder: "acheteur@freshlink.ma" },
              { key: "commercial" as keyof EmailConfig, label: "Email commercial / التجاري", placeholder: "commercial@freshlink.ma" },
              { key: "recap" as keyof EmailConfig, label: "Email recap journalier / الملخص اليومي", placeholder: "admin@freshlink.ma" },
              { key: "besoinAchat" as keyof EmailConfig, label: "Email besoin d'achat / احتياج الشراء", placeholder: "acheteur@freshlink.ma" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">{label}</label>
                {canEditEmails ? (
                  <input type="email" value={config[key] as string}
                    onChange={e => setConfig({ ...config, [key]: e.target.value })}
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={placeholder} />
                ) : (
                  <div className="px-3 py-2.5 rounded-xl border border-border bg-muted text-sm text-muted-foreground font-mono select-none">
                    {(config[key] as string) || <span className="italic text-muted-foreground/60">{placeholder}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-foreground text-sm">Envoi automatique du récap / الإرسال التلقائي</h3>
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-11 h-6 rounded-full transition-colors ${config.recapAuto ? "bg-indigo-600" : "bg-muted"}`}
                onClick={() => setConfig({ ...config, recapAuto: !config.recapAuto })}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.recapAuto ? "translate-x-6" : "translate-x-1"}`} />
              </div>
              <span className="text-sm font-medium text-foreground">Récap journalier automatique</span>
            </label>
            {config.recapAuto && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Heure d&apos;envoi</label>
                <input type="time" value={config.recapHeure} onChange={e => setConfig({ ...config, recapHeure: e.target.value })}
                  className="w-32 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-11 h-6 rounded-full transition-colors ${config.besoinAuto ? "bg-indigo-600" : "bg-muted"}`}
                onClick={() => setConfig({ ...config, besoinAuto: !config.besoinAuto })}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.besoinAuto ? "translate-x-6" : "translate-x-1"}`} />
              </div>
              <span className="text-sm font-medium text-foreground">Besoin d&apos;achat automatique (email)</span>
            </label>
            {config.besoinAuto && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Heure d&apos;envoi besoin achat</label>
                <input type="time" value={config.besoinHeure} onChange={e => setConfig({ ...config, besoinHeure: e.target.value })}
                  className="w-32 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            )}
          </div>

          {/* Besoin push mobile acheteur */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Notification besoin d&apos;achat — Acheteur mobile</h3>
              <p className="text-xs text-muted-foreground mt-1">Quand une commande est validee, le besoin par SKU est recalcule et envoye automatiquement a l&apos;acheteur sur son mobile apres le delai configure.</p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-11 h-6 rounded-full transition-colors ${config.besoinPushAuto ? "bg-blue-600" : "bg-muted"}`}
                onClick={() => canEditEmails && setConfig({ ...config, besoinPushAuto: !config.besoinPushAuto })}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.besoinPushAuto ? "translate-x-6" : "translate-x-1"}`} />
              </div>
              <div>
                <span className="text-sm font-medium text-foreground">Push automatique vers l&apos;acheteur</span>
                <p className="text-xs text-muted-foreground">Le besoin SKU apparait automatiquement sur le mobile de l&apos;acheteur</p>
              </div>
            </label>

            {config.besoinPushAuto && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">Delai avant notification sur mobile acheteur (minutes)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={480} step={5}
                    value={config.besoinDelaiMinutes ?? 0}
                    onChange={e => canEditEmails && setConfig({ ...config, besoinDelaiMinutes: Number(e.target.value) })}
                    className="flex-1 accent-blue-600"
                    disabled={!canEditEmails}
                  />
                  <input
                    type="number" min={0} max={480} step={5}
                    value={config.besoinDelaiMinutes ?? 0}
                    onChange={e => canEditEmails && setConfig({ ...config, besoinDelaiMinutes: Math.min(480, Math.max(0, Number(e.target.value))) })}
                    disabled={!canEditEmails}
                    className="w-20 px-2 py-2 rounded-xl border border-border bg-background text-center font-mono text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-muted disabled:text-muted-foreground"
                  />
                  <div className="w-20 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-2 rounded-xl text-center">
                    {config.besoinDelaiMinutes === 0
                      ? "Immediat"
                      : config.besoinDelaiMinutes < 60
                        ? `${config.besoinDelaiMinutes} min`
                        : `${Math.floor((config.besoinDelaiMinutes ?? 0) / 60)}h${(config.besoinDelaiMinutes ?? 0) % 60 > 0 ? `${(config.besoinDelaiMinutes ?? 0) % 60}min` : ""}`
                    }
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>0 — Immediat</span>
                  <span>1h</span>
                  <span>2h</span>
                  <span>4h</span>
                  <span>8h max</span>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 mt-1">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>
                    Apres validation d'une commande, le systeme attend <strong>{config.besoinDelaiMinutes === 0 ? "0 minute (immediat)" : `${config.besoinDelaiMinutes} minute(s)`}</strong> avant de mettre a jour l'onglet "Besoin par SKU" de l'acheteur. Ce delai permet de regrouper plusieurs commandes successives en un seul calcul.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card">
            <h3 className="font-semibold text-foreground text-sm">Intégration WhatsApp / واتساب</h3>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-200">
              <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              <div>
                <p className="text-sm font-semibold text-green-700">WhatsApp Business API</p>
                <p className="text-xs text-green-600 mt-0.5">Pour les workflows WhatsApp (BL, commandes, alertes), configurez votre clé API WhatsApp Business. Entrez votre numéro de groupe ou de communauté dans la section workflows.</p>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-foreground">Numéro WhatsApp Business (avec indicatif)</label>
              <input type="tel" className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="+212 600 000 000" />
            </div>
          </div>

          {canEditEmails && (
            <button onClick={handleSaveConfig}
              className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "oklch(0.38 0.2 260)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Sauvegarder la configuration
            </button>
          )}
        </div>
      )}

      {/* EmailJS config */}
      {tab === "emailjs" && (
        <div className="flex flex-col gap-4">

          {/* Guide pas-à-pas */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <p className="text-sm font-bold text-blue-800 mb-3">Guide de configuration EmailJS (5 minutes)</p>
            <ol className="text-xs text-blue-800 leading-relaxed list-decimal list-inside space-y-2">
              <li>
                Créez un compte gratuit sur{" "}
                <a href="https://www.emailjs.com" target="_blank" rel="noreferrer" className="underline font-semibold">emailjs.com</a>
              </li>
              <li>
                <strong>Email Services</strong> → Add New Service → choisissez Gmail, Outlook ou autre. Notez le <strong>Service ID</strong>.
              </li>
              <li>
                <strong>Email Templates</strong> → Create New Template. Dans le corps du template, utilisez impérativement ces variables :<br />
                <code className="bg-blue-100 rounded px-1.5 py-0.5 text-xs font-mono mt-1 inline-block">
                  {'To: {{to_email}} | Subject: {{subject}} | Body: {{message}}'}
                </code>
                <br />Notez le <strong>Template ID</strong>.
              </li>
              <li>
                <strong>Account</strong> → <strong>API Keys</strong> → copiez votre <strong>Public Key</strong>.
              </li>
              <li>Collez les 3 identifiants ci-dessous et cliquez Sauvegarder, puis testez la connexion.</li>
            </ol>
          </div>

          {/* Identifiants */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <h3 className="font-semibold text-foreground text-sm">Identifiants EmailJS / بيانات EmailJS</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Service ID</label>
                <input type="text" value={ejsCfg.serviceId}
                  onChange={e => setEjsCfg({ ...ejsCfg, serviceId: e.target.value })}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="service_xxxxxxx" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Template ID</label>
                <input type="text" value={ejsCfg.templateId}
                  onChange={e => setEjsCfg({ ...ejsCfg, templateId: e.target.value })}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="template_xxxxxxx" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Public Key (Account → API Keys)</label>
                <input type="text" value={ejsCfg.publicKey}
                  onChange={e => setEjsCfg({ ...ejsCfg, publicKey: e.target.value })}
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="XXXXXXXXXXXXXXXXXXXXXXX" />
              </div>
            </div>

            {/* Résultat test */}
            {testResult && (
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border ${
                testResult.ok
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-red-50 border-red-200 text-red-800"
              }`}>
                {testResult.ok
                  ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                }
                <span className="leading-relaxed">{testResult.msg}</span>
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  saveEmailJSConfig(ejsCfg)
                  setSaved("Configuration EmailJS sauvegardée.")
                  setTimeout(() => setSaved(""), 3000)
                  setTestResult(null)
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: "oklch(0.38 0.2 260)" }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Sauvegarder
              </button>
              <button
                disabled={testing || !ejsCfg.publicKey || !ejsCfg.serviceId || !ejsCfg.templateId}
                onClick={async () => {
                  // Sauvegarder d'abord pour que le test utilise les nouveaux identifiants
                  saveEmailJSConfig(ejsCfg)
                  setTesting(true)
                  setTestResult(null)
                  const result = await testEmailJSConnection()
                  setTesting(false)
                  setTestResult({
                    ok: result.ok,
                    msg: result.ok
                      ? "Connexion EmailJS réussie ! Les emails peuvent être envoyés."
                      : `Echec: ${result.error ?? "Vérifiez vos identifiants."}`,
                  })
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-50">
                {testing
                  ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                }
                Tester la connexion
              </button>
            </div>
          </div>

          {/* Template requis */}
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm font-semibold text-foreground mb-3">Template EmailJS requis</p>
            <p className="text-xs text-muted-foreground mb-3">
              Votre template doit contenir exactement ces 3 variables (copiez-collez dans votre template EmailJS) :
            </p>
            <pre className="text-xs font-mono bg-muted rounded-xl p-4 text-foreground leading-relaxed overflow-x-auto whitespace-pre-wrap">{`Subject: {{subject}}

To: {{to_email}}

{{message}}`}</pre>
            <p className="text-xs text-muted-foreground mt-3">
              Dans &quot;To Email&quot; du template, mettez <code className="bg-muted px-1 rounded font-mono">{"{{to_email}}"}</code> pour que chaque email soit envoyé au bon destinataire.
            </p>
          </div>

          {/* Sécurité */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/50">
            <svg className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">Sécurité & limites</p>
              Identifiants stockés uniquement dans le navigateur (localStorage). Plan gratuit EmailJS : 200 emails/mois. Pour restreindre l&apos;origine dans EmailJS : <strong>Account → API Keys → Allowed Origins</strong>.
            </div>
          </div>
        </div>
      )}

      {/* Poids Contenants */}
      {tab === "contenants" && (
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-foreground mb-1">Poids des contenants / Tares</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Ces poids sont utilises pour calculer le poids net a la reception.
              Caisse, Demi-caisse, Dolly (bois), Chariot — modifiables a tout moment.
            </p>
            <div className="flex flex-col gap-3">
              {contenants.map((c, idx) => (
                <div key={c.id} className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={c.nom}
                      onChange={e => setContenants(prev => prev.map((x, i) => i === idx ? { ...x, nom: e.target.value } : x))}
                      className="w-full text-sm font-semibold bg-transparent border-none outline-none text-foreground"
                      placeholder="Nom du contenant"
                    />
                    <input
                      type="text"
                      value={c.notes ?? ""}
                      onChange={e => setContenants(prev => prev.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))}
                      className="w-full text-[11px] bg-transparent border-none outline-none text-muted-foreground mt-0.5"
                      placeholder="Notes (optionnel)"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={c.poidsKg}
                      onChange={e => setContenants(prev => prev.map((x, i) => i === idx ? { ...x, poidsKg: Number(e.target.value) } : x))}
                      className="w-20 text-sm font-bold text-right px-2 py-1.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-muted-foreground mr-1">Actif</span>
                    <button
                      onClick={() => setContenants(prev => prev.map((x, i) => i === idx ? { ...x, actif: !x.actif } : x))}
                      className={`w-9 h-5 rounded-full transition-colors relative ${c.actif ? "bg-primary" : "bg-muted-foreground/30"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${c.actif ? "left-4" : "left-0.5"}`} />
                    </button>
                  </div>
                  <button
                    onClick={() => setContenants(prev => prev.filter((_, i) => i !== idx))}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* Add new */}
            <button
              onClick={() => setContenants(prev => [...prev, {
                id: `ct_${Date.now()}`,
                nom: "Nouveau contenant",
                poidsKg: 1.0,
                actif: true,
                notes: "",
              }])}
              className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-primary text-primary text-sm font-semibold hover:bg-primary/5 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un contenant
            </button>
          </div>

          {contenantSaved && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {contenantSaved}
            </div>
          )}

          <button
            onClick={() => {
              store.saveContenantsConfig(contenants)
              setContenantSaved("Poids des contenants sauvegardés.")
              setTimeout(() => setContenantSaved(""), 2500)
            }}
            className="self-start px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity">
            Sauvegarder les poids
          </button>
        </div>
      )}

      {/* DataGuard */}
      {tab === "dataguard" && (
        <div className="flex flex-col gap-4">

          {dgMsg && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm ${dgMsg.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
              {dgMsg.ok
                ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              }
              {dgMsg.text}
            </div>
          )}

          {/* Sauvegarde */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.05 260)" }}>
                <svg className="w-5 h-5" style={{ color: "oklch(0.38 0.2 260)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Exporter la sauvegarde / تصدير النسخ الاحتياطي</h3>
                <p className="text-xs text-muted-foreground">Téléchargez toutes les données en un fichier JSON</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cette action exporte l&apos;intégralité des données stockées dans le navigateur (commandes, bons, stocks, utilisateurs, paramètres) dans un fichier <code className="bg-muted px-1 rounded font-mono">freshlink-backup-[date].json</code>. Conservez ce fichier en lieu sûr.
            </p>
            <button onClick={handleExport}
              className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "oklch(0.38 0.2 260)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
              Exporter (.json)
            </button>
          </div>

          {/* Restauration */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.92 0.06 165)" }}>
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Importer une sauvegarde / استيراد النسخ الاحتياطي</h3>
                <p className="text-xs text-muted-foreground">Restaurez les données depuis un fichier JSON exporté</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-800">L&apos;import <strong>écrase</strong> les données actuelles. Faites d&apos;abord une sauvegarde si nécessaire.</p>
            </div>
            <input ref={importRef} type="file" accept=".json,application/json" onChange={handleImport} className="hidden" id="import-json-file" />
            <label htmlFor="import-json-file"
              className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors cursor-pointer">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Choisir un fichier .json
            </label>
          </div>

          {/* Réinitialisation */}
          <div className="bg-card rounded-2xl border border-red-200 p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-50">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-red-700 text-sm">Réinitialiser toutes les données / مسح جميع البيانات</h3>
                <p className="text-xs text-muted-foreground">Efface définitivement toutes les données du navigateur</p>
              </div>
            </div>
            {!showClearConfirm ? (
              <button onClick={() => setShowClearConfirm(true)}
                className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Effacer toutes les données
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold text-red-700">Confirmez-vous la suppression de toutes les données ?</p>
                <div className="flex gap-2">
                  <button onClick={handleClearAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors">
                    Oui, effacer tout
                  </button>
                  <button onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Guide de mise en production */}
          <div className="bg-card rounded-2xl border border-border p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "oklch(0.93 0.04 200)" }}>
                <svg className="w-5 h-5" style={{ color: "oklch(0.38 0.15 200)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Guide de passage en production / دليل النشر</h3>
                <p className="text-xs text-muted-foreground">Recommandations pour déployer FreshLink en production</p>
              </div>
            </div>
            <ol className="flex flex-col gap-3">
              {[
                {
                  n: "1",
                  title: "Exporter une sauvegarde initiale",
                  body: "Avant tout déploiement, exportez les données de démonstration via le bouton ci-dessus. Conservez le fichier JSON comme référence.",
                },
                {
                  n: "2",
                  title: "Configurer EmailJS",
                  body: "Dans l'onglet EmailJS, saisissez vos identifiants (Service ID, Template ID, Public Key) et testez la connexion.",
                },
                {
                  n: "3",
                  title: "Paramétrer les emails de notification",
                  body: "Dans l'onglet Emails, renseignez les adresses réelles (achat, commercial, récap). Activez les envois automatiques si souhaité.",
                },
                {
                  n: "4",
                  title: "Créer les utilisateurs réels",
                  body: "Dans Utilisateurs & Rôles, ajoutez les comptes de vos collaborateurs et définissez leurs rôles et permissions.",
                },
                {
                  n: "5",
                  title: "Tester en conditions réelles",
                  body: "Passez une commande test, réceptionnez-la, dispatchez-la et vérifiez les emails reçus. Validez le workflow complet.",
                },
                {
                  n: "6",
                  title: "Sauvegarde quotidienne recommandée",
                  body: "En production, exportez une sauvegarde chaque soir et stockez-la sur Google Drive, OneDrive ou un serveur sécurisé.",
                },
              ].map(step => (
                <li key={step.n} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ background: "oklch(0.38 0.2 260)" }}>{step.n}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Info localStorage */}
          <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-muted/50">
            <svg className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">Architecture de stockage actuelle</p>
              FreshLink utilise le <strong>localStorage</strong> du navigateur (~5–10 Mo). Les données sont propres à chaque appareil/navigateur. Pour une architecture multi-poste partagée, une migration vers une base de données cloud (Supabase, Firebase) est recommandée à long terme.
            </div>
          </div>
        </div>
      )}

      {/* Deploiement Vercel */}
      {tab === "vercel" && (
        <div className="flex flex-col gap-4">
          {/* Header */}
          <div className="bg-card rounded-2xl border border-border p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#000" }}>
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white"><path d="M12 2L2 19.5h20L12 2z"/></svg>
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">Deployer sur Vercel</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Suivez ces etapes pour mettre votre application FreshLink en production sur Vercel gratuitement.
              </p>
            </div>
          </div>

          {/* Steps */}
          {[
            {
              n: 1, title: "Creer un compte Vercel",
              body: "Allez sur vercel.com et cliquez \"Sign Up\". Connectez-vous avec votre compte GitHub (recommande) ou creez un compte avec votre email.",
              link: "https://vercel.com/signup", linkLabel: "vercel.com/signup",
              tip: null,
            },
            {
              n: 2, title: "Installer Vercel CLI (optionnel mais recommande)",
              body: "Ouvrez un terminal et executez la commande ci-dessous. Ensuite connectez-vous avec: vercel login",
              code: "npm install -g vercel",
              tip: null,
            },
            {
              n: 3, title: "Pousser le code sur GitHub",
              body: "Creez un nouveau depot GitHub (prive ou public) et poussez le code source de l application. Vercel se connecte automatiquement a GitHub pour les deployements automatiques.",
              code: "git init\ngit add .\ngit commit -m \"Initial commit FreshLink\"\ngit remote add origin https://github.com/VOTRE_NOM/freshlink.git\ngit push -u origin main",
              tip: null,
            },
            {
              n: 4, title: "Importer le projet dans Vercel",
              body: "Dans le dashboard Vercel, cliquez \"Add New Project\" puis importez votre depot GitHub. Vercel detecte automatiquement Next.js et configure le build.",
              link: "https://vercel.com/new", linkLabel: "vercel.com/new",
              tip: "Framework Preset: Next.js sera detecte automatiquement.",
            },
            {
              n: 5, title: "Configurer les variables d environnement",
              body: "Avant de deployer, ajoutez ces variables dans Settings > Environment Variables de votre projet Vercel :",
              envVars: [
                { key: "NEXT_PUBLIC_SUPABASE_URL", value: "https://nphrncmuxbwahqnzdyxp.supabase.co" },
                { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5waHJuY211eGJ3YWhxbnpkeXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDUyNDUsImV4cCI6MjA5MDUyMTI0NX0._4bA9RtIVMUjNgxd2ojd9_3b6vzGRddpPPbioalRsMw" },
              ],
              tip: "Ces variables sont aussi requises pour que la synchronisation Supabase fonctionne en production.",
            },
            {
              n: 6, title: "Lancer le deploiement",
              body: "Cliquez \"Deploy\" dans Vercel. Le build dure en general 1-3 minutes. Une fois termine, vous recevrez une URL du type https://freshlink-XXXXX.vercel.app",
              tip: "Chaque push sur la branche main declenchera automatiquement un nouveau deploiement.",
            },
            {
              n: 7, title: "Configurer un domaine personnalise (optionnel)",
              body: "Dans Settings > Domains de votre projet Vercel, ajoutez votre domaine. Vercel fournit les enregistrements DNS a configurer chez votre registrar.",
              tip: null,
            },
          ].map(step => (
            <div key={step.n} className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{ background: "oklch(0.38 0.2 260)" }}>
                  {step.n}
                </div>
                <h4 className="font-bold text-sm text-foreground">{step.title}</h4>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
              {"code" in step && step.code && (
                <pre className="px-4 py-3 rounded-xl text-xs font-mono overflow-x-auto"
                  style={{ background: "oklch(0.12 0.02 260)", color: "oklch(0.88 0.015 245)", border: "1px solid oklch(0.22 0.04 260)" }}>
                  {step.code}
                </pre>
              )}
              {"envVars" in step && step.envVars && (
                <div className="flex flex-col gap-2">
                  {step.envVars.map(ev => (
                    <div key={ev.key} className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl"
                      style={{ background: "oklch(0.12 0.02 260)", border: "1px solid oklch(0.22 0.04 260)" }}>
                      <span className="text-[10px] font-bold" style={{ color: "oklch(0.65 0.15 200)" }}>{ev.key}</span>
                      <span className="text-xs font-mono break-all" style={{ color: "oklch(0.85 0.015 245)" }}>{ev.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {step.tip && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-blue-50 border border-blue-200">
                  <svg className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-blue-700">{step.tip}</p>
                </div>
              )}
              {step.link && (
                <a href={step.link} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline underline-offset-2">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {step.linkLabel}
                </a>
              )}
            </div>
          ))}

          {/* Quick deploy button */}
          <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3">
            <h4 className="font-bold text-sm text-foreground">Deploiement rapide (1-clic)</h4>
            <p className="text-xs text-muted-foreground">
              Si votre code est deja sur GitHub, cliquez ce bouton pour importer directement dans Vercel.
            </p>
            <a
              href="https://vercel.com/new"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ background: "#000" }}>
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white"><path d="M12 2L2 19.5h20L12 2z"/></svg>
              Deployer sur Vercel
            </a>
          </div>
        </div>
      )}

      {/* Motifs retour */}
      {tab === "motifs" && (
        <div className="flex flex-col gap-4">
          <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-foreground text-sm">Ajouter un motif de retour / إضافة سبب إرجاع</h3>
            <div className="flex gap-2 flex-wrap">
              <input value={newMotif.label} onChange={e => setNewMotif({ ...newMotif, label: e.target.value })}
                className="flex-1 min-w-32 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Motif (Français)" />
              <input value={newMotif.labelAr} onChange={e => setNewMotif({ ...newMotif, labelAr: e.target.value })}
                dir="rtl"
                className="flex-1 min-w-32 px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="السبب (عربي)" />
              <button onClick={handleAddMotif}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0"
                style={{ background: "oklch(0.38 0.2 260)" }}>
                Ajouter
              </button>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.14 0.03 260)", color: "oklch(0.88 0.015 245)" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Motif</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide" dir="rtl">السبب</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Statut</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {motifs.map((m, i) => (
                  <tr key={m.id} style={{ borderTop: "1px solid oklch(0.87 0.012 240)", background: i % 2 === 0 ? "white" : "oklch(0.975 0.003 240)" }}>
                    <td className="px-4 py-3 font-medium text-foreground">{m.label}</td>
                    <td className="px-4 py-3 text-muted-foreground" dir="rtl">{m.labelAr}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${m.actif ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                        {m.actif ? "Actif" : "Inactif"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => toggleMotif(m.id)} className={`p-1.5 rounded-lg hover:bg-muted transition-colors ${m.actif ? "text-amber-500" : "text-green-600"}`} title={m.actif ? "Désactiver" : "Activer"}>
                          {m.actif
                            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                        </button>
                        <button onClick={() => deleteMotif(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
