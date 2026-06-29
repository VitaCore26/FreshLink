// Helper d'écriture ERP via l'API serveur authentifiée (cookie device HMAC),
// en remplacement des écritures Supabase directes (clé anon) — cf. durcissement
// RLS C1 Phase 1. Les lectures/realtime peuvent rester en anon (SELECT-only),
// mais les écritures passent désormais toujours par le serveur (service_role).

const BASE =
  typeof window !== "undefined" ? window.location.origin : ""

export interface ErpWriteResult {
  ok: boolean
  error?: string
}

export async function erpWrite(
  table: string,
  id: string,
  patch: Record<string, unknown>,
  opts?: { upsert?: boolean },
): Promise<ErpWriteResult> {
  try {
    const res = await fetch(`${BASE}/api/ext/erp-write`, {
      method: "POST",
      credentials: "include", // indispensable : envoie le cookie fl_device_token
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id, patch, upsert: opts?.upsert ?? false }),
    })
    const json = (await res.json().catch(() => ({}))) as ErpWriteResult
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error ?? `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "réseau" }
  }
}
