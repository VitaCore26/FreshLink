// Server-side Supabase client — uses supabase-js directly (no @supabase/ssr needed)
import { createClient as _create } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wnuilvamhygkzupvfnxz.supabase.co"
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndudWlsdmFtaHlna3p1cHZmbnh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzU2ODgsImV4cCI6MjA5NjI1MTY4OH0.OQ28nHPNkuJNSZerZwiTLRIn5rRNhVc8rEwToMYCbhI"

export async function createClient() {
  return _create(URL, KEY)
}
