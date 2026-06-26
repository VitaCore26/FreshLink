// ════════════════════════════════════════════════════════════════════════════
//  Zones commerciales (Casa) · Team Leads · affectation prévendeur par secteur.
//  Config ÉDITABLE (pas codée en dur) — persistée dans fl_notices "__zones_config".
//  Contrainte cardinale : 1 secteur ⇒ 1 SEUL prévendeur ; 1 prévendeur ⇒ N secteurs
//  (garantie par la structure : secteurPrevendeur est une map secteur→prévendeur).
// ════════════════════════════════════════════════════════════════════════════

export interface ZoneCfg { id: string; label: string; teamLeadId: string; secteurs: string[] }
export interface ZonesConfig { zones: ZoneCfg[]; secteurPrevendeur: Record<string, string> }

// Team Leads codés en dur (pour l'instant) : zizi & ia.
export const TEAM_LEADS: { id: string; name: string }[] = [
  { id: "zizi", name: "Zizi" },
  { id: "ia",   name: "IA" },
]

export const DEFAULT_ZONES_CONFIG: ZonesConfig = {
  zones: [
    { id: "casaCentre", label: "Casa Centre", teamLeadId: "zizi", secteurs: [] },
    { id: "casaNord",   label: "Casa Nord",   teamLeadId: "zizi", secteurs: [] },
    { id: "casaSud",    label: "Casa Sud",    teamLeadId: "ia",   secteurs: [] },
  ],
  secteurPrevendeur: {},
}

const NOTICE_ID = "__zones_config"

export async function loadZonesConfig(): Promise<ZonesConfig> {
  try {
    const res = await fetch("/api/sync-read?table=fl_notices", { cache: "no-store" })
    const j = await res.json()
    const row = (j?.data ?? []).find((r: { id: string }) => r.id === NOTICE_ID)
    const cfg = row?.payload as ZonesConfig | undefined
    if (cfg && Array.isArray(cfg.zones) && cfg.zones.length) {
      return { zones: cfg.zones, secteurPrevendeur: cfg.secteurPrevendeur ?? {} }
    }
  } catch { /* hors ligne → défaut */ }
  return DEFAULT_ZONES_CONFIG
}

export async function saveZonesConfig(cfg: ZonesConfig): Promise<boolean> {
  try {
    const res = await fetch("/api/sync-write", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "fl_notices", upserts: [{ id: NOTICE_ID, payload: cfg, updated_at: new Date().toISOString() }] }),
    })
    const j = await res.json()
    return j.ok === true
  } catch { return false }
}

// ── Helpers de résolution (inscription / commande) ────────────────────────────
export function zoneOfSecteur(cfg: ZonesConfig, secteur: string): ZoneCfg | null {
  return cfg.zones.find(z => z.secteurs.includes(secteur)) ?? null
}
export function secteursOfPrevendeur(cfg: ZonesConfig, prevendeurId: string): string[] {
  return Object.entries(cfg.secteurPrevendeur).filter(([, id]) => id === prevendeurId).map(([s]) => s)
}
export function teamLeadName(id: string | null | undefined): string | null {
  return TEAM_LEADS.find(t => t.id === id)?.name ?? null
}

/** À l'inscription ou la commande : résout toute la chaîne commerciale d'un secteur. */
export function resolveAffectation(cfg: ZonesConfig, secteur: string) {
  const zone = zoneOfSecteur(cfg, secteur)
  return {
    secteur,
    zoneId:       zone?.id ?? null,
    zoneLabel:    zone?.label ?? null,
    teamLeadId:   zone?.teamLeadId ?? null,
    teamLeadName: zone ? teamLeadName(zone.teamLeadId) : null,
    prevendeurId: cfg.secteurPrevendeur[secteur] ?? null,
  }
}
