import { NextResponse } from "next/server"
import { signOut } from "@/lib/auth/supabaseAuth"

/**
 * POST /api/auth/signout
 * Se déconnecter proprement
 */
export async function POST() {
  try {
    await signOut()
    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[/api/auth/signout] Erreur:", error)
    return NextResponse.json(
      { error: "Erreur logout" },
      { status: 500 }
    )
  }
}
