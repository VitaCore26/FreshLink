import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireDeviceApi } from "@/lib/auth/requireDeviceApi"

// ════════════════════════════════════════════════════════════════════════════
//  /api/upload-media — upload d'image vers Supabase Storage CÔTÉ SERVEUR.
//
//  Pourquoi : l'upload côté client échouait car la clé anon n'est pas exposée
//  (createClient() => "offline") → "Supabase inaccessible" + fallback base64.
//  Ici on uploade avec la clé service_role (qui a tous les droits + bypass RLS),
//  on crée le bucket public si absent, et on renvoie l'URL publique permanente.
//  Protégé par requireDeviceApi (même garde que sync-*).
// ════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.service_role || process.env.SUPABASE_SERVICE_KEY || ""
const BUCKET = "freshlink-media"
const MAX_BYTES = 8 * 1024 * 1024   // 8 Mo

export async function POST(req: NextRequest) {
  const denied = requireDeviceApi(req)
  if (denied) return denied

  if (!SERVICE_KEY) {
    return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante" }, { status: 500 })
  }

  try {
    const { dataUrl, folder } = (await req.json()) as { dataUrl?: string; folder?: string }
    const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl ?? "")
    if (!m) {
      return NextResponse.json({ ok: false, error: "dataUrl base64 invalide" }, { status: 400 })
    }
    const contentType = m[1]
    const buffer = Buffer.from(m[2], "base64")
    if (buffer.length === 0) {
      return NextResponse.json({ ok: false, error: "image vide" }, { status: 400 })
    }
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "image trop lourde (> 8 Mo)" }, { status: 413 })
    }

    const ext = (contentType.split("/")[1] || "jpg").replace("jpeg", "jpg").replace("+xml", "")
    const safeFolder = (folder || "articles").replace(/[^a-z0-9_-]/gi, "") || "articles"
    const path = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // S'assure que le bucket public existe (idempotent — ignore l'erreur si déjà créé)
    try {
      const { data: buckets } = await sb.storage.listBuckets()
      if (!buckets?.some(b => b.name === BUCKET)) {
        await sb.storage.createBucket(BUCKET, { public: true })
      }
    } catch { /* course possible : on tente l'upload quand même */ }

    const { error: upErr } = await sb.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: true })
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 })
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ ok: true, url: data.publicUrl, path })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 })
  }
}
