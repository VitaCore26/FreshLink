"use client"

import { useState, useEffect, useCallback } from "react"

// Suivi d'utilisation TURN (appels) — lit GET /api/turn (compteur mensuel estimé)
// + le quota. Le détail facturé exact reste sur le dashboard Cloudflare (Realtime).
interface TurnUsage { calls: number; seconds: number; gb: number }

export default function TurnUsageCard() {
  const [usage, setUsage] = useState<TurnUsage>({ calls: 0, seconds: 0, gb: 0 })
  const [capGb, setCapGb] = useState(1000)
  const [percent, setPercent] = useState(0)
  const [month, setMonth] = useState("")
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/turn", { cache: "no-store" })   // GET = lecture suivi
      if (r.ok) {
        const j = await r.json()
        setUsage(j.usage ?? { calls: 0, seconds: 0, gb: 0 })
        setCapGb(j.cap_gb ?? 1000)
        setPercent(j.percent ?? 0)
        setMonth(j.month ?? "")
      }
    } catch { /* hors ligne */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const hours = Math.floor(usage.seconds / 3600)
  const mins  = Math.floor((usage.seconds % 3600) / 60)
  const near  = percent >= 80

  return (
    <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="font-bold text-gray-900 text-sm flex items-center gap-2">📞 Utilisation des appels (TURN)</div>
          <p className="text-xs text-gray-500 mt-0.5">Relais Cloudflare · mois {month || "courant"} · estimation</p>
        </div>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700">
          {loading ? "…" : "🔄 Actualiser"}
        </button>
      </div>

      {/* Barre de progression du quota */}
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{
          width: `${Math.min(100, percent)}%`,
          background: near ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#22c55e,#16a34a)",
        }} />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs">
        <span className="font-bold text-gray-900">{usage.gb} Go <span className="font-normal text-gray-400">/ {capGb} Go</span></span>
        <span className={near ? "font-bold text-red-600" : "text-gray-500"}>{percent}%</span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div className="rounded-lg bg-gray-50 py-2">
          <div className="text-base font-black text-gray-900">{usage.calls}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Appels</div>
        </div>
        <div className="rounded-lg bg-gray-50 py-2">
          <div className="text-base font-black text-gray-900">{hours}h{String(mins).padStart(2, "0")}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Durée</div>
        </div>
        <div className="rounded-lg bg-gray-50 py-2">
          <div className="text-base font-black text-gray-900">{Math.max(0, capGb - usage.gb).toFixed(0)}</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wide">Go restants</div>
        </div>
      </div>

      {near && (
        <p className="mt-2 text-[11px] text-red-600">
          ⚠️ Proche du quota — au-delà de {capGb} Go, les appels basculent en STUN seul (sans relais, aucun coût).
        </p>
      )}
      <p className="mt-2 text-[11px] text-gray-400">
        Détail facturé exact : dashboard Cloudflare → Realtime → Analytics.
      </p>
    </div>
  )
}
