"use client"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://nphrncmuxbwahqnzdyxp.supabase.co"

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5waHJuY211eGJ3YWhxbnpkeXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDUyNDUsImV4cCI6MjA5MDUyMTI0NX0._4bA9RtIVMUjNgxd2ojd9_3b6vzGRddpPPbioalRsMw"

// Singleton pour eviter la creation multiple de clients
let _client: ReturnType<typeof createSupabaseClient> | null = null

export function createClient() {
  if (!_client) {
    _client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return _client
}
