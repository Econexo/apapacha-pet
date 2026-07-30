-- Cierre automático de reservas vencidas.
--
-- Problema: host.service.completeBookingAsHost era el ÚNICO camino a
-- status='completed'. Si el cuidador no tocaba "Completar", la reserva quedaba
-- activa para siempre (reportado con reservas de días de antigüedad).
--
-- Política acordada: a las 24 h de end_date se cierra sola. Antes de eso, en
-- cuanto end_date pasa, se le avisa al cuidador para que la cierre él.

CREATE OR REPLACE FUNCTION public.autocomplete_stale_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_booking record;
  v_host_id uuid;
  v_cerradas integer := 0;
BEGIN
  -- 1) Aviso al cuidador: el servicio venció pero sigue dentro del periodo de
  --    gracia. Una sola vez por reserva.
  FOR v_booking IN
    SELECT b.id, b.owner_id, b.service_type, b.service_id
      FROM public.bookings b
     WHERE b.status = 'active'
       AND b.end_date < now()
       AND b.end_date >= now() - interval '24 hours'
       AND NOT EXISTS (
         SELECT 1 FROM public.notifications n
          WHERE n.type = 'booking_pending_completion'
            AND n.data->>'booking_id' = b.id::text
       )
  LOOP
    SELECT COALESCE(s.host_id, v.host_id) INTO v_host_id
      FROM (SELECT 1) dummy
      LEFT JOIN public.spaces   s ON v_booking.service_type = 'space'   AND s.id = v_booking.service_id
      LEFT JOIN public.visiters v ON v_booking.service_type = 'visiter' AND v.id = v_booking.service_id;

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_host_id,
        'booking_pending_completion',
        'Marca la reserva como completada',
        'El servicio ya terminó. Si no la cierras, se cerrará sola en 24 horas.',
        jsonb_build_object('booking_id', v_booking.id)
      );
    END IF;
  END LOOP;

  -- 2) Cierre automático pasado el periodo de gracia.
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

    SELECT COALESCE(s.host_id, v.host_id) INTO v_host_id
      FROM (SELECT 1) dummy
      LEFT JOIN public.spaces   s ON v_booking.service_type = 'space'   AND s.id = v_booking.service_id
      LEFT JOIN public.visiters v ON v_booking.service_type = 'visiter' AND v.id = v_booking.service_id;

    -- Avisamos a ambas partes: el cierre habilita las reseñas.
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_booking.owner_id,
      'service_completed',
      'Cuidado finalizado',
      'Tu reserva se cerró automáticamente. Ya puedes calificar a tu cuidador.',
      jsonb_build_object('booking_id', v_booking.id)
    );

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, body, data)
      VALUES (
        v_host_id,
        'service_completed',
        'Reserva cerrada automáticamente',
        'Pasaron 24 horas del fin del servicio. Ya puedes calificar al cliente.',
        jsonb_build_object('booking_id', v_booking.id)
      );
    END IF;
  END LOOP;

  RETURN v_cerradas;
END;
$fn$;

-- Solo el servicio la ejecuta (cron). Nadie más.
REVOKE ALL ON FUNCTION public.autocomplete_stale_bookings() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.autocomplete_stale_bookings() FROM anon, authenticated;
