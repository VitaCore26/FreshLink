import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/supabaseAuth"

/**
 * GET /api/admin/verify
 *
 * SECURITY [P1-006]: Server-side authorization check
 * Verifies that current user has admin access
 * Cannot be bypassed client-side (via DevTools, localStorage, etc)
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Get user from Supabase (server-side, verified)
    const user = await getCurrentUser()

    // ✅ Check if user exists
    if (!user) {
      return NextResponse.json(
        { authorized: false, message: "Non authentifié" },
        { status: 401 }
      )
    }

    // ✅ Check if user has admin role
    const isAdmin = user.role === "super_super_admin" || user.role === "super_admin" || user.role === "admin"

    if (!isAdmin) {
      // Log unauthorized attempt
      console.warn(
        `[Security] Unauthorized admin access attempt by user ${user.id} (role: ${user.role})`
      )

      return NextResponse.json(
        { authorized: false, message: "Permission insuffisante" },
        { status: 403 }
      )
    }

    // ✅ User is authorized admin
    return NextResponse.json({
      authorized: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    })

  } catch (err) {
    console.error("[AdminVerify] Erreur:", err)
    return NextResponse.json(
      { authorized: false, message: "Vérification échouée" },
      { status: 500 }
    )
  }
}
