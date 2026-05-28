-- ============================================================
-- Storage: bucket privado para documentos KYC de cuidadores
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-docs',
  'kyc-docs',
  false,  -- privado: solo lectura vía admin/service role
  10485760,  -- 10 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/pdf', 'application/octet-stream'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- El propio usuario puede subir archivos a su carpeta {uid}/kyc/...
DROP POLICY IF EXISTS "User upload own kyc docs" ON storage.objects;
CREATE POLICY "User upload own kyc docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kyc-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- El propio usuario puede actualizar sus propios docs (upsert)
DROP POLICY IF EXISTS "User update own kyc docs" ON storage.objects;
CREATE POLICY "User update own kyc docs"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kyc-docs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Solo admins pueden leer los docs KYC
DROP POLICY IF EXISTS "Admin read kyc docs" ON storage.objects;
CREATE POLICY "Admin read kyc docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-docs'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.is_admin = true
      )
    )
  );
