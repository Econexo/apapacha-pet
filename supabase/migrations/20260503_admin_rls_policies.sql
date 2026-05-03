-- Políticas RLS para operaciones de admin desde el cliente
-- Sin estas policies, DELETE y UPDATE fallan con "permission denied" aunque el usuario tenga is_admin=true

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any profile" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- spaces
CREATE POLICY "Admins can update any space" ON public.spaces
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any space" ON public.spaces
  FOR DELETE USING (public.is_admin());

-- visiters
CREATE POLICY "Admins can update any visiter" ON public.visiters
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete any visiter" ON public.visiters
  FOR DELETE USING (public.is_admin());

-- bookings
CREATE POLICY "Admins can update any booking" ON public.bookings
  FOR UPDATE USING (public.is_admin());

-- host_applications
CREATE POLICY "Admins can update any application" ON public.host_applications
  FOR UPDATE USING (public.is_admin());
