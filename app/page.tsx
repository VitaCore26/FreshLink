"use client"

import { useState, useEffect } from "react"
import { store, type User, getUserInterface } from "@/lib/store"
import { useAuth } from "@/hooks/useAuth"
import { signInWithEmailFallback } from "@/lib/auth/supabaseAuth"
import dynamic from "next/dynamic"

// All heavy components loaded dynamically — never crash the initial bundle
const LoginPage = dynamic(() => import("@/components/auth/LoginPage"), { ssr: false })
const MobileLayout = dynamic(() => import("@/components/mobile/MobileLayout"), { ssr: false })
const BackOfficeLayout = dynamic(() => import("@/components/backoffice/BackOfficeLayout"), { ssr: false })
const PortailFournisseur = dynamic(() => import("@/components/portail/PortailFournisseur"), { ssr: false })
const PortailClient = dynamic(() => import("@/components/portail/PortailClient"), { ssr: false })
const SecurityGuard = dynamic(() => import("@/components/SecurityGuard"), { ssr: false })

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm font-sans">Chargement...</p>
      </div>
    </div>
  )
}

export default function App() {
  // Utiliser le hook useAuth pour gérer la session Supabase
  const { user, loading, error: authError, signOut } = useAuth()

  const [view, setView] = useState<"mobile" | "backoffice">("backoffice")
  const [error, setError] = useState<string | null>(authError || null)
  const [pendingUser, setPendingUser] = useState<User | null>(null)

  useEffect(() => {
    setError(authError)
  }, [authError])

  useEffect(() => {
    if (user) {
      const iface = getUserInterface(user)
      setView(iface === "mobile" ? "mobile" : "backoffice")
    }
  }, [user])

  const handleLogin = (loggedUser: User, forceView?: "mobile" | "backoffice") => {
    try {
      // Garder la session locale aussi (pour offline cache)
      store.setSession(loggedUser)

      if (forceView) {
        setView(forceView)
      } else {
        const iface = getUserInterface(loggedUser)
        setView(iface === "mobile" ? "mobile" : "backoffice")
      }

      // Note: user sera automatiquement mis à jour par useAuth (via Supabase)
    } catch (e: unknown) {
      console.error("[App] Login error:", e)
      setError(e instanceof Error ? e.message : "Erreur de connexion")
    }
  }

  const handleLogout = async () => {
    try {
      store.logout()
      await signOut()
    } catch (e) {
      console.error("[App] Logout error:", e)
    }
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 space-y-4 shadow-lg">
          <p className="text-lg font-bold text-foreground">Erreur de demarrage</p>
          <p className="text-sm font-mono text-red-600 bg-red-50 rounded-xl p-3 break-all">{error}</p>
          <div className="space-y-2">
            <button
              onClick={() => {
                try {
                  localStorage.clear()
                  sessionStorage.clear()
                  indexedDB.databases?.().then(dbs => dbs.forEach(db => indexedDB.deleteDatabase(db.name)))
                } catch(_){}
                window.location.href = "/"
              }}
              className="w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: "var(--primary)" }}>
              🔄 Réinitialiser complètement
            </button>
            <button
              onClick={() => window.location.href = "/"}
              className="w-full py-3 rounded-xl font-bold text-gray-700 text-sm bg-gray-200">
              ↻ Recharger simplement
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Loading
  if (loading) return <Spinner />

  // Not logged in
  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  // Interface picker pour utilisateurs "both"
  if (pendingUser) {
    const iface = getUserInterface(pendingUser)
    if (iface === "both") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 font-sans">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 shadow-lg p-8 flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="text-center">
                <p className="text-base font-bold text-slate-800">Bonjour, {pendingUser.name}</p>
                <p className="text-sm text-slate-500 mt-0.5">Choisissez votre interface</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  handleLogin(pendingUser, "backoffice")
                  setPendingUser(null)
                }}
                className="w-full px-4 py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                Back Office — Bureau
              </button>
              <button
                onClick={() => {
                  handleLogin(pendingUser, "mobile")
                  setPendingUser(null)
                }}
                className="w-full px-4 py-3.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 transition-colors"
              >
                Application Mobile — Terrain
              </button>
              <button
                onClick={() => setPendingUser(null)}
                className="text-sm text-slate-400 hover:text-slate-600 transition-colors text-center py-1"
              >
                Retour
              </button>
            </div>
          </div>
        </div>
      )
    }
    // Si pas "both", assumer que "both" veut dire on choisit pour lui
    handleLogin(pendingUser, "backoffice")
    setPendingUser(null)
  }

  // Portal routes
  if (user.role === "fournisseur") {
    return <PortailFournisseur user={user} onLogout={handleLogout} />
  }
  if (user.role === "client") {
    return <PortailClient user={user} onLogout={handleLogout} />
  }

  const iface = getUserInterface(user)

  // Switcher button for users with both interfaces
  const bothSwitcher = iface === "both" ? (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setView(v => v === "backoffice" ? "mobile" : "backoffice")}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-white text-xs font-bold"
        style={{ background: "oklch(0.38 0.2 260)" }}>
        {view === "backoffice" ? "Vue Mobile" : "Vue Back-office"}
      </button>
    </div>
  ) : null

  // Mobile
  if (iface === "mobile" || (iface === "both" && view === "mobile")) {
    const isSuperAdmin = user.role === "super_admin"
    const isDemoAccount = user.name.toLowerCase().startsWith("demo")
    const needsGuard = !isSuperAdmin && !isDemoAccount && user.requireCameraAuth === true
    const content = <MobileLayout user={user} onLogout={handleLogout} />
    return (
      <>
        {needsGuard ? <SecurityGuard skipGps={false}>{content}</SecurityGuard> : content}
        {bothSwitcher}
      </>
    )
  }

  // Back-office
  return (
    <>
      <BackOfficeLayout user={user} onLogout={handleLogout} />
      {bothSwitcher}
    </>
  )
}
