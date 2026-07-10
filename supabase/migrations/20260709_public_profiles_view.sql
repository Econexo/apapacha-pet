-- ============================================================
-- Fix completo PII: base profiles legible SOLO por dueño + admin.
-- Los nombres públicos del marketplace se sirven por una vista
-- public_profiles con solo columnas seguras (sin address/age/kyc).
-- ============================================================
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;

-- self read ya existe ("Users can view own profile"); agregar admin read
DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

-- Vista pública con columnas seguras (corre con privilegios del owner => bypassa RLS)
CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, full_name, last_name, avatar_url, role, kyc_status, is_admin
  FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated;

NOTIFY pgrst, 'reload schema';

-- La vista queda solo para authenticated (Supabase auto-otorga a anon; revocar)
REVOKE ALL ON public.public_profiles FROM anon;
