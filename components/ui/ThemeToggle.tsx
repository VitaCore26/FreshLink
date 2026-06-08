"use client"

import { useEffect, useState } from "react"

// Phase 9 — Dark mode toggle. Reads/writes the "vita-theme" key in localStorage,
// applies the `dark` class to <html>. Tailwind is configured with darkMode:['class'].

type Mode = "light" | "dark" | "system"
const STORAGE_KEY = "vita-theme"

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
}

function applyMode(mode: Mode) {
  if (typeof document === "undefined") return
  const isDark = mode === "dark" || (mode === "system" && systemPrefersDark())
  document.documentElement.classList.toggle("dark", isDark)
  document.documentElement.style.colorScheme = isDark ? "dark" : "light"
}

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("system")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Mode | null
      if (stored === "light" || stored === "dark" || stored === "system") {
        setMode(stored)
        applyMode(stored)
      } else {
        applyMode("system")
      }
    } catch { /* localStorage blocked */ }

    // React to system theme changes when mode === system
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      try {
        const m = (localStorage.getItem(STORAGE_KEY) as Mode | null) ?? "system"
        if (m === "system") applyMode("system")
      } catch { /* no-op */ }
    }
    mq.addEventListener?.("change", handler)
    return () => mq.removeEventListener?.("change", handler)
  }, [])

  const setAndApply = (m: Mode) => {
    setMode(m)
    applyMode(m)
    try { localStorage.setItem(STORAGE_KEY, m) } catch { /* no-op */ }
  }

  if (!mounted) {
    // Skeleton to avoid hydration flash
    return <div className={compact ? "h-8 w-8" : "h-9 w-24"} />
  }

  if (compact) {
    const isDark = document.documentElement.classList.contains("dark")
    return (
      <button
        onClick={() => setAndApply(isDark ? "light" : "dark")}
        title={isDark ? "Mode clair" : "Mode sombre"}
        aria-label="Basculer le thème"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-muted">
        {isDark ? "☀️" : "🌙"}
      </button>
    )
  }

  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl border border-border bg-card p-0.5">
      {([
        { v: "light", icon: "☀️", title: "Mode clair" },
        { v: "system", icon: "🖥", title: "Système" },
        { v: "dark", icon: "🌙", title: "Mode sombre" },
      ] as { v: Mode; icon: string; title: string }[]).map(o => (
        <button
          key={o.v}
          onClick={() => setAndApply(o.v)}
          title={o.title}
          aria-label={o.title}
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm transition-colors ${
            mode === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}>
          {o.icon}
        </button>
      ))}
    </div>
  )
}
