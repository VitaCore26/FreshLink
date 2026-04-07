"use client"

import { useState, useEffect } from "react"
import { store, type User, type Client, type Fournisseur } from "@/lib/store"

interface Props { user: User }

// Roles authorized to view external accounts
const ALLOWED_ROLES = ["super_admin", "admin", "resp_commercial", "ctrl_achat"]

export default function BOComptesExternes({ user }: Props) {
  const [tab, setTab] = useState<"clients" | "fournisseurs">("clients")
  const [clients, setClients] = useState<Client[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    setClients(store.getClients())
    setFournisseurs(store.getFournisseurs())
  }, [])

  // Access guard
  if (!ALLOWED_ROLES.includes(user.role) && !user.canViewExternal) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-5">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-bold text-foreground">Acces non autorise</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Les comptes externes (clients portail et fournisseurs) sont visibles uniquement par le <strong>Responsable Commercial</strong>, le <strong>Controleur Achat</strong> et les <strong>Administrateurs</strong>.
          </p>
          <p className="text-xs text-muted-foreground mt-2 font-mono bg-muted px-3 py-1.5 rounded-lg inline-block">
            Role: <strong>{user.role}</strong>
          </p>
        </div>
      </div>
    )
  }

  const filteredClients = clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
    (c.telephone ?? "").includes(search)
  )
  const filteredFournisseurs = fournisseurs.filter(f =>
    f.nom.toLowerCase().includes(search.toLowerCase()) ||
    (f.email ?? "").toLowerCase().includes(search.toLowerCase())
  )

  // Find linked portal user for a client/fournisseur
  const users = store.getUsers()
  const getClientPortalUser = (clientId: string) => users.find(u => u.role === "client" && u.clientId === clientId)
  const getFournisseurPortalUser = (fId: string) => users.find(u => u.role === "fournisseur" && u.fournisseurId === fId)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Comptes Externes <span className="text-muted-foreground font-normal text-base mr-1">/ الحسابات الخارجية</span>
          </h2>
          <p className="text-sm text-muted-foreground">
            Portails client et fournisseur — visible uniquement par Resp. Commercial, Ctrl Achat et Admin
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Acces restreint
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </span>
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email, telephone..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        {[
          { id: "clients" as const, label: `Clients externes (${filteredClients.length})`, labelAr: "الزبائن" },
          { id: "fournisseurs" as const, label: `Fournisseurs (${filteredFournisseurs.length})`, labelAr: "الموردون" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t.label} <span className="text-xs opacity-60 mr-1">{t.labelAr}</span>
          </button>
        ))}
      </div>

      {/* CLIENTS TAB */}
      {tab === "clients" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.14 0.03 260)", color: "oklch(0.88 0.015 245)" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Client / Compte</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Secteur / Zone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Portail</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Credit</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c, i) => {
                  const portalUser = getClientPortalUser(c.id)
                  return (
                    <tr key={c.id} style={{ borderTop: "1px solid oklch(0.87 0.012 240)", background: i % 2 === 0 ? "white" : "oklch(0.975 0.003 240)" }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{c.nom}</p>
                        {c.ice && <p className="text-[10px] text-muted-foreground font-mono">ICE: {c.ice}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold capitalize">{c.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-foreground">{c.telephone}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold">{c.secteur}</p>
                        <p className="text-xs text-muted-foreground">{c.zone}</p>
                      </td>
                      <td className="px-4 py-3">
                        {portalUser ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              Compte actif
                            </span>
                            <span className="text-[10px] text-muted-foreground">{portalUser.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pas de compte portail</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.creditAutorise ? (
                          <div>
                            <span className="text-xs font-bold text-foreground">{(c.creditSolde ?? 0).toLocaleString("fr-MA")} DH</span>
                            <p className="text-[10px] text-muted-foreground">Plafond: {(c.plafondCredit ?? 0).toLocaleString("fr-MA")} DH</p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Comptant</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredClients.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucun client trouve</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FOURNISSEURS TAB */}
      {tab === "fournisseurs" && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "oklch(0.14 0.03 260)", color: "oklch(0.88 0.015 245)" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Specialites</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Paiement</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide">Portail</th>
                </tr>
              </thead>
              <tbody>
                {filteredFournisseurs.map((f, i) => {
                  const portalUser = getFournisseurPortalUser(f.id)
                  return (
                    <tr key={f.id} style={{ borderTop: "1px solid oklch(0.87 0.012 240)", background: i % 2 === 0 ? "white" : "oklch(0.975 0.003 240)" }}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{f.nom}</p>
                        {f.ice && <p className="text-[10px] text-muted-foreground font-mono">ICE: {f.ice}</p>}
                        <p className="text-[10px] text-muted-foreground">{f.ville}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-foreground">{f.telephone}</p>
                        <p className="text-xs text-muted-foreground">{f.email}</p>
                        <p className="text-xs text-muted-foreground">{f.contact}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {f.specialites.slice(0, 3).map(s => (
                            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{s}</span>
                          ))}
                          {f.specialites.length > 3 && <span className="text-[10px] text-muted-foreground">+{f.specialites.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold capitalize">{f.modalitePaiement?.replace("_", " ") ?? "—"}</p>
                        {f.delaiPaiement && <p className="text-[10px] text-muted-foreground">{f.delaiPaiement}j</p>}
                      </td>
                      <td className="px-4 py-3">
                        {portalUser ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1 text-xs text-green-700 font-semibold">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              Compte actif
                            </span>
                            <span className="text-[10px] text-muted-foreground">{portalUser.email}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Pas de compte portail</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredFournisseurs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-sm">Aucun fournisseur trouve</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
