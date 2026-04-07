"use client"

import { useState, useEffect } from "react"
import { store, type Depot, type User, DEFAULT_DEPOT } from "@/lib/store"

const EMPTY_FORM: Omit<Depot, "id"> = {
  nom: "",
  adresse: "",
  ville: "",
  actif: true,
  responsableNom: "",
  notes: "",
}

function genDepotId() {
  return "DEPOT_" + Math.random().toString(36).substring(2, 9).toUpperCase()
}

export default function BODepots({ user }: { user: User }) {
  const [depots, setDepots] = useState<Depot[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [editing, setEditing] = useState<Depot | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<Depot, "id">>(EMPTY_FORM)
  const [search, setSearch] = useState("")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const isSuperAdmin = user.role === "super_admin"

  const notify = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const refresh = () => {
    setDepots(store.getDepots())
    setUsers(store.getUsers())
  }

  useEffect(() => { refresh() }, [])

  const getUsersForDepot = (depotId: string) =>
    users.filter(u => u.depotId === depotId)

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (d: Depot) => {
    setEditing(d)
    setForm({ nom: d.nom, adresse: d.adresse ?? "", ville: d.ville ?? "", actif: d.actif, responsableNom: d.responsableNom ?? "", notes: d.notes ?? "" })
    setShowForm(true)
  }

  const handleSave = () => {
    if (!form.nom.trim()) { notify("Le nom du depot est obligatoire", "err"); return }
    setSaving(true)
    if (editing) {
      store.updateDepot(editing.id, form)
      notify("Depot mis a jour")
    } else {
      store.addDepot({ id: genDepotId(), ...form })
      notify("Depot cree")
    }
    setSaving(false)
    setShowForm(false)
    refresh()
  }

  const handleToggleActif = (d: Depot) => {
    if (d.id === DEFAULT_DEPOT.id) { notify("Le depot principal ne peut pas etre desactive", "err"); return }
    store.updateDepot(d.id, { actif: !d.actif })
    refresh()
  }

  const handleDelete = (d: Depot) => {
    if (d.id === DEFAULT_DEPOT.id) { notify("Le depot principal ne peut pas etre supprime", "err"); return }
    const assigned = getUsersForDepot(d.id)
    if (assigned.length > 0) { notify(`${assigned.length} utilisateur(s) sont affectes a ce depot. Reassignez-les d'abord.`, "err"); return }
    store.deleteDepot(d.id)
    notify("Depot supprime")
    refresh()
  }

  const filtered = depots.filter(d =>
    d.nom.toLowerCase().includes(search.toLowerCase()) ||
    (d.ville ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (d.responsableNom ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-5xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Gestion des Depots
            <span className="text-xs font-normal text-muted-foreground" dir="rtl">ادارة المستودعات</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Creez et gerez vos depots. Affectez chaque magasinier/acheteur a son depot depuis la section Utilisateurs.
          </p>
        </div>
        {isSuperAdmin && (
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Depot
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total depots",  value: depots.length,                   color: "bg-blue-50 border-blue-200 text-blue-700" },
          { label: "Actifs",        value: depots.filter(d => d.actif).length, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Inactifs",      value: depots.filter(d => !d.actif).length, color: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Utilisateurs",  value: users.filter(u => u.depotId).length, color: "bg-violet-50 border-violet-200 text-violet-700" },
        ].map(s => (
          <div key={s.label} className={`flex flex-col gap-1 px-4 py-3 rounded-xl border ${s.color}`}>
            <span className="text-2xl font-bold">{s.value}</span>
            <span className="text-xs font-medium opacity-80">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un depot..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Depot cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map(d => {
          const depotUsers = getUsersForDepot(d.id)
          const isPrincipal = d.id === DEFAULT_DEPOT.id
          return (
            <div key={d.id} className={`rounded-xl border-2 bg-card transition-all ${d.actif ? "border-border" : "border-dashed border-border/50 opacity-60"}`}>
              {/* Card header */}
              <div className="flex items-start justify-between gap-3 p-4 border-b border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${d.actif ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground truncate">{d.nom}</span>
                      {isPrincipal && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold shrink-0">Principal</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${d.actif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {d.actif ? "Actif" : "Inactif"}
                      </span>
                    </div>
                    {d.ville && <p className="text-xs text-muted-foreground">{d.ville}</p>}
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(d)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleToggleActif(d)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${d.actif ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {d.actif
                          ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        }
                      </svg>
                    </button>
                    {!isPrincipal && (
                      <button onClick={() => handleDelete(d)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col gap-3">
                {/* Info */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {d.adresse && (
                    <div className="flex items-start gap-1.5 text-muted-foreground col-span-2">
                      <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {d.adresse}
                    </div>
                  )}
                  {d.responsableNom && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {d.responsableNom}
                    </div>
                  )}
                </div>

                {/* Assigned users */}
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1.5">
                    Equipe affectee ({depotUsers.length} utilisateur{depotUsers.length !== 1 ? "s" : ""})
                  </p>
                  {depotUsers.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Aucun utilisateur affecte a ce depot</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {depotUsers.map(u => (
                        <span key={u.id} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${
                            u.role === "magasinier" ? "bg-cyan-500" :
                            u.role === "acheteur"   ? "bg-amber-500" :
                            u.role === "livreur"    ? "bg-violet-500" : "bg-slate-400"
                          }`} />
                          {u.name}
                          <span className="text-muted-foreground opacity-70 capitalize">({u.role})</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {d.notes && (
                  <p className="text-xs text-muted-foreground italic border-t border-border pt-2">{d.notes}</p>
                )}
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="sm:col-span-2 flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <svg className="w-12 h-12 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" />
            </svg>
            <p className="font-medium">Aucun depot trouve</p>
            {isSuperAdmin && <button onClick={openCreate} className="text-sm text-primary underline">Creer le premier depot</button>}
          </div>
        )}
      </div>

      {/* How-to note */}
      <div className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <p className="font-semibold mb-0.5">Comment affecter un utilisateur a un depot ?</p>
          <p className="text-xs leading-relaxed">
            Allez dans <strong>Administration &gt; Utilisateurs &amp; Roles</strong>, editez un utilisateur (magasinier, acheteur, livreur)
            et selectionnez son depot dans le champ "Depot assigne". Le magasinier ne verra alors que les bons d&apos;achat et PO destines a son depot.
          </p>
        </div>
      </div>

      {/* Create/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold text-foreground">{editing ? "Modifier le depot" : "Nouveau depot"}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col gap-4 p-5">
              {/* Nom */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Nom du depot *</label>
                <input
                  type="text" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })}
                  placeholder="ex: Depot Sud Casablanca"
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {/* Ville */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Ville</label>
                <input
                  type="text" value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })}
                  placeholder="ex: Casablanca"
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {/* Adresse */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Adresse</label>
                <input
                  type="text" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })}
                  placeholder="ex: Zone Industrielle Ain Sebaa"
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {/* Responsable */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Responsable du depot</label>
                <input
                  type="text" value={form.responsableNom} onChange={e => setForm({ ...form, responsableNom: e.target.value })}
                  placeholder="Nom du responsable"
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground">Notes</label>
                <textarea
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Notes supplementaires..."
                  className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              {/* Actif toggle */}
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => setForm({ ...form, actif: !form.actif })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${form.actif ? "bg-emerald-500" : "bg-slate-200"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.actif ? "left-5" : "left-0.5"}`} />
                </button>
                <span className="text-sm font-medium text-foreground">{form.actif ? "Depot actif" : "Depot inactif"}</span>
              </div>
            </div>
            <div className="flex gap-3 px-5 pb-5">
              <button onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? "Enregistrement..." : editing ? "Mettre a jour" : "Creer le depot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
