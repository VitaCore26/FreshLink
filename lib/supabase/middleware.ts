import { NextResponse, type NextRequest } from "next/server"

// Routes publiques qui ne nécessitent pas de session
const PUBLIC_PATHS = ["/", "/login", "/_next", "/favicon", "/icon", "/api/public"]

export function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Laisser passer les assets et routes publiques
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  if (isPublic) return NextResponse.next({ request })

  // Vérifier la présence du cookie de session
  // NOTE: La migration vers Supabase Auth ajoutera ici la vérification du JWT
  const sessionCookie = request.cookies.get("fl_session")
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  const response = NextResponse.next({ request })

  // En-têtes de sécurité supplémentaires
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)")

  return response
}
