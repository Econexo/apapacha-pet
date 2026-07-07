-- ============================================================
-- Fix: el host (cuidador) y el admin NO tenían políticas RLS para
-- ver/actualizar bookings. Las únicas eran owner-only + admin-UPDATE.
-- Consecuencia: HostDashboard veía 0 reservas, startService/
-- completeBookingAsHost afectaban 0 filas (.single() lanzaba error),
-- getMonthlyEarnings daba $0, y el panel admin contaba solo las
-- reservas propias del admin.
--
-- bookings.service_id es polimórfico: referencia spaces.id O visiters.id
-- según service_type. Las políticas resuelven la propiedad del host
-- mirando ambas tablas.
-- ============================================================

-- Host: ver reservas de sus servicios
CREATE POLICY "Hosts view bookings for their services" ON public.bookings
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = bookings.service_id AND s.host_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = bookings.service_id AND v.host_id = auth.uid())
);

-- Host: actualizar reservas de sus servicios (iniciar/completar servicio)
CREATE POLICY "Hosts update bookings for their services" ON public.bookings
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = bookings.service_id AND s.host_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = bookings.service_id AND v.host_id = auth.uid())
);

-- Admin: ver todas las reservas (métricas y listados del panel)
CREATE POLICY "Admins view all bookings" ON public.bookings
FOR SELECT USING (public.is_admin());
