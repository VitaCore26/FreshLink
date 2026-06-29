import { Router } from "express";
import type { Request, Response } from "express";
import { requireDeviceApi } from "../../lib/deviceGuard.js";
import { SB_URL, SB_SERVICE_KEY, sbServiceHeaders } from "../../lib/ext/supabaseEnv.js";
import { corsMiddleware } from "../../lib/ext/cors.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /ext/erp-write — écritures ERP "à plat" (colonnes), via service_role.
//
// Objectif (C1 Phase 1) : supprimer les écritures Supabase directes faites depuis
// le navigateur avec la clé anon (qui exigeaient RLS désactivé). Ces écritures
// passent désormais par le serveur, authentifié par le cookie device (HMAC) et
// limité à une whitelist stricte (table → colonnes autorisées). Cela permet
// d'activer RLS et de révoquer toute écriture anon.
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();
router.use(corsMiddleware({ methods: "POST, OPTIONS", public: false }));

// Whitelist : aucune autre table/colonne ne peut être écrite via cette route.
const ALLOWED: Record<string, Set<string>> = {
  fl_articles: new Set([
    "statut_web", "promo_active", "promo_taux", "promo_label", "promo_fin",
    "prix_public", "criteres_qualite", "tags", "position_catalogue", "updated_at",
  ]),
  fl_prospects: new Set(["statut", "note_interne", "updated_at"]),
  fl_commandes_web: new Set(["statut", "note_interne", "updated_at"]),
  fl_documents: new Set(["piece_jointe", "piece_jointe_nom", "piece_jointe_type", "updated_at"]),
  fl_company_contacts: new Set([
    "nom_societe", "slogan", "adresse_ligne1", "adresse_ligne2", "code_postal",
    "ville", "pays", "tel_principal", "tel_secondaire", "tel_urgence",
    "whatsapp_principal", "whatsapp_commercial", "whatsapp_livraison",
    "email_principal", "email_commercial", "email_comptabilite", "email_rh",
    "instagram", "facebook", "linkedin", "tiktok", "horaires_ouverture",
    "horaires_livraison", "zone_livraison", "ice", "rc", "if_fiscal", "tp",
    "cnss", "gps_lat", "gps_lng", "logo_url", "couleur_primaire", "updated_at",
  ]),
};

router.post("/", async (req: Request, res: Response) => {
  if (requireDeviceApi(req)) {
    res.status(401).json({ ok: false, error: "Device non autorisé" });
    return;
  }
  if (!SB_SERVICE_KEY) {
    res.status(500).json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante" });
    return;
  }

  const body = (req.body ?? {}) as {
    table?: string;
    id?: string;
    patch?: Record<string, unknown>;
    upsert?: boolean;
  };
  const { table, id, patch, upsert } = body;

  if (!table || !ALLOWED[table]) {
    res.status(403).json({ ok: false, error: `Table non autorisée: ${table ?? "?"}` });
    return;
  }
  if (!id || typeof id !== "string") {
    res.status(400).json({ ok: false, error: "id requis" });
    return;
  }
  if (!patch || typeof patch !== "object") {
    res.status(400).json({ ok: false, error: "patch requis" });
    return;
  }

  // Ne garder que les colonnes autorisées (ignore silencieusement les autres).
  const allowedCols = ALLOWED[table];
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (allowedCols.has(k) && v !== undefined) clean[k] = v;
  }
  if (Object.keys(clean).length === 0) {
    res.status(400).json({ ok: false, error: "Aucune colonne autorisée dans patch" });
    return;
  }

  const idEnc = encodeURIComponent(id);
  try {
    const r = upsert
      ? await fetch(`${SB_URL}/rest/v1/${table}`, {
          method: "POST",
          headers: sbServiceHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
          body: JSON.stringify({ id, ...clean }),
        })
      : await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${idEnc}`, {
          method: "PATCH",
          headers: sbServiceHeaders({ Prefer: "return=minimal" }),
          body: JSON.stringify(clean),
        });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      res.status(502).json({ ok: false, error: `Supabase ${r.status}: ${txt.slice(0, 200)}` });
      return;
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Erreur interne" });
  }
});

export default router;
