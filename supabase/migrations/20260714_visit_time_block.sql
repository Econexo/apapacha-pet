-- Visitas: el cliente elige BLOQUE horario (AM / PM), no una hora exacta.
-- La hora puntual se coordina entre cliente y cuidador por chat.
--   time_block: 'am' (06:00–12:00) | 'pm' (13:00–21:00)
-- Un bloque NO es exclusivo: el cuidador puede hacer varias visitas en la misma
-- jornada, por eso se elimina la validación de "slot ya tomado".

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS time_block text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_time_block_check') THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_time_block_check CHECK (time_block IS NULL OR time_block IN ('am','pm'));
  END IF;
END $$;

-- Ya no se usa: la hora exacta no se agenda desde la app.
DROP FUNCTION IF EXISTS public.get_visiter_taken_slots(uuid);

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
  v_from    time;
  v_to      time;
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
    -- Visita: fechas puntuales + bloque AM/PM
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

      -- El bloque elegido debe estar dentro de la jornada declarada por el cuidador
      IF NEW.time_block IS NOT NULL THEN
        v_from := COALESCE(NULLIF(av->>'from','')::time, '06:00'::time);
        v_to   := COALESCE(NULLIF(av->>'to','')::time,   '21:00'::time);
        IF NEW.time_block = 'am' AND v_from > '12:00'::time THEN
          RAISE EXCEPTION 'El cuidador no realiza visitas en la mañana.';
        END IF;
        IF NEW.time_block = 'pm' AND v_to < '13:00'::time THEN
          RAISE EXCEPTION 'El cuidador no realiza visitas en la tarde.';
        END IF;
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
