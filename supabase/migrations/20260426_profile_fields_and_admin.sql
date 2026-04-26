-- ============================================================
-- Nuevos campos en profiles: last_name, age, address, bio, is_admin
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_name        TEXT,
  ADD COLUMN IF NOT EXISTS age              INTEGER,
  ADD COLUMN IF NOT EXISTS address          TEXT,
  ADD COLUMN IF NOT EXISTS bio              TEXT,
  ADD COLUMN IF NOT EXISTS is_admin         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_done  BOOLEAN NOT NULL DEFAULT false;

-- Ampliar rol para incluir 'admin'
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'host', 'admin'));

-- Política: el propio usuario puede actualizar su perfil (ya existe, pero se refuerza)
DROP POLICY IF EXISTS "User manage own profile" ON public.profiles;
CREATE POLICY "User manage own profile"
  ON public.profiles FOR ALL
  USING (auth.uid() = id);
