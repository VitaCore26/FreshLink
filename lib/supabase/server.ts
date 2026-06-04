// Server-side Supabase client — uses supabase-js directly (no @supabase/ssr needed)
import { createClient as _create } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Variables d'environnement Supabase manquantes.\n" +
    "Créez un fichier .env.local avec NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY."
  )
}

export async function createClient() {
  return _create(SUPABASE_URL!, SUPABASE_ANON_KEY!)
}
