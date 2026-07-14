-- Enforcement de disponibilidad en el agendamiento.
--   1. RPC get_service_booked_dates: expone SOLO los rangos ocupados de un
--      servicio (sin PII) para que el cliente pinte el calendario. El cliente
--      no puede leer reservas ajenas por RLS, por eso es SECURITY DEFINER.
--   2. Trigger BEFORE INSERT: valida integridad del lado servidor —
--      rechaza noches fuera de la disponibilidad del cuidador (día de semana
--      no aceptado o fecha bloqueada) y, para alojamiento, choques de fechas.

CREATE OR REPLACE FUNCTION public.get_service_booked_dates(p_service_type text, p_service_id uuid)
RETURNS TABLE(start_date date, end_date date)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT start_date, end_date
  FROM public.bookings
  WHERE service_type = p_service_type
    AND service_id = p_service_id
    AND status <> 'cancelled';
$$;

REVOKE ALL ON FUNCTION public.get_service_booked_dates(text, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_service_booked_dates(text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_booking_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  av       jsonb;
  wds      int[];
  blocked  text[];
  d        date;
  n_overlap int;
BEGIN
  IF NEW.service_type = 'space' THEN
    SELECT availability INTO av FROM public.spaces WHERE id = NEW.service_id;
  ELSE
    SELECT availability INTO av FROM public.visiters WHERE id = NEW.service_id;
  END IF;

  IF av IS NOT NULL THEN
    wds     := ARRAY(SELECT jsonb_array_elements_text(av->'weekdays'))::int[];
    blocked := ARRAY(SELECT jsonb_array_elements_text(av->'blocked_dates'));

    d := NEW.start_date;
    WHILE d < NEW.end_date LOOP
      -- extract(dow) 0=Dom..6=Sáb, igual que JS getDay()
      IF array_length(wds, 1) IS NOT NULL AND NOT (extract(dow FROM d)::int = ANY(wds)) THEN
        RAISE EXCEPTION 'El cuidador no acepta reservas para el % (día no disponible).', to_char(d, 'DD/MM/YYYY');
      END IF;
      IF to_char(d, 'YYYY-MM-DD') = ANY(blocked) THEN
        RAISE EXCEPTION 'La fecha % no está disponible.', to_char(d, 'DD/MM/YYYY');
      END IF;
      d := d + 1;
    END LOOP;
  END IF;

  -- Doble reserva: solo alojamiento (un espacio aloja una reserva a la vez)
  IF NEW.service_type = 'space' THEN
    SELECT count(*) INTO n_overlap
    FROM public.bookings b
    WHERE b.service_type = 'space'
      AND b.service_id = NEW.service_id
      AND b.status <> 'cancelled'
      AND b.id IS DISTINCT FROM NEW.id
      AND daterange(b.start_date, b.end_date, '[)') && daterange(NEW.start_date, NEW.end_date, '[)');
    IF n_overlap > 0 THEN
      RAISE EXCEPTION 'Esas fechas ya están reservadas para este alojamiento.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_availability ON public.bookings;
CREATE TRIGGER trg_validate_booking_availability
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_availability();
