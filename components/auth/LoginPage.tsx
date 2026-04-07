"use client"

import { useState } from "react"
import { store, type User, type UserRole, ROLE_LABELS, getUserInterface } from "@/lib/store"
import FreshLinkLogo from "@/components/ui/FreshLinkLogo"
import { sendEmail } from "@/lib/email"

interface Props { onLogin: (user: User, forceView?: "mobile" | "backoffice") => void }

const DEMO_ACCOUNTS: {
  label: string; identifier: string; password: string; role: UserRole; note?: string; group: string
}[] = [
  { group: "Direction",   label: "Resp. Commercial",     identifier: "responsable@freshlink.ma",  password: "1234",     role: "resp_commercial", note: "Commercial + comptes externes" },
  { group: "Finance",     label: "Cash Man",              identifier: "cashman@freshlink.ma",      password: "cash2024", role: "cash_man",        note: "Caisse + encaissements" },
  { group: "Finance",     label: "Financier",             identifier: "financier@freshlink.ma",    password: "fin2024",  role: "financier",       note: "Finance + recap complet" },
  { group: "Commercial",  label: "Pre-vendeur",           identifier: "prevendeur@freshlink.ma",   password: "1234",     role: "prevendeur",      note: "Prise commandes terrain" },
  { group: "Logistique",  label: "Resp. Logistique",     identifier: "logistique@freshlink.ma",   password: "1234",     role: "resp_logistique", note: "Stock + reception + dispatch" },
  { group: "Logistique",  label: "Dispatcheur",           identifier: "dispatch@freshlink.ma",     password: "1234",     role: "dispatcheur",     note: "Affectation livreurs" },
  { group: "Logistique",  label: "Magasinier",            identifier: "magasin@freshlink.ma",      password: "1234",     role: "magasinier",      note: "Gestion stock entrepot" },
  { group: "Logistique",  label: "Acheteur",              identifier: "acheteur@freshlink.ma",     password: "1234",     role: "acheteur",        note: "Bons achat + SKU" },
  { group: "Logistique",  label: "Ctrl Achat",            identifier: "ctrl.achat@freshlink.ma",   password: "ctrl1234", role: "ctrl_achat",      note: "Controle chargement" },
  { group: "Logistique",  label: "Ctrl Prep",             identifier: "ctrl.prep@freshlink.ma",    password: "ctrl1234", role: "ctrl_prep",       note: "Controle preparation" },
  { group: "Logistique",  label: "Livreur",               identifier: "livreur@freshlink.ma",      password: "1234",     role: "livreur",         note: "Livraison + BL + retours" },
]

const DEMO_GROUPS = ["Direction", "Finance", "Commercial", "Logistique"] as const
type DemoGroup = typeof DEMO_GROUPS[number]

function generatePassword(len = 10): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#"
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

const FEATURES = [
  { icon: "M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1 1 .03 2.694-1.338 2.694H4.136c-1.368 0-2.337-1.694-1.338-2.694L4 15.3", label: "7 Agents IA metier experts" },
  { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2", label: "Commandes & BL temps reel" },
  { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", label: "Trips & tournees automatiques" },
  { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2", label: "Finance, credit & caisse" },
  { icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", label: "Dashboard & KPIs avances" },
]

const N_LEVELS = [
  { level: "N1", names: "Mustapha · Si-Mohammed", color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  { level: "N2", names: "Jawad · Zizi · Azmi · Hicham · Ashel", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  { level: "N3", names: "Admin Alert +212663898707", color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
]

export default function LoginPage({ onLogin }: Props) {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [clientMode, setClientMode] = useState(false)
  const [pendingUser, setPendingUser] = useState<User | null>(null)
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotStatus, setForgotStatus] = useState<"idle" | "sending" | "sent" | "notfound">("idle")
  const [showDemo, setShowDemo] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<DemoGroup>("Direction")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError("")
    await new Promise(r => setTimeout(r, 300))
    if (clientMode) {
      if (!identifier.trim()) { setError("Veuillez entrer votre nom"); setLoading(false); return }
      const clientUser = store.loginClient(identifier.trim())
      if (clientUser) { onLogin(clientUser) }
      else { setError("Nom non trouve. Contactez votre commercial."); setLoading(false) }
      return
    }
    if (!identifier.trim() || !password.trim()) { setError("Remplissez tous les champs"); setLoading(false); return }
    const user = store.login(identifier.trim(), password)
    if (user) {
      const iface = getUserInterface(user)
      if (iface === "both") {
        const forcedView = store.loginGetForcedView(identifier.trim(), password)
        if (forcedView) { onLogin(user, forcedView) } else { setPendingUser(user); setLoading(false) }
      } else { onLogin(user) }
    } else { setError("Identifiant ou mot de passe incorrect"); setLoading(false) }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes("@")) { setForgotStatus("notfound"); return }
    setForgotStatus("sending")
    const users = store.getUsers()
    const found = users.find(u => u.email.toLowerCase() === forgotEmail.toLowerCase().trim())
    if (!found) { setForgotStatus("notfound"); return }
    const newPwd = generatePassword()
    const idx = users.findIndex(u => u.id === found.id)
    if (idx >= 0) { users[idx] = { ...users[idx], password: newPwd }; store.saveUsers(users) }
    await sendEmail({ to_email: found.email, subject: "FreshLink Pro — Nouveau mot de passe", body: `Bonjour ${found.name},\n\nVotre nouveau mot de passe FreshLink Pro :\n  Email : ${found.email}\n  Mot de passe : ${newPwd}\n\nMerci de le changer lors de votre prochaine connexion.` })
    setForgotStatus("sent")
  }

  // ── Interface picker ─────────────────────────────────────────────────────────
  if (pendingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg p-8 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <FreshLinkLogo size={44} />
            <div className="text-center">
              <p className="text-base font-bold text-slate-800">Bonjour, {pendingUser.name}</p>
              <p className="text-sm text-slate-500 mt-0.5">Choisissez votre interface</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => onLogin(pendingUser, "backoffice")}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Back Office — Bureau
            </button>
            <button onClick={() => onLogin(pendingUser, "mobile")}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Application Mobile — Terrain
            </button>
            <button onClick={() => setPendingUser(null)}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors text-center py-1">
              Retour
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex font-sans bg-slate-50">

      {/* ── Left brand panel — desktop only ───────────────────────────────────── */}
      <div className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: "#0d2218", borderRight: "1px solid #1a3a28" }}>

        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #4ADE80 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        {/* Leaf glow top-right */}
        <div className="absolute -top-24 -right-16 w-64 h-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #4ADE80 0%, transparent 70%)" }} />
        {/* Deep glow bottom-left */}
        <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #22c55e 0%, transparent 70%)" }} />

        <div className="relative flex flex-col gap-8">
          {/* Logo */}
          <FreshLinkLogo size={44} variant="full-white" />

          {/* Headline */}
          <div>
            <h2 className="text-3xl font-black text-white leading-tight mb-3 text-balance">
              Pilotez vos flux<br/>
              <span style={{ color: "#4ADE80" }}>de bout en bout</span>
            </h2>
            <p className="text-sm leading-relaxed text-slate-400">
              Achat, vente, logistique et suivi commercial — gestion complete en temps reel pour les distributeurs de fruits et legumes.
            </p>
          </div>

          {/* Feature list */}
          <div className="flex flex-col gap-2.5">
            {FEATURES.map(feat => (
              <div key={feat.label} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{ background: "#1a3a28", borderColor: "#2d5a3d" }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="#4ADE80" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feat.icon} />
                  </svg>
                </div>
                <span className="text-sm text-slate-300">{feat.label}</span>
              </div>
            ))}
          </div>

          {/* Agents IA hierarchy */}
          <div className="rounded-2xl p-4" style={{ background: "#1a3a28", border: "1px solid #2d5a3d" }}>
            <p className="text-[10px] font-black tracking-widest uppercase text-green-400 mb-2.5">Agents IA Experts</p>
            <div className="flex flex-col gap-1.5">
              {N_LEVELS.map(l => (
                <div key={l.level} className="flex items-center gap-2.5">
                  <span className="text-[9px] font-black px-2 py-0.5 rounded text-white shrink-0"
                    style={{ background: l.color }}>{l.level}</span>
                  <span className="text-xs text-slate-400">{l.names}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          &copy; {new Date().getFullYear()} FreshLink Pro — Tous droits reserves
        </p>
      </div>

      {/* ── Right — login form ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center overflow-y-auto p-5 sm:p-8">
        <div className="w-full max-w-[420px] flex flex-col gap-5 py-6">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center">
            <FreshLinkLogo size={36} />
          </div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-black text-slate-800">Connexion</h1>
            <p className="text-sm text-slate-500 mt-1">
              {clientMode ? "Portail client — entrez votre nom" : "Email ou nom d'utilisateur"}
            </p>
          </div>

          {/* Mode switcher */}
          <div className="flex rounded-xl overflow-hidden p-1 bg-slate-100 border border-slate-200">
            <button type="button" onClick={() => { setClientMode(false); setError("") }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${!clientMode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
              Personnel / Equipe
            </button>
            <button type="button" onClick={() => { setClientMode(true); setError("") }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${clientMode ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>
              Externe / خارجي
            </button>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Identifier */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                {clientMode ? "Nom client" : "Email ou identifiant"}
              </label>
              <div className="relative">
                <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  value={identifier}
                  onChange={e => { setIdentifier(e.target.value); setError("") }}
                  placeholder={clientMode ? "Nom du client" : "Email ou identifiant"}
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            {!clientMode && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-700">Mot de passe</label>
                  <button type="button" onClick={() => { setShowForgot(true); setForgotStatus("idle") }}
                    className="text-xs text-green-600 hover:text-green-700 font-semibold transition-colors">
                    Mot de passe oublie ?
                  </button>
                </div>
                <div className="relative">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError("") }}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl text-sm border border-slate-200 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPwd
                      ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm hover:opacity-90 active:scale-[0.98]"
              style={{ background: "#16a34a" }}>
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Se connecter
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="border border-dashed border-slate-300 rounded-2xl overflow-hidden">
            <button type="button" onClick={() => setShowDemo(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Comptes de demonstration
              </span>
              <svg className={`w-4 h-4 transition-transform ${showDemo ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDemo && (
              <div className="border-t border-slate-200">
                {/* Group tabs */}
                <div className="flex border-b border-slate-100 bg-slate-50">
                  {DEMO_GROUPS.map(g => (
                    <button key={g} type="button" onClick={() => setSelectedGroup(g)}
                      className={`flex-1 py-2 text-[11px] font-bold transition-colors border-b-2 ${selectedGroup === g ? "border-green-600 text-green-700" : "border-transparent text-slate-400 hover:text-slate-600"}`}>
                      {g}
                    </button>
                  ))}
                </div>
                {/* Accounts list */}
                <div className="p-2 flex flex-col gap-1 max-h-44 overflow-y-auto">
                  {DEMO_ACCOUNTS.filter(a => a.group === selectedGroup).map(acc => (
                    <button key={acc.identifier} type="button"
                      onClick={() => {
                        setIdentifier(acc.identifier); setPassword(acc.password)
                        setClientMode(false); setError(""); setShowDemo(false)
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left border border-transparent hover:border-slate-200">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 bg-green-600">
                        {acc.label.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate">{acc.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{acc.note}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">{acc.password}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Forgot password modal */}
          {showForgot && (
            <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6 flex flex-col gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Reinitialiser le mot de passe</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Un nouveau mot de passe sera envoye par email.</p>
                </div>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => { setForgotEmail(e.target.value); setForgotStatus("idle") }}
                  placeholder="votre@email.com"
                  className="w-full px-4 py-3 rounded-xl text-sm border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 transition-all"
                />
                {forgotStatus === "notfound" && <p className="text-sm text-red-600 font-medium">Email non trouve dans le systeme.</p>}
                {forgotStatus === "sent" && <p className="text-sm text-green-700 font-medium">Nouveau mot de passe envoye par email.</p>}
                <div className="flex gap-2">
                  <button onClick={() => { setShowForgot(false); setForgotEmail(""); setForgotStatus("idle") }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    Annuler
                  </button>
                  <button onClick={handleForgotPassword} disabled={forgotStatus === "sending" || forgotStatus === "sent"}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-60">
                    {forgotStatus === "sending" ? "Envoi..." : "Envoyer"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} <span className="font-black text-slate-600">FRESHLINK PRO</span> — Jawad
          </p>
        </div>
      </div>
    </div>
  )
}
