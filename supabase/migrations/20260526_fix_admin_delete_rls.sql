-- Fix: garantizar políticas RLS admin para DELETE (idempotente)
-- Problema: el botón "Eliminar" en visiters del panel admin fallaba
-- porque la política de DELETE no estaba aplicada correctamente.

-- Función auxiliar is_admin (recrear por seguridad)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles: admin puede eliminar/actualizar cualquier perfil
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any profile" ON public.profiles;
CREATE POLICY "Admins can delete any profile" ON public.profiles
  FOR DELETE USING (public.is_admin());

-- spaces: admin puede eliminar/actualizar cualquier espacio
DROP POLICY IF EXISTS "Admins can update any space" ON public.spaces;
CREATE POLICY "Admins can update any space" ON public.spaces
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any space" ON public.spaces;
CREATE POLICY "Admins can delete any space" ON public.spaces
  FOR DELETE USING (public.is_admin());

-- visiters: admin puede eliminar/actualizar cualquier visiter
DROP POLICY IF EXISTS "Admins can update any visiter" ON public.visiters;
CREATE POLICY "Admins can update any visiter" ON public.visiters
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete any visiter" ON public.visiters;
CREATE POLICY "Admins can delete any visiter" ON public.visiters
  FOR DELETE USING (public.is_admin());

-- bookings: admin puede actualizar cualquier reserva
DROP POLICY IF EXISTS "Admins can update any booking" ON public.bookings;
CREATE POLICY "Admins can update any booking" ON public.bookings
  FOR UPDATE USING (public.is_admin());

-- host_applications: admin puede actualizar cualquier postulación
DROP POLICY IF EXISTS "Admins can update any application" ON public.host_applications;
CREATE POLICY "Admins can update any application" ON public.host_applications
  FOR UPDATE USING (public.is_admin());
