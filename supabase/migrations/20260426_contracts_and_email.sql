-- ============================================================
-- host_applications: columnas para email y contrato
-- ============================================================
ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS welcome_email_sent BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS contract_url        TEXT;

-- ============================================================
-- profiles: columna para contrato firmado subido por el usuario
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signed_contract_url TEXT;

-- ============================================================
-- Storage: bucket contracts (privado, solo el propio usuario y admins)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contracts', 'contracts', false, 10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "User upload own contract" ON storage.objects;
CREATE POLICY "User upload own contract"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "User read own contract" ON storage.objects;
CREATE POLICY "User read own contract"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "User update own contract" ON storage.objects;
CREATE POLICY "User update own contract"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'contracts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
