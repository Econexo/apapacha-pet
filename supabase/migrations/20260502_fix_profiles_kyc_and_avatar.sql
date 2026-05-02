-- ============================================================
-- Fix: añadir kyc_status y avatar_url a profiles
-- El schema inicial tenía verification_status en vez de kyc_status.
-- Toda la app usa kyc_status; sin esta columna el SELECT de
-- AdminScreen.loadUsers() falla silenciosamente devolviendo null.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_status   TEXT NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending', 'under_review', 'verified', 'rejected')),
  ADD COLUMN IF NOT EXISTS avatar_url   TEXT;

-- Migrar datos de verification_status → kyc_status si existe la columna vieja
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'verification_status'
  ) THEN
    UPDATE public.profiles
      SET kyc_status = verification_status
      WHERE kyc_status = 'pending' AND verification_status IS NOT NULL;
  END IF;
END $$;
