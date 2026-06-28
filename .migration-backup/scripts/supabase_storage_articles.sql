-- ============================================================
-- SUPABASE STORAGE — Bucket "articles" pour photos SKU
-- Exécuter dans : Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Créer le bucket public "articles" (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'articles',
  'articles',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public             = true,
      file_size_limit    = 5242880,
      allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif'];

-- 2. RLS : lecture publique (CDN — pas besoin d'auth pour afficher)
DROP POLICY IF EXISTS "articles_public_read"  ON storage.objects;
CREATE POLICY "articles_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'articles');

-- 3. RLS : upload autorisé sans authentification (anon key suffit)
--    Nécessaire car FreshLink n'utilise pas Supabase Auth native
DROP POLICY IF EXISTS "articles_anon_insert"  ON storage.objects;
CREATE POLICY "articles_anon_insert"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'articles');

-- 4. RLS : mise à jour sans auth
DROP POLICY IF EXISTS "articles_anon_update"  ON storage.objects;
CREATE POLICY "articles_anon_update"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'articles');

-- 5. RLS : suppression sans auth
DROP POLICY IF EXISTS "articles_anon_delete"  ON storage.objects;
CREATE POLICY "articles_anon_delete"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'articles');

-- Vérification
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'articles';
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE 'articles_%';
