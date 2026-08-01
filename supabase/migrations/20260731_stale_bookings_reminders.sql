-- Recordatorios y cierre de reservas estancadas.
--
-- Motivación: una reserva del 11–13 de julio quedó en 'pending' con el cuidador
-- ya aceptado y el cliente sin pagar. Nadie avisaba, y ahí seguía semanas
-- después ocupando fechas.
--
-- Se amplía autocomplete_stale_bookings(), que ya corre cada hora por pg_cron,
-- con cuatro reglas. Cada INSERT en notifications dispara además el Web Push.

-- Días hábiles (lunes a viernes) entre dos instantes.
CREATE OR REPLACE FUNCTION public.business_days_between(desde timestamptz, hasta timestamptz)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT count(*)::int
    FROM generate_series(desde::date, (hasta::date - 1), interval '1 day') d
   WHERE extract(isodow FROM d) < 6;
$fn$;

-- El host de una reserva (service_id es polimórfico según service_type).
CREATE OR REPLACE FUNCTION public.booking_host_id(p_service_type text, p_service_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $fn$
  SELECT CASE
    WHEN p_service_type = 'space'
      THEN (SELECT host_id FROM public.spaces   WHERE id = p_service_id)
    ELSE (SELECT host_id FROM public.visiters WHERE id = p_service_id)
  END;
$fn$;

-- Añade las rutas de los tipos nuevos al mapa de deep-links del push.
CREATE OR REPLACE FUNCTION public.notification_url(p_type text, p_data jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE
    WHEN p_type = 'new_message' AND p_data ? 'booking_id'
      THEN '/chat/' || (p_data->>'booking_id')
    WHEN p_type = 'booking_created'
      THEN '/panel'
    WHEN p_type IN ('application_submitted', 'user_registered', 'service_published', 'receipt_submitted')
      THEN '/admin'
    WHEN p_type IN ('application_approved', 'application_rejected')
      THEN '/perfil'
    WHEN p_type IN ('booking_accepted', 'booking_rejected', 'booking_confirmed',
                    'service_started', 'service_completed', 'booking_cancelled',
                    'booking_payment_reminder', 'booking_unresolved',
                    'booking_auto_cancelled', 'booking_tomorrow',
                    'booking_pending_completion', 'pet_report')
      THEN '/reservas'
    WHEN p_data ? 'booking_id'
      THEN '/reservas'
    WHEN p_data ? 'application_id'
      THEN '/perfil'
    ELSE '/'
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.autocomplete_stale_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_booking  record;
  v_host_id  uuid;
  v_cerradas integer := 0;
BEGIN
  -- ── Regla A: servicio terminado, el cuidador no lo cerró (periodo de gracia)
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'active'
       AND b.end_date < now()
       AND b.end_date >= now() - interval '24 hours'
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.type = 'booking_pending_completion'
            AND n.data->>'booking_id' = b.id::text)
  LOOP
    v_host_id := public.booking_host_id(v_booking.service_type, v_booking.service_id);
    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_host_id, 'booking_pending_completion',
              'Marca la reserva como completada',
              'El servicio ya terminó. Si no la cierras, se cerrará sola en 24 horas.',
              jsonb_build_object('booking_id', v_booking.id));
    END IF;
  END LOOP;

  -- ── Regla B: cierre automático pasado el periodo de gracia
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'active'
       AND b.end_date < now() - interval '24 hours'
  LOOP
    UPDATE public.bookings
       SET status = 'completed', service_phase = 'not_started'
     WHERE id = v_booking.id;
    v_cerradas := v_cerradas + 1;

    v_host_id := public.booking_host_id(v_booking.service_type, v_booking.service_id);

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_booking.owner_id, 'service_completed', 'Cuidado finalizado',
            'Tu reserva se cerró automáticamente. Ya puedes calificar a tu cuidador.',
            jsonb_build_object('booking_id', v_booking.id));

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_host_id, 'service_completed', 'Reserva cerrada automáticamente',
              'Pasaron 24 horas del fin del servicio. Ya puedes calificar al cliente.',
              jsonb_build_object('booking_id', v_booking.id));
    END IF;
  END LOOP;

  -- ── Regla C: aceptada pero sin pagar tras 3 días hábiles desde que se creó
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'pending'
       AND b.host_response = 'accepted'
       AND b.payment_status = 'unpaid'
       AND public.business_days_between(b.created_at, now()) >= 3
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.type = 'booking_payment_reminder'
            AND n.data->>'booking_id' = b.id::text)
  LOOP
    v_host_id := public.booking_host_id(v_booking.service_type, v_booking.service_id);

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_booking.owner_id, 'booking_payment_reminder',
            'Tu reserva espera el pago',
            'El cuidador ya aceptó. Sube el comprobante para confirmarla.',
            jsonb_build_object('booking_id', v_booking.id));

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_host_id, 'booking_payment_reminder',
              'Reserva pendiente de pago',
              'El cliente aún no ha subido el comprobante de su reserva.',
              jsonb_build_object('booking_id', v_booking.id));
    END IF;
  END LOOP;

  -- ── Regla D: el servicio ya pasó y la reserva sigue sin resolverse
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'pending'
       AND public.business_days_between(b.end_date::timestamptz, now()) >= 3
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.type = 'booking_unresolved'
            AND n.data->>'booking_id' = b.id::text)
  LOOP
    v_host_id := public.booking_host_id(v_booking.service_type, v_booking.service_id);

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_booking.owner_id, 'booking_unresolved',
            '¿Se realizó este servicio?',
            'Tu reserva quedó sin confirmar. Si no nos dices nada, se cancelará en 2 días.',
            jsonb_build_object('booking_id', v_booking.id));

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_host_id, 'booking_unresolved',
              '¿Se realizó este servicio?',
              'Una reserva tuya quedó sin confirmar. Si nadie responde, se cancelará en 2 días.',
              jsonb_build_object('booking_id', v_booking.id));
    END IF;
  END LOOP;

  -- ── Regla E: cancelación automática 2 días después del aviso de la regla D.
  --    No se borra la fila: queda como cancelada, conservando el historial.
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'pending'
       AND EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.type = 'booking_unresolved'
            AND n.data->>'booking_id' = b.id::text
            AND n.created_at < now() - interval '2 days')
  LOOP
    UPDATE public.bookings
       SET status = 'cancelled',
           cancelled_by = 'admin',
           cancelled_at = now(),
           cancellation_reason = 'Sin confirmación tras el servicio'
     WHERE id = v_booking.id;

    v_host_id := public.booking_host_id(v_booking.service_type, v_booking.service_id);

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_booking.owner_id, 'booking_auto_cancelled',
            'Reserva cancelada',
            'Se canceló automáticamente porque quedó sin confirmar tras el servicio.',
            jsonb_build_object('booking_id', v_booking.id));

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_host_id, 'booking_auto_cancelled',
              'Reserva cancelada',
              'Se canceló automáticamente porque quedó sin confirmar tras el servicio.',
              jsonb_build_object('booking_id', v_booking.id));
    END IF;
  END LOOP;

  -- ── Regla F: recordatorio de reserva que empieza mañana
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'active'
       AND b.start_date::date = (now()::date + 1)
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.type = 'booking_tomorrow'
            AND n.data->>'booking_id' = b.id::text)
  LOOP
    v_host_id := public.booking_host_id(v_booking.service_type, v_booking.service_id);

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_booking.owner_id, 'booking_tomorrow',
            'Tu reserva empieza mañana',
            'Coordina los últimos detalles con tu cuidador por el chat.',
            jsonb_build_object('booking_id', v_booking.id));

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_host_id, 'booking_tomorrow',
              'Tienes un servicio mañana',
              'Revisa los detalles y coordina con el cliente por el chat.',
              jsonb_build_object('booking_id', v_booking.id));
    END IF;
  END LOOP;

  RETURN v_cerradas;
END;
$fn$;

REVOKE ALL ON FUNCTION public.autocomplete_stale_bookings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.autocomplete_stale_bookings() FROM anon, authenticated;
