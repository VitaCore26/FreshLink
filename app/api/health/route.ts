import { NextResponse } from "next/server"

/**
 * GET /api/health
 *
 * Endpoint de diagnostic pour vérifier la santé de l'app
 * Utilisé par les orchestrators (K8s, Vercel) et pour le debugging
 */
export async function GET() {
  try {
    const checks = {
      timestamp: new Date().toISOString(),
      status: "ok",
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "✅ Set" : "❌ Missing",
        demoPwd: process.env.NEXT_PUBLIC_DEMO_PWD ? "✅ Set" : "❌ Missing",
      },
      app: {
        name: process.env.NEXT_PUBLIC_APP_NAME || "FreshLink Pro",
        version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
      },
    }

    // Vérifier que toutes les variables requises sont présentes
    const hasMissingVars = Object.values(checks.environment).some(
      (v) => typeof v === "string" && v.includes("Missing")
    )

    if (hasMissingVars) {
      return NextResponse.json(
        { ...checks, status: "degraded", message: "Missing environment variables" },
        { status: 503 }
      )
    }

    return NextResponse.json(checks, { status: 200 })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
