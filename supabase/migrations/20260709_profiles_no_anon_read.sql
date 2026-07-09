-- ============================================================
-- Privacidad: "Public read profiles" (roles {public}) permitía a
-- usuarios ANÓNIMOS leer full_name, age, address, kyc_doc_urls de
-- TODOS. Domicilios expuestos sin login. La app exige sesión para
-- todo, así que se restringe la lectura a 'authenticated'.
-- (Fix completo por columnas/vista para ocultar address a otros
-- usuarios autenticados queda como follow-up.)
-- ============================================================
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
CREATE POLICY "Authenticated read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
