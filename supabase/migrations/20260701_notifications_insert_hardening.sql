-- ============================================================
-- Hardening: la política INSERT de notifications era WITH CHECK (true),
-- es decir cualquier usuario autenticado podía crear notificaciones
-- para CUALQUIER usuario (spam/phishing). Se reemplaza por una regla
-- que solo permite:
--   1. notificarte a ti mismo,
--   2. si eres admin,
--   3. notificar a un admin (patrón insertNotificationsForAdmins),
--   4. notificar a un participante de una reserva de la que también
--      eres participante (owner o host del servicio), usando el
--      booking_id presente en data.
-- Los triggers DB usan insert_admin_notifications (SECURITY DEFINER),
-- no se ven afectados. Verificado con simulación de JWT.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;

CREATE POLICY "Insert notifications for participants or admins" ON public.notifications
FOR INSERT WITH CHECK (
  -- 1. a ti mismo
  notifications.user_id = auth.uid()
  -- 2. el que inserta es admin
  OR public.is_admin()
  -- 3. el destinatario es admin (permite avisar a admins)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = notifications.user_id AND p.is_admin = true)
  -- 4. emisor y destinatario comparten la reserva referenciada en data->>'booking_id'
  OR (
    (notifications.data ->> 'booking_id') IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = (notifications.data ->> 'booking_id')::uuid
        -- el emisor es participante (owner o host del servicio)
        AND (
          b.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = b.service_id AND s.host_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
        )
        -- el destinatario es participante
        AND (
          notifications.user_id = b.owner_id
          OR EXISTS (SELECT 1 FROM public.spaces s2   WHERE s2.id = b.service_id AND s2.host_id = notifications.user_id)
          OR EXISTS (SELECT 1 FROM public.visiters v2 WHERE v2.id = b.service_id AND v2.host_id = notifications.user_id)
        )
    )
  )
);
