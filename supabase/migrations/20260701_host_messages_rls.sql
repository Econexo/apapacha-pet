-- ============================================================
-- Fix: el host no podía LEER mensajes (ambas políticas SELECT
-- exigían bookings.owner_id = auth.uid()). Podía insertar por una
-- política INSERT demasiado laxa (solo sender_id) que además era un
-- hueco: cualquier usuario podía inyectar mensajes en cualquier
-- reserva. Se agrega acceso correcto al host y se cierra el hueco.
-- ============================================================

-- Host: leer mensajes de reservas de sus servicios
CREATE POLICY "Hosts read messages for their service bookings" ON public.messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = messages.booking_id AND (
      EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = b.service_id AND s.host_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
    )
  )
);

-- Host: enviar mensajes en reservas de sus servicios
CREATE POLICY "Hosts send messages for their service bookings" ON public.messages
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = messages.booking_id AND (
      EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = b.service_id AND s.host_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
    )
  )
);

-- Cerrar el hueco: la política laxa permitía a cualquiera insertar
-- (solo validaba sender_id = self, sin verificar pertenencia a la reserva).
-- El owner conserva su política estricta "Booking participants can send messages".
DROP POLICY IF EXISTS "Booking participants insert messages" ON public.messages;
