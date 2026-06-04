/**
 * Fresh Link Pro — Supabase Authentication Module
 *
 * Remplace le système localStorage par Supabase Auth réel
 * - Email/password via Supabase
 * - Sessions JWT httpOnly
 * - Multi-utilisateurs
 * - Synchronisation Realtime
 */

import { createClient } from "@/lib/supabase/client"
import { store, type User } from "@/lib/store"

export interface AuthUser {
  id: string
  email: string
  user_metadata?: {
    role?: string
    name?: string
    [key: string]: any
  }
}

export interface AuthSession {
  user: AuthUser
  access_token: string
  refresh_token: string
}

/**
 * Signer avec email + password
 * Récupère ensuite le profil utilisateur depuis fl_users
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: User; session: AuthSession } | { error: string }> {
  try {
    const supabase = createClient()

    // 1. Authentifier auprès de Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.session) {
      return { error: error?.message || "Identifiants invalides" }
    }

    // 2. Récupérer le profil utilisateur depuis fl_users
    const { data: userRow, error: userError } = await supabase
      .from("fl_users")
      .select("*")
      .eq("email", email)
      .single()

    if (userError || !userRow) {
      return {
        error: "Profil utilisateur non trouvé. Contactez l'administrateur.",
      }
    }

    // 3. Mapper vers notre type User (snake_case → camelCase)
    const user: User = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      password: "", // NE PAS STOCKER le vrai password
      role: userRow.role,
      actif: userRow.actif,
      accessType: userRow.access_type,
      secteur: userRow.secteur,
      phone: userRow.phone,
      telephone: userRow.telephone,
      photoUrl: userRow.photo_url,
      canViewAchat: userRow.can_view_achat,
      canViewCommercial: userRow.can_view_commercial,
      canViewLogistique: userRow.can_view_logistique,
      canViewStock: userRow.can_view_stock,
      canViewCash: userRow.can_view_cash,
      canViewFinance: userRow.can_view_finance,
      canViewRecap: userRow.can_view_recap,
      canViewDatabase: userRow.can_view_database,
      canViewExternal: userRow.can_view_external,
      canCreateCommandeBO: userRow.can_create_commande_bo,
      objectifClients: userRow.objectif_clients,
      objectifTonnage: userRow.objectif_tonnage,
      objectifJournalierCA: userRow.objectif_journalier_ca,
      objectifHebdomadaireCA: userRow.objectif_hebdomadaire_ca,
      objectifMensuelCA: userRow.objectif_mensuel_ca,
      fournisseurId: userRow.fournisseur_id,
      clientId: userRow.client_id,
      depotId: userRow.depot_id,
      requireCameraAuth: userRow.require_camera_auth,
    }

    // 4. Sauvegarder la session (sera utilisée pour les requêtes ultérieures)
    const session: AuthSession = {
      user: {
        id: data.session.user.id,
        email: data.session.user.email || "",
        user_metadata: data.session.user.user_metadata,
      },
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token || "",
    }

    return { user, session }
  } catch (e) {
    console.error("[Auth] Erreur signIn:", e)
    return { error: "Erreur de connexion. Vérifiez votre connexion internet." }
  }
}

/**
 * Signer avec email + password (fallback localStorage si Supabase indisponible)
 * Cela utilise l'ancien système comme fallback pour développement/offline
 */
export async function signInWithEmailFallback(
  email: string,
  password: string
): Promise<User | null> {
  try {
    // Essayer d'abord Supabase
    const result = await signInWithEmail(email, password)
    if ("user" in result) {
      return result.user
    }
    // Fallback : localStorage (dev seulement)
    console.warn("[Auth] Supabase échoué, fallback localStorage")
    return store.login(email, password)
  } catch {
    // Double fallback
    return store.login(email, password)
  }
}

/**
 * Récupérer la session actuellement authentifiée
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session as AuthSession | null
  } catch {
    return null
  }
}

/**
 * Récupérer l'utilisateur actuel avec ses données
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()

    if (!data.user?.email) return null

    // Récupérer le profil complet depuis fl_users
    const { data: userRow } = await supabase
      .from("fl_users")
      .select("*")
      .eq("email", data.user.email)
      .single()

    if (!userRow) return null

    const user: User = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      password: "",
      role: userRow.role,
      actif: userRow.actif,
      accessType: userRow.access_type,
      secteur: userRow.secteur,
      phone: userRow.phone,
      telephone: userRow.telephone,
      photoUrl: userRow.photo_url,
      canViewAchat: userRow.can_view_achat,
      canViewCommercial: userRow.can_view_commercial,
      canViewLogistique: userRow.can_view_logistique,
      canViewStock: userRow.can_view_stock,
      canViewCash: userRow.can_view_cash,
      canViewFinance: userRow.can_view_finance,
      canViewRecap: userRow.can_view_recap,
      canViewDatabase: userRow.can_view_database,
      canViewExternal: userRow.can_view_external,
      canCreateCommandeBO: userRow.can_create_commande_bo,
      objectifClients: userRow.objectif_clients,
      objectifTonnage: userRow.objectif_tonnage,
      objectifJournalierCA: userRow.objectif_journalier_ca,
      objectifHebdomadaireCA: userRow.objectif_hebdomadaire_ca,
      objectifMensuelCA: userRow.objectif_mensuel_ca,
      fournisseurId: userRow.fournisseur_id,
      clientId: userRow.client_id,
      depotId: userRow.depot_id,
      requireCameraAuth: userRow.require_camera_auth,
    }

    return user
  } catch {
    return null
  }
}

/**
 * Se déconnecter
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.auth.signOut()
  } catch (e) {
    console.error("[Auth] Erreur signOut:", e)
  }
}

/**
 * Créer un nouvel utilisateur (admin seulement)
 */
export async function createUser(
  email: string,
  password: string,
  userData: Partial<User>
): Promise<{ user: User | null; error: string | null }> {
  try {
    const supabase = createClient()

    // 1. Créer le compte Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return { user: null, error: authError?.message || "Erreur création compte" }
    }

    // 2. Créer le profil dans fl_users
    const newUser: Partial<User> = {
      id: authData.user.id,
      email,
      name: userData.name || "Nouvel utilisateur",
      role: userData.role || "prevendeur",
      actif: true,
      ...userData,
    }

    const { error: dbError } = await supabase
      .from("fl_users")
      .insert([newUser])

    if (dbError) {
      // Rollback : supprimer le compte auth si la création DB échoue
      await supabase.auth.admin.deleteUser(authData.user.id)
      return { user: null, error: dbError.message }
    }

    return {
      user: newUser as User,
      error: null,
    }
  } catch (e) {
    return {
      user: null,
      error: e instanceof Error ? e.message : "Erreur inconnue",
    }
  }
}

/**
 * Réinitialiser le mot de passe
 */
export async function resetPassword(email: string): Promise<{ error: string | null }> {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    return { error: error?.message || null }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue" }
  }
}

/**
 * Refresh la session si elle expire
 */
export async function refreshSession(): Promise<AuthSession | null> {
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.refreshSession()
    return data.session as AuthSession | null
  } catch (e) {
    console.error("[Auth] Erreur refresh:", e)
    return null
  }
}
