// Client signup is handled by /api/ext/demande-compte
// This route redirects to avoid duplication
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const url = new URL("/api/ext/demande-compte", req.url)
  return fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, type: body.type ?? "client" }),
  })
}
