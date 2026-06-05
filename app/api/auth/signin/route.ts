import { NextRequest, NextResponse } from "next/server"
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { signInWithEmail } from "@/lib/auth/supabaseAuth"

/**
 * POST /api/auth/signin
 *
 * SECURITY:
 * - Rate-limited (5 attempts per 15 min per email) [P1-008]
 * - Server-side validation
 * - No hardcoded credentials
 * - Requires valid Supabase auth (no fallback to localStorage) [P0-003]
 * - Generic error messages (prevent user enumeration)
 */

// ✅ Initialize rate limiter
let limiter: Ratelimit | null = null

function initRateLimiter(): Ratelimit {
  if (limiter) return limiter

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    console.warn("[Auth] Rate limiting disabled: Redis not configured")
    // Fallback: Permissive limiter (still works, just doesn't rate limit)
    return new Ratelimit({
      limiter: Ratelimit.slidingWindow(10000, "1h"),
    })
  }

  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  })

  limiter = new Ratelimit({
    redis,
    analytics: true,
    prefix: "ratelimit:signin",
    limiter: Ratelimit.slidingWindow(5, "15m"),
  })

  return limiter
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // ✅ Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis" },
        { status: 400 }
      )
    }

    // ✅ Basic email format check
    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Email invalide" },
        { status: 400 }
      )
    }

    // ✅ SECURITY: Rate limiting [P1-008]
    const limiter = initRateLimiter()
    const { success, reset, remaining } = await limiter.limit(email)

    if (!success) {
      const minutesUntilReset = Math.ceil((reset - Date.now()) / 1000 / 60)
      console.warn(`[Auth] Rate limit exceeded for email: ${email}`)

      return NextResponse.json(
        {
          error: `Trop de tentatives. Réessayez dans ${minutesUntilReset} minutes.`,
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        {
          status: 429, // Too Many Requests
          headers: {
            "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // ✅ SECURITY: Use Supabase Auth ONLY (no fallback) [P0-003]
    const result = await signInWithEmail(email, password)

    if ("error" in result) {
      // Log attempt but don't expose details to prevent user enumeration
      console.warn(`[Auth] Failed login attempt (${remaining} remaining) for email: ${email}`)

      return NextResponse.json(
        { error: "Email ou mot de passe incorrect" },
        { status: 401 }
      )
    }

    // ✅ Success
    console.log(`[Auth] Successful login for user: ${result.user.id}`)

    return NextResponse.json(
      {
        user: result.user,
        message: "Connecté avec succès",
      },
      { status: 200 }
    )

  } catch (err) {
    console.error("[SignIn] Erreur non attendue:", err)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
