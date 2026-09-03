-- Avisos de las visitas: hora local de Chile, una por fecha, y un push por evento.
--
-- Tres defectos, todos verificados contra producción con las reservas de prueba
-- de la tester:
--
-- 1. "Tu reserva empieza mañana" se calculaba con `now()::date + 1`, en UTC. El
--    cron corre cada hora al :17, así que la regla acertaba por primera vez a
--    las 00:17 UTC, que en Chile son las 20:17 o 21:17 del día ANTERIOR. Prueba:
--    la reserva 491d2abd (visita del 2026-09-02) recibió el aviso el 2026-09-01
--    00:17Z = 31 de agosto, 20:17 en Chile. Es decir, avisaba dos días antes
--    diciendo "mañana".
--
-- 2. El aviso miraba solo `start_date`. Un alojamiento es un tramo continuo y con
--    eso basta, pero una visita son citas sueltas (el calendario invita a elegir
--    "día por medio"): de una reserva con visitas el 10, el 12 y el 14 solo se
--    avisaba la del 10. Las demás no se avisaban nunca, ni al cliente ni al
--    cuidador. Ahora se recorre `visit_dates` y cada fecha tiene su recordatorio.
--
-- 3. El fin del servicio se comparaba como `end_date < now()`, y una fecha se
--    convierte a medianoche UTC. Para una visita del día 2 eso da "el servicio ya
--    terminó" a las 21:17 del día 1 en Chile: el cuidador recibía "márcala como
--    completada" ANTES de que la visita ocurriera, y 24 horas después se cerraba
--    sola. Ahora el servicio termina al acabar `end_date` en hora de Chile.
--
-- Aparte, el `tag` del push era 'chat-<booking_id>' para TODA notificación con
-- reserva. Dos avisos distintos de la misma reserva comparten tag y, con
-- renotify, el segundo REEMPLAZA al primero en la bandeja: "servicio iniciado"
-- borraba "reserva aceptada". El tag pasa a ser por tipo de evento, y 'chat-'
-- queda reservado para los mensajes, que es donde agrupar sí se quiere.

-- Instante en que un servicio se da por terminado: el final del día `end_date`
-- en hora de Chile. `end_date < now()` comparaba contra la medianoche UTC de ese
-- mismo día, que en Chile cae la tarde anterior.
CREATE OR REPLACE FUNCTION public.booking_end_at(p_end_date date)
RETURNS timestamptz
LANGUAGE sql
STABLE
AS $fn$
  SELECT ((p_end_date + 1)::timestamp AT TIME ZONE 'America/Santiago');
$fn$;

-- ── Push: un tag por evento, no uno por reserva ───────────────────────────────
CREATE OR REPLACE FUNCTION public.push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  PERFORM private.call_send_push(jsonb_build_object(
    'user_id', NEW.user_id,
    'title',   NEW.title,
    'body',    NEW.body,
    'url',     public.notification_url(NEW.type, COALESCE(NEW.data, '{}'::jsonb), NEW.user_id),
    'tag',     CASE
                 -- Los mensajes SÍ se agrupan por conversación: una ráfaga de
                 -- mensajes no debe llenar la bandeja.
                 WHEN NEW.type = 'new_message' AND NEW.data ? 'booking_id'
                   THEN 'chat-' || (NEW.data->>'booking_id')
                 WHEN NEW.data ? 'booking_id'
                   THEN NEW.type || '-' || (NEW.data->>'booking_id')
                 ELSE NEW.type
               END
  ));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[push_on_notification] %', SQLERRM;
  RETURN NEW;
END;
$fn$;

-- ── Recordatorios y cierre de reservas ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.autocomplete_stale_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_booking  record;
  v_host_id  uuid;
  v_cerradas integer := 0;
  -- Todo lo que el usuario percibe como "hoy" o "mañana" se mide en Chile, no
  -- en UTC: el cron corre en UTC y de madrugada allí ya es el día siguiente.
  v_manana   date := (now() AT TIME ZONE 'America/Santiago')::date + 1;
BEGIN
  -- ── Regla A: servicio terminado, el cuidador no lo cerró (periodo de gracia)
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'active'
       AND public.booking_end_at(b.end_date) < now()
       AND public.booking_end_at(b.end_date) >= now() - interval '24 hours'
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
       AND public.booking_end_at(b.end_date) < now() - interval '24 hours'
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
       AND public.business_days_between(public.booking_end_at(b.end_date), now()) >= 3
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

  -- ── Regla F: recordatorio de lo que toca mañana (hora de Chile).
  --    Un alojamiento avisa una vez, por su fecha de llegada. Una visita avisa
  --    por CADA fecha agendada: son citas independientes.
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id, d.fecha
      FROM public.bookings b
      CROSS JOIN LATERAL unnest(
        CASE WHEN b.service_type = 'visiter'
             THEN COALESCE(b.visit_dates, ARRAY[b.start_date])
             ELSE ARRAY[b.start_date]
        END
      ) AS d(fecha)
     WHERE b.status = 'active'
       AND d.fecha = v_manana
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.type = 'booking_tomorrow'
            AND n.data->>'booking_id' = b.id::text
            -- Los avisos antiguos no llevan visit_date: valen por start_date.
            AND COALESCE(n.data->>'visit_date', b.start_date::text) = d.fecha::text)
  LOOP
    v_host_id := public.booking_host_id(v_booking.service_type, v_booking.service_id);

    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (v_booking.owner_id, 'booking_tomorrow',
            CASE WHEN v_booking.service_type = 'visiter'
                 THEN 'Mañana visitan a tu gato'
                 ELSE 'Tu reserva empieza mañana' END,
            CASE WHEN v_booking.service_type = 'visiter'
                 THEN 'Coordina la hora exacta con tu cuidador por el chat.'
                 ELSE 'Coordina los últimos detalles con tu cuidador por el chat.' END,
            jsonb_build_object('booking_id', v_booking.id, 'visit_date', v_booking.fecha));

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (v_host_id, 'booking_tomorrow',
              CASE WHEN v_booking.service_type = 'visiter'
                   THEN 'Mañana tienes una visita'
                   ELSE 'Tienes un servicio mañana' END,
              CASE WHEN v_booking.service_type = 'visiter'
                   THEN 'Coordina la hora exacta con el cliente por el chat.'
                   ELSE 'Revisa los detalles y coordina con el cliente por el chat.' END,
              jsonb_build_object('booking_id', v_booking.id, 'visit_date', v_booking.fecha));
    END IF;
  END LOOP;

  RETURN v_cerradas;
END;
$fn$;

REVOKE ALL ON FUNCTION public.autocomplete_stale_bookings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.autocomplete_stale_bookings() FROM anon, authenticated;
