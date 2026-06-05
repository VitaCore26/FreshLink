import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/auth/supabaseAuth"

/**
 * Whitelist des tables autorisées pour l'upsert
 * SECURITY: Empêche les attaques par injection de nom de table
 */
const ALLOWED_TABLES = [
  "fl_commandes",
  "fl_articles",
  "fl_clients",
  "fl_bons_achat",
  "fl_trips",
  "fl_bons_livraison",
  "fl_bons_preparation",
  "fl_stock",
  "fl_fournisseurs",
  "fl_depots",
  "fl_messages",
  "fl_motifs_retour",
] as const

/**
 * POST /api/data/upsert
 *
 * Insérer ou mettre à jour des données dans Supabase
 * Valide les permissions côté serveur avant d'insérer
 *
 * Body:
 * {
 *   "table": "fl_commandes",  // nom de la table (whitelist stricte)
 *   "data": { ... },          // les données à insérer/modifier
 *   "conflictColumn": "id"    // colonne pour le conflit (pour upsert)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier l'utilisateur
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    // 2. Parser la requête
    const { table, data, conflictColumn = "id" } = await request.json()

    if (!table || !data) {
      return NextResponse.json(
        { error: "table et data requis" },
        { status: 400 }
      )
    }

    // 3. SECURITY: Vérifier que la table est dans la whitelist
    if (!ALLOWED_TABLES.includes(table as any)) {
      console.warn(`[SECURITY] Tentative d'upsert sur table non autorisée: ${table} par user ${user.id}`)
      return NextResponse.json(
        { error: "Table non autorisée" },
        { status: 403 }
      )
    }

    // 4. Vérifier les permissions basées sur la table et le rôle
    const canInsert = checkPermission(user.role, table, "insert")
    const canUpdate = checkPermission(user.role, table, "update")

    if (!canInsert && !canUpdate) {
      return NextResponse.json(
        { error: "Permission refusée pour cette table" },
        { status: 403 }
      )
    }

    // 5. Insérer/mettre à jour les données
    const supabase = createClient()
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data, { onConflict: conflictColumn })

    if (error) {
      // Log complet côté serveur, message générique au client (évite les fuites d'info)
      console.error(`[/api/data/upsert] Erreur sur ${table}:`, error.message, error.details)
      return NextResponse.json(
        { error: "Opération échouée" },
        { status: 400 }
      )
    }

    return NextResponse.json({ data: result }, { status: 200 })
  } catch (error) {
    console.error("[/api/data/upsert] Erreur:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

/**
 * Vérifier si l'utilisateur peut faire l'opération sur la table
 * C'est une vérification basique — la vraie sécurité est en RLS Supabase
 */
function checkPermission(
  role: string,
  table: string,
  operation: "insert" | "update" | "delete"
): boolean {
  // Admin peut tout faire
  if (role === "super_admin" || role === "admin") return true

  // Permissions par table/rôle
  const permissions: Record<string, Record<string, boolean>> = {
    fl_commandes: {
      insert: ["resp_commercial", "prevendeur", "team_leader"].includes(role),
      update: ["resp_commercial", "prevendeur", "team_leader", "super_admin", "admin"].includes(role),
      delete: ["admin", "super_admin"].includes(role),
    },
    fl_articles: {
      insert: ["acheteur", "admin", "super_admin"].includes(role),
      update: ["acheteur", "admin", "super_admin"].includes(role),
      delete: ["admin", "super_admin"].includes(role),
    },
    fl_clients: {
      insert: ["resp_commercial", "prevendeur", "admin", "super_admin"].includes(role),
      update: ["resp_commercial", "prevendeur", "admin", "super_admin"].includes(role),
      delete: ["admin", "super_admin"].includes(role),
    },
    fl_bons_achat: {
      insert: ["acheteur", "admin", "super_admin"].includes(role),
      update: ["acheteur", "admin", "super_admin"].includes(role),
      delete: ["admin", "super_admin"].includes(role),
    },
    fl_trips: {
      insert: ["dispatcheur", "resp_logistique", "admin", "super_admin"].includes(role),
      update: ["dispatcheur", "resp_logistique", "admin", "super_admin"].includes(role),
      delete: ["admin", "super_admin"].includes(role),
    },
  }

  return permissions[table]?.[operation] ?? false
}
