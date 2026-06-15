"use client"

import { useEffect } from "react"

// Error boundary de la route : capture les crashs de rendu (panel, layout…)
// et affiche le vrai message + une récupération, au lieu d'un écran blanc
// "Application error". Le bouton de réinitialisation efface le localStorage
// (souvent la cause : une donnée locale corrompue par un sync échoué).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[ERP] Erreur de rendu:", error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-8 space-y-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-100 flex items-center justify-center text-2xl">⚠️</div>
          <p className="text-lg font-bold text-slate-800">Une erreur est survenue</p>
        </div>
        <p className="text-sm text-slate-500">
          L&apos;application a rencontré un problème d&apos;affichage. Réessayez, ou
          réinitialisez les données locales si le souci persiste.
        </p>
        <p className="text-xs font-mono text-red-600 bg-red-50 rounded-xl p-3 break-all max-h-40 overflow-auto">
          {error?.message || "Erreur inconnue"}
          {error?.digest ? `  (digest: ${error.digest})` : ""}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => reset()}
            className="w-full py-3 rounded-xl font-bold text-white text-sm bg-slate-700 hover:bg-slate-800 transition-colors">
            Réessayer
          </button>
          <button
            onClick={() => { try { localStorage.clear() } catch { /* noop */ } window.location.reload() }}
            className="w-full py-3 rounded-xl font-bold text-white text-sm bg-green-600 hover:bg-green-700 transition-colors">
            Réinitialiser les données locales et recharger
          </button>
        </div>
      </div>
    </div>
  )
}
