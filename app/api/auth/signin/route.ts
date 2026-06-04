import { NextRequest, NextResponse } from "next/server"
import { signInWithEmailFallback } from "@/lib/auth/supabaseAuth"

/**
 * POST /api/auth/signin
 *
 * Authentifier un utilisateur avec email/password
 * Côté serveur pour éviter que le client appelle directement Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et password requis" },
        { status: 400 }
      )
    }

    const user = await signInWithEmailFallback(email, password)

    if (!user) {
      return NextResponse.json(
        { error: "Identifiants invalides" },
        { status: 401 }
      )
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error) {
    console.error("[/api/auth/signin] Erreur:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
