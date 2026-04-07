"use client"

import { useState, useEffect } from "react"
import { store, type User, type BonPreparation } from "@/lib/store"

interface Props { user: User }

function StatusBadge({ s }: { s: BonPreparation["statut"] }) {
  const map = { brouillon: "bg-gray-100 text-gray-700", en_cours: "bg-amber-100 text-amber-800", valide: "bg-green-100 text-green-700" }
  const labels = { brouillon: "Brouillon", en_cours: "En cours", valide: "Validé" }
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[s]}`}>{labels[s]}</span>
}

export default function MobilePreparation({ user }: Props) {
  const [bons, setBons] = useState<BonPreparation[]>([])
  const [activeBon, setActiveBon] = useState<BonPreparation | null>(null)
  const [localQtys, setLocalQtys] = useState<Record<string, number>>({})

  useEffect(() => {
    const all = store.getBonsPreparation()
    // Livreurs and magasiniers see only in_cours or brouillon bons
    const relevant = all.filter(b => b.statut !== "valide" || b.format === "numerique")
    setBons(relevant)
  }, [])

  const refresh = () => {
    const all = store.getBonsPreparation()
    setBons(all)
    if (activeBon) {
      const updated = all.find(b => b.id === activeBon.id)
      if (updated) setActiveBon(updated)
    }
  }

  const openBon = (bon: BonPreparation) => {
    setActiveBon(bon)
    setLocalQtys(Object.fromEntries(bon.lignes.map(l => [l.articleId, l.qtePrepared || l.qteCommandee])))
  }

  const validateLigne = (articleId: string) => {
    if (!activeBon) return
    const arr = store.getBonsPreparation()
    const idx = arr.findIndex(b => b.id === activeBon.id)
    if (idx < 0) return
    const lignIdx = arr[idx].lignes.findIndex(l => l.articleId === articleId)
    if (lignIdx < 0) return
    arr[idx].lignes[lignIdx].qtePrepared = localQtys[articleId] ?? arr[idx].lignes[lignIdx].qteCommandee
    arr[idx].lignes[lignIdx].valide = true
    // auto-validate bon if all lignes done
    const allDone = arr[idx].lignes.every(l => l.valide)
    if (allDone) {
      arr[idx].statut = "valide"
      arr[idx].validatedAt = new Date().toISOString()
      arr[idx].validatedBy = user.id
    } else {
      arr[idx].statut = "en_cours"
    }
    store.saveBonsPreparation(arr)
    refresh()
  }

  const validateAll = () => {
    if (!activeBon) return
    const arr = store.getBonsPreparation()
    const idx = arr.findIndex(b => b.id === activeBon.id)
    if (idx < 0) return
    arr[idx].lignes = arr[idx].lignes.map(l => ({
      ...l,
      qtePrepared: localQtys[l.articleId] ?? l.qteCommandee,
      valide: true,
    }))
    arr[idx].statut = "valide"
    arr[idx].validatedAt = new Date().toISOString()
    arr[idx].validatedBy = user.id
    store.saveBonsPreparation(arr)
    refresh()
  }

  // ============================================================
  // ACTIVE BON VIEW
  // ============================================================
  if (activeBon) {
    const validated = activeBon.lignes.filter(l => l.valide).length
    const total = activeBon.lignes.length
    const progress = total > 0 ? Math.round((validated / total) * 100) : 0

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-3 sticky top-0 bg-background z-10">
          <button onClick={() => setActiveBon(null)}
            className="p-2 rounded-xl hover:bg-muted text-muted-foreground shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{activeBon.nom}</p>
            <p className="text-xs text-muted-foreground">{activeBon.date}</p>
          </div>
          <StatusBadge s={activeBon.statut} />
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-bold text-foreground">{validated}/{total} articles</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: progress === 100 ? "oklch(0.50 0.18 155)" : "oklch(0.60 0.16 195)"
              }} />
          </div>
        </div>

        {/* Lignes */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {activeBon.lignes.map((ligne) => (
            <div key={ligne.articleId}
              className={`rounded-2xl border p-4 transition-all ${ligne.valide ? "border-green-200 bg-green-50" : "border-border bg-card"}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${ligne.valide ? "bg-green-500" : "bg-muted"}`}>
                  {ligne.valide
                    ? <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" /></svg>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground">{ligne.articleNom}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    A préparer : <strong>{ligne.qteCommandee.toFixed(1)} {ligne.unite}</strong>
                  </p>
                  {activeBon.statut !== "valide" && !ligne.valide && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Qté préparée :</span>
                      <input
                        type="number"
                        value={localQtys[ligne.articleId] ?? ligne.qteCommandee}
                        onChange={e => setLocalQtys(prev => ({ ...prev, [ligne.articleId]: parseFloat(e.target.value) || 0 }))}
                        className="w-24 px-3 py-2 rounded-xl border border-border bg-background text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-primary"
                        min={0} step={0.5}
                      />
                      <span className="text-xs text-muted-foreground">{ligne.unite}</span>
                    </div>
                  )}
                  {ligne.valide && (
                    <p className="text-sm font-bold text-green-700">
                      Preparé : {ligne.qtePrepared.toFixed(1)} {ligne.unite}
                      {ligne.qtePrepared !== ligne.qteCommandee && (
                        <span className="text-amber-500 font-normal mr-2">
                          {" "}(ecart : {(ligne.qtePrepared - ligne.qteCommandee).toFixed(1)})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              {activeBon.statut !== "valide" && !ligne.valide && (
                <button onClick={() => validateLigne(ligne.articleId)}
                  className="w-full mt-3 py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "oklch(0.38 0.2 260)" }}>
                  Confirmer cet article
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {activeBon.statut !== "valide" && (
          <div className="px-4 py-4 border-t border-border bg-card shrink-0">
            <button onClick={validateAll}
              className="w-full py-4 rounded-2xl text-base font-bold text-white"
              style={{ background: "oklch(0.40 0.16 155)" }}>
              Valider toute la preparation ({total - validated} restants)
            </button>
          </div>
        )}

        {activeBon.statut === "valide" && (
          <div className="px-4 py-4 border-t border-green-200 bg-green-50 shrink-0 text-center">
            <p className="text-green-700 font-bold text-sm">Preparation completement validee</p>
            {activeBon.validatedAt && (
              <p className="text-xs text-green-600 mt-0.5">{new Date(activeBon.validatedAt).toLocaleString("fr-MA")}</p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // BON LIST VIEW
  // ============================================================
  const activeBons = bons.filter(b => b.format === "numerique")

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Bons de Préparation</h2>
        <p className="text-sm text-muted-foreground">Validez les quantités chargees / التحقق من الكميات</p>
      </div>

      {activeBons.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center text-muted-foreground flex flex-col items-center gap-3">
          <svg className="w-14 h-14 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
          <div>
            <p className="font-semibold">Aucun bon de preparation</p>
            <p className="text-sm mt-1">Le responsable doit créer un bon numerique depuis le back-office</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeBons.map(bon => {
            const validated = bon.lignes.filter(l => l.valide).length
            const total = bon.lignes.length
            const progress = total > 0 ? Math.round((validated / total) * 100) : 0
            return (
              <button key={bon.id} onClick={() => openBon(bon)}
                className="bg-card rounded-2xl border border-border p-4 text-left hover:shadow-sm transition-shadow w-full">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-foreground">{bon.nom}</p>
                  <StatusBadge s={bon.statut} />
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  {bon.date} — {total} articles — {bon.lignes.reduce((s, l) => s + l.qteCommandee, 0).toFixed(1)} kg
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${progress}%`,
                        background: progress === 100 ? "oklch(0.50 0.18 155)" : "oklch(0.60 0.16 195)"
                      }} />
                  </div>
                  <span className="text-xs font-bold text-foreground shrink-0">{progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {validated}/{total} articles validés
                </p>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
