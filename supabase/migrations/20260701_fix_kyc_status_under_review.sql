-- ============================================================
-- Fix: la constraint remota de kyc_status NO incluía 'under_review'
-- (quedó una versión vieja: pending/verified/rejected).
-- completeKyc() hace UPDATE kyc_status='under_review' → violaba
-- profiles_kyc_status_check y bloqueaba el registro en el paso
-- de verificación de identidad.
-- ============================================================

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_kyc_status_check
  CHECK (kyc_status IN ('pending', 'under_review', 'verified', 'rejected'));
