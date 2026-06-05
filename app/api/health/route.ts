import { NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth/supabaseAuth"

/**
 * GET /api/health
 *
 * SECURITY [P1-007]: Public health check - no env var exposure
 * Used by load balancers, orchestrators, monitoring
 * Does NOT expose configuration details
 */
export async function GET() {
  try {
    // ✅ Only return basic operational status
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      app: {
        name: "FreshLink Pro",
        version: "1.0.0",
      },
      // Don't expose environment variable status
      // Don't expose Supabase connectivity
      // Just minimal status for monitors/load balancers
    }

    return NextResponse.json(health, { status: 200 })

  } catch (error) {
    console.error("[Health] Erreur:", error)
    return NextResponse.json(
      { status: "unhealthy", timestamp: new Date().toISOString() },
      { status: 503 }
    )
  }
}

/**
 * POST /api/health/diagnostics
 *
 * Admin-only diagnostic endpoint
 * Returns detailed configuration and health information
 * Requires authentication + admin role
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ Require authentication
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    // ✅ Require admin role
    if (user.role !== "super_admin" && user.role !== "admin") {
      console.warn(`[Diagnostics] Unauthorized access attempt by ${user.id}`)
      return NextResponse.json(
        { error: "Permission insuffisante" },
        { status: 403 }
      )
    }

    // ✅ Now expose diagnostic information (admin only)
    const diagnostics = {
      timestamp: new Date().toISOString(),
      status: "ok",
      admin: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing",
        supabaseKeySet: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        demoModeEnabled: !!process.env.NEXT_PUBLIC_DEMO_PWD,
        nodeEnv: process.env.NODE_ENV,
      },
      features: {
        authEnabled: true,
        rlsEnabled: true,
        rateLimitingEnabled: !!process.env.UPSTASH_REDIS_REST_URL,
      },
    }

    // Verify required env vars
    const hasMissingVars = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
                           !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (hasMissingVars) {
      diagnostics.status = "degraded"
    }

    return NextResponse.json(diagnostics)

  } catch (err) {
    console.error("[Diagnostics] Erreur:", err)
    return NextResponse.json(
      { error: "Diagnostic check failed" },
      { status: 500 }
    )
  }
}
