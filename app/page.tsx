"use client"

import { useState, useEffect } from "react"
import { store, type User, getUserInterface } from "@/lib/store"
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
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"mobile" | "backoffice">("backoffice")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const session = store.getSession()
      setUser(session)
      if (session) {
        const iface = getUserInterface(session)
        setView(iface === "mobile" ? "mobile" : "backoffice")
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleLogin = (loggedUser: User, forceView?: "mobile" | "backoffice") => {
    try {
      store.setSession(loggedUser)
      setUser(loggedUser)
      if (forceView) {
        setView(forceView)
      } else {
        const iface = getUserInterface(loggedUser)
        setView(iface === "mobile" ? "mobile" : "backoffice")
      }
    } catch (e: unknown) {
      console.error("Login error:", e)
    }
  }

  const handleLogout = () => {
    try {
      store.logout()
    } catch (_) {}
    setUser(null)
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 space-y-4 shadow-lg">
          <p className="text-lg font-bold text-foreground">Erreur de demarrage</p>
          <p className="text-sm font-mono text-red-600 bg-red-50 rounded-xl p-3 break-all">{error}</p>
          <button
            onClick={() => { try { localStorage.clear() } catch(_){} window.location.reload() }}
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: "var(--primary)" }}>
            Reinitialiser et recharger
          </button>
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
