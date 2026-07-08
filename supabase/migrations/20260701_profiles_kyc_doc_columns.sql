-- ============================================================
-- KYC real: guardar referencias a las imágenes de la cédula que el
-- cliente sube en ClientVerificationScreen (antes solo era un flag de
-- UI y la imagen se descartaba). Se suben al bucket privado kyc-docs
-- y el admin las revisa con DocViewer (signed URL).
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_doc_front_url TEXT,
  ADD COLUMN IF NOT EXISTS kyc_doc_back_url  TEXT;
