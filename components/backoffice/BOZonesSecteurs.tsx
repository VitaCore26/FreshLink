"use client"

import { useState, useEffect } from "react"
import { store, type User, type Client } from "@/lib/store"
import { loadZonesConfig, saveZonesConfig, resolveAffectation, TEAM_LEADS, type ZonesConfig, type ZoneCfg } from "@/lib/commercial/zones"

export default function BOZonesSecteurs({ user }: { user: User }) {
  const [cfg, setCfg]       = useState<ZonesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [applying, setApplying] = useState(false)
  const [msg, setMsg]         = useState<{ ok: boolean; text: string } | null>(null)
  const [newSecteur, setNewSecteur] = useState<Record<string, string>>({})

  const canEdit = ["super_super_admin", "super_admin", "admin", "resp_commercial"].includes(user.role)

  // Prévendeurs disponibles pour l'affectation
  const prevendeurs = store.getUsers().filter(u =>
    u.actif !== false && (u.role === "prevendeur" || (u.roles?.includes("prevendeur") ?? false)))

  useEffect(() => { loadZonesConfig().then(c => { setCfg(c); setLoading(false) }) }, [])

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000) }

  const update = (fn: (c: ZonesConfig) => ZonesConfig) => setCfg(c => (c ? fn(structuredClone(c)) : c))

  const setLabel = (zid: string, label: string) =>
    update(c => { const z = c.zones.find(x => x.id === zid); if (z) z.label = label; return c })

  const setLead = (zid: string, teamLeadId: string) =>
    update(c => { const z = c.zones.find(x => x.id === zid); if (z) z.teamLeadId = teamLeadId; return c })

  const addSecteur = (zid: string) => {
    const name = (newSecteur[zid] || "").trim()
    if (!name) return
    update(c => {
      // Un secteur ne peut exister que dans UNE seule zone.
      if (c.zones.some(z => z.secteurs.includes(name))) { flash(false, `« ${name} » existe déjà dans une zone.`); return c }
      const z = c.zones.find(x => x.id === zid); if (z) z.secteurs.push(name)
      return c
    })
    setNewSecteur(s => ({ ...s, [zid]: "" }))
  }

  const removeSecteur = (zid: string, secteur: string) =>
    update(c => {
      const z = c.zones.find(x => x.id === zid); if (z) z.secteurs = z.secteurs.filter(s => s !== secteur)
      delete c.secteurPrevendeur[secteur]   // libère l'affectation
      return c
    })

  // Affecte LE prévendeur d'un secteur (1 seul possible → la map garantit l'unicité).
  const setPrevendeur = (secteur: string, prevId: string) =>
    update(c => { if (prevId) c.secteurPrevendeur[secteur] = prevId; else delete c.secteurPrevendeur[secteur]; return c })

  const save = async () => {
    if (!cfg) return
    setSaving(true)
    const ok = await saveZonesConfig(cfg)
    setSaving(false)
    flash(ok, ok ? "✅ Zones & secteurs enregistrés." : "Erreur lors de l'enregistrement.")
  }

  // Applique la config à TOUS les clients : chaque client est rattaché au prévendeur
  // de SON secteur (+ sa zone) → le prévendeur voit aussitôt ses clients sur mobile.
  const appliquerAuxClients = async () => {
    if (!cfg) return
    setApplying(true)
    await saveZonesConfig(cfg)                       // s'assure que la config est sauvée d'abord
    const changed: Client[] = []
    const updated = store.getClients().map(c => {
      if (!c.secteur) return c
      const aff = resolveAffectation(cfg, c.secteur)
      if (aff.prevendeurId && c.prevendeurId !== aff.prevendeurId) {
        const nc = { ...c, prevendeurId: aff.prevendeurId, zone: aff.zoneId ?? c.zone }
        changed.push(nc); return nc
      }
      return c
    })
    if (changed.length) {
      store.saveClients(updated)
      const { upsertClient } = await import("@/lib/supabase/db")
      for (const c of changed) { try { await upsertClient(c) } catch { /* sync best-effort */ } }
    }
    setApplying(false)
    flash(true, `✅ ${changed.length} client(s) rattaché(s) à leur prévendeur selon le secteur.`)
  }

  if (loading || !cfg) return <div className="p-8 text-center text-sm text-muted-foreground">Chargement des zones…</div>
  if (!canEdit) return <div className="p-8 text-center text-sm text-muted-foreground">🔒 Réservé aux responsables.</div>

  // Nb de secteurs par prévendeur (info : un prévendeur peut couvrir plusieurs secteurs)
  const countByPrev: Record<string, number> = {}
  Object.values(cfg.secteurPrevendeur).forEach(id => { countByPrev[id] = (countByPrev[id] || 0) + 1 })

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground flex items-center gap-2">🗺️ Zones &amp; Secteurs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Programmez les secteurs de chaque zone, le Team Lead, et le prévendeur (1 par secteur).</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={appliquerAuxClients} disabled={applying || saving}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50"
            title="Rattache chaque client au prévendeur de son secteur">
            {applying ? "…" : "👥 Appliquer aux clients"}
          </button>
          <button onClick={save} disabled={saving || applying}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50">
            {saving ? "…" : "💾 Enregistrer"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${msg.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {cfg.zones.map((z: ZoneCfg) => (
          <div key={z.id} className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            {/* En-tête zone : label + team lead */}
            <div className="flex flex-col gap-2">
              <input value={z.label} onChange={e => setLabel(z.id, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm font-bold" />
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                👤 Team Lead :
                <select value={z.teamLeadId} onChange={e => setLead(z.id, e.target.value)}
                  className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-sm">
                  {TEAM_LEADS.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                </select>
              </label>
            </div>

            {/* Secteurs de la zone */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Secteurs ({z.secteurs.length})</p>
              {z.secteurs.length === 0 && <p className="text-xs text-muted-foreground italic">Aucun secteur. Ajoutez-en ci-dessous.</p>}
              {z.secteurs.map(secteur => (
                <div key={secteur} className="rounded-lg border border-border p-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate">📍 {secteur}</span>
                    <button onClick={() => removeSecteur(z.id, secteur)} className="text-xs text-red-500 hover:text-red-700">✕</button>
                  </div>
                  <select value={cfg.secteurPrevendeur[secteur] ?? ""} onChange={e => setPrevendeur(secteur, e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs">
                    <option value="">— Prévendeur —</option>
                    {prevendeurs.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{countByPrev[p.id] ? ` (${countByPrev[p.id]} secteur${countByPrev[p.id] > 1 ? "s" : ""})` : ""}</option>
                    ))}
                  </select>
                </div>
              ))}

              {/* Ajout d'un secteur */}
              <div className="flex gap-1.5 mt-1">
                <input
                  value={newSecteur[z.id] || ""}
                  onChange={e => setNewSecteur(s => ({ ...s, [z.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") addSecteur(z.id) }}
                  placeholder="Nouveau secteur…"
                  className="flex-1 px-2 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs min-w-0" />
                <button onClick={() => addSecteur(z.id)} className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold whitespace-nowrap">＋</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground">
        Règle : un secteur n&apos;appartient qu&apos;à une zone et n&apos;a qu&apos;un seul prévendeur ; un prévendeur peut couvrir plusieurs secteurs.
        À l&apos;inscription / commande, le client est rattaché automatiquement à son secteur → prévendeur → Team Lead → zone.
      </p>
    </div>
  )
}
