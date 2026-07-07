-- ============================================================
-- Fix: el código sube a los buckets 'receipts' (comprobante de
-- transferencia, bookings.service.ts) y 'contracts' (contrato
-- firmado, ProfileScreen) pero NINGUNO existía → "Bucket not found".
-- Ambos usan getPublicUrl(), así que se crean públicos (los paths
-- contienen UUIDs no adivinables), igual que avatars/spaces.
-- NOTA: para mayor privacidad se podrían migrar a privado + signed
-- URLs (como kyc-docs), lo que requeriría cambiar el código de lectura.
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('receipts','receipts',true)
  ON CONFLICT (id) DO UPDATE SET public = true;
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts','contracts',true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- receipts: lectura pública, escritura solo en la carpeta propia (userId/...)
CREATE POLICY "Public read receipts" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');
CREATE POLICY "User upload own receipt" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "User update own receipt" ON storage.objects
  FOR UPDATE USING (bucket_id = 'receipts' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- contracts: lectura pública, escritura solo en la carpeta propia
CREATE POLICY "Public read contracts" ON storage.objects
  FOR SELECT USING (bucket_id = 'contracts');
CREATE POLICY "User upload own contract" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'contracts' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "User update own contract" ON storage.objects
  FOR UPDATE USING (bucket_id = 'contracts' AND (auth.uid())::text = (storage.foldername(name))[1]);
