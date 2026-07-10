-- ============================================================
-- Variantes latentes de "RLS faltante para un rol":
-- (1) pets: el host de una reserva debe poder LEER el gato (alertas
--     médicas) para cuidarlo. Antes solo el dueño.
-- (2) insurance_claims: el admin debe poder LEER y RESOLVER reclamos.
--     Antes solo el claimant leía y no había UPDATE.
-- ============================================================

-- pets: host de una reserva que referencia la mascota puede leerla
CREATE POLICY "Hosts read pets of their bookings" ON public.pets
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.pet_id = pets.id AND (
      EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = b.service_id AND s.host_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
    )
  )
);

-- insurance_claims: admin lee y actualiza (resolver/rechazar)
CREATE POLICY "Admins read all claims" ON public.insurance_claims
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins update claims" ON public.insurance_claims
  FOR UPDATE USING (public.is_admin());
