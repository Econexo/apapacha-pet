-- ============================================================
-- Hardening: receipts (comprobantes bancarios) y contracts
-- (contratos firmados) estaban PÚBLICOS. Se pasan a privados y su
-- lectura queda restringida al dueño de la carpeta (userId/...) y a
-- los admins — igual que kyc-docs. El código de lectura pasa a usar
-- createSignedUrl (patrón DocViewer existente).
-- INSERT/UPDATE own-folder se conservan (subida sigue funcionando).
-- ============================================================

UPDATE storage.buckets SET public = false WHERE id IN ('receipts', 'contracts');

-- Reemplazar lectura pública por lectura restringida (dueño + admin)
DROP POLICY IF EXISTS "Public read receipts"  ON storage.objects;
DROP POLICY IF EXISTS "Public read contracts" ON storage.objects;

CREATE POLICY "Owner and admin read receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts'
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin())
  );

CREATE POLICY "Owner and admin read contracts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'contracts'
    AND ((auth.uid())::text = (storage.foldername(name))[1] OR public.is_admin())
  );
