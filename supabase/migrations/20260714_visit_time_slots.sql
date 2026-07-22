-- Visitas domiciliarias: agendamiento por FECHAS PUNTUALES + HORA.
-- Una visita no es un rango de noches: es una o varias fechas (permite
-- "día por medio") a una hora específica dentro de la ventana del cuidador.
--   visit_dates: fechas concretas de la visita (NULL para alojamiento)
--   start_time:  hora de la visita
-- start_date/end_date se mantienen (min/max) para compatibilidad de listados.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS visit_dates date[],
  ADD COLUMN IF NOT EXISTS start_time  time;

-- Slots ya tomados de un cuidador (solo fecha+hora, sin PII) para pintar el selector.
CREATE OR REPLACE FUNCTION public.get_visiter_taken_slots(p_visiter_id uuid)
RETURNS TABLE(slot_date date, slot_time time)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT unnest(COALESCE(visit_dates, ARRAY[start_date])) AS slot_date, start_time AS slot_time
  FROM public.bookings
  WHERE service_type = 'visiter'
    AND service_id = p_visiter_id
    AND status <> 'cancelled'
    AND start_time IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_visiter_taken_slots(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_visiter_taken_slots(uuid) TO authenticated;

-- Validación server-side: alojamiento por rango, visitas por fechas+hora.
CREATE OR REPLACE FUNCTION public.validate_booking_availability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  av        jsonb;
  wds       int[];
  blocked   text[];
  d         date;
  vdates    date[];
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
  END IF;

  IF NEW.service_type = 'space' THEN
    -- Alojamiento: cada noche del rango [start, end)
    IF av IS NOT NULL THEN
      d := NEW.start_date;
      WHILE d < NEW.end_date LOOP
        IF array_length(wds, 1) IS NOT NULL AND NOT (extract(dow FROM d)::int = ANY(wds)) THEN
          RAISE EXCEPTION 'El cuidador no acepta reservas para el % (día no disponible).', to_char(d, 'DD/MM/YYYY');
        END IF;
        IF to_char(d, 'YYYY-MM-DD') = ANY(blocked) THEN
          RAISE EXCEPTION 'La fecha % no está disponible.', to_char(d, 'DD/MM/YYYY');
        END IF;
        d := d + 1;
      END LOOP;
    END IF;

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

  ELSE
    -- Visita: fechas puntuales + hora
    vdates := COALESCE(NEW.visit_dates, ARRAY[NEW.start_date]);

    IF av IS NOT NULL THEN
      FOREACH d IN ARRAY vdates LOOP
        IF array_length(wds, 1) IS NOT NULL AND NOT (extract(dow FROM d)::int = ANY(wds)) THEN
          RAISE EXCEPTION 'El cuidador no realiza visitas el % (día no disponible).', to_char(d, 'DD/MM/YYYY');
        END IF;
        IF to_char(d, 'YYYY-MM-DD') = ANY(blocked) THEN
          RAISE EXCEPTION 'La fecha % no está disponible.', to_char(d, 'DD/MM/YYYY');
        END IF;
      END LOOP;

      -- Hora dentro de la ventana declarada por el cuidador
      IF NEW.start_time IS NOT NULL THEN
        IF av->>'from' IS NOT NULL AND NEW.start_time < (av->>'from')::time THEN
          RAISE EXCEPTION 'El cuidador atiende desde las %.', av->>'from';
        END IF;
        IF av->>'to' IS NOT NULL AND NEW.start_time > (av->>'to')::time THEN
          RAISE EXCEPTION 'El cuidador atiende hasta las %.', av->>'to';
        END IF;
      END IF;
    END IF;

    -- Choque de slot: mismo cuidador, misma fecha, misma hora
    IF NEW.start_time IS NOT NULL THEN
      SELECT count(*) INTO n_overlap
      FROM public.bookings b
      WHERE b.service_type = 'visiter'
        AND b.service_id = NEW.service_id
        AND b.status <> 'cancelled'
        AND b.id IS DISTINCT FROM NEW.id
        AND b.start_time = NEW.start_time
        AND COALESCE(b.visit_dates, ARRAY[b.start_date]) && vdates;
      IF n_overlap > 0 THEN
        RAISE EXCEPTION 'Ese horario ya está reservado. Elige otra hora o fecha.';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_availability ON public.bookings;
CREATE TRIGGER trg_validate_booking_availability
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_availability();
