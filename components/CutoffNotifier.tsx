"use client"

// ════════════════════════════════════════════════════════════════════════════
//  CutoffNotifier — notifie l'utilisateur sur son téléphone quand l'heure d'un
//  cut-off (action à faire) arrive, selon son rôle.
//  • Demande la permission de notification une fois.
//  • Toutes les 60 s, compare l'heure courante aux cut-offs actifs de son rôle.
//  • Déclenche une notification système (via le service worker = PWA → notif
//    téléphone) quand l'heure est atteinte, UNE seule fois par cut-off et par jour.
//  Limite connue : en foreground (app ouverte). Le vrai push en arrière-plan
//  nécessiterait Web Push (VAPID) côté serveur — non couvert ici.
// ════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react"
import { store, type User } from "@/lib/store"

const FIRE_WINDOW_MIN = 12   // déclenche si on est dans les 12 min après l'heure du cut-off

function toMin(hhmm: string): number {
  const [h, m] = String(hhmm ?? "").split(":").map(Number)
  return (h || 0) * 60 + (m || 0)
}

export default function CutoffNotifier({ user }: { user: User }) {
  const askedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !user?.role) return

    // Demande de permission (une fois)
    if (Notification.permission === "default" && !askedRef.current) {
      askedRef.current = true
      Notification.requestPermission().catch(() => {})
    }

    const dayKey = () => new Date().toISOString().slice(0, 10)
    const firedKey = (id: string) => `fl_cutoff_fired_${dayKey()}_${id}`

    async function showNotif(title: string, body: string, tag: string) {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          const reg = await navigator.serviceWorker.ready
          await reg.showNotification(title, {
            body, tag, renotify: true, icon: "/icon-192.png", badge: "/icon-192.png",
            data: { url: "/" },
          } as NotificationOptions)
          return
        }
      } catch { /* fallback ci-dessous */ }
      try { new Notification(title, { body, tag, icon: "/icon-192.png" }) } catch { /* noop */ }
    }

    const check = () => {
      if (Notification.permission !== "granted") return
      const now = new Date()
      const nowMin = now.getHours() * 60 + now.getMinutes()
      let cutoffs: ReturnType<typeof store.getCutoffs> = []
      try { cutoffs = store.getCutoffs() } catch { return }
      for (const c of cutoffs) {
        if (!c.active || !Array.isArray(c.roles) || !c.roles.includes(user.role)) continue
        const cutMin = toMin(c.time)
        const delta = nowMin - cutMin
        // Atteint l'heure (ou jusqu'à FIRE_WINDOW_MIN après) et pas déjà notifié aujourd'hui
        if (delta >= 0 && delta <= FIRE_WINDOW_MIN && !localStorage.getItem(firedKey(c.id))) {
          localStorage.setItem(firedKey(c.id), "1")
          void showNotif(`⏰ Cut-off ${c.time} — Vita Fresh`, c.message, `fl-cutoff-${c.id}`)
        }
      }
    }

    check()
    const iv = setInterval(check, 60_000)
    const onVisible = () => { if (document.visibilityState === "visible") check() }
    document.addEventListener("visibilitychange", onVisible)
    return () => { clearInterval(iv); document.removeEventListener("visibilitychange", onVisible) }
  }, [user])

  return null
}
