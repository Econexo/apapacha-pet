-- Reportes de estado del gato durante un servicio en curso.
--
-- Antes, HomeScreen mostraba un "Estado actual" FABRICADO:
--   MOOD_STATES[pet.id.charCodeAt(2) % MOOD_STATES.length]
-- es decir, un ánimo elegido con un hash del UUID del gato. El dueño veía
-- información inventada sobre su mascota durante un servicio real, y el
-- cuidador no tenía ningún sitio donde reportarla. Esta tabla lo hace real.

CREATE TABLE IF NOT EXISTS public.pet_reports (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  author_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mood       text NOT NULL CHECK (mood IN ('jugueton', 'tranquilo', 'feliz', 'descansando', 'curioso', 'decaido')),
  note       text,
  photo_url  text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_reports_booking ON public.pet_reports(booking_id, created_at DESC);

ALTER TABLE public.pet_reports ENABLE ROW LEVEL SECURITY;

-- Escribe solo el cuidador del servicio de esa reserva.
DROP POLICY IF EXISTS "Host writes pet reports" ON public.pet_reports;
CREATE POLICY "Host writes pet reports" ON public.pet_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (
        EXISTS (SELECT 1 FROM public.spaces   s WHERE s.id = b.service_id AND s.host_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
      )
    )
  );

-- Leen ambas partes de la reserva.
DROP POLICY IF EXISTS "Participants read pet reports" ON public.pet_reports;
CREATE POLICY "Participants read pet reports" ON public.pet_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (
        b.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.spaces   s WHERE s.id = b.service_id AND s.host_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
      )
    )
  );

-- Avisar al dueño en cuanto hay reporte nuevo. El INSERT en notifications
-- dispara además el Web Push por el trigger trg_push_on_notification.
CREATE OR REPLACE FUNCTION public.notify_owner_on_pet_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_owner uuid;
BEGIN
  SELECT owner_id INTO v_owner FROM public.bookings WHERE id = NEW.booking_id;
  IF v_owner IS NULL OR v_owner = NEW.author_id THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, body, data)
  VALUES (
    v_owner,
    'pet_report',
    'Nuevo reporte de tu gato',
    COALESCE(NULLIF(btrim(NEW.note), ''), 'Tu cuidador actualizó el estado de tu gato.'),
    jsonb_build_object('booking_id', NEW.booking_id)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca impedir el reporte por un fallo de notificación.
  RAISE WARNING '[notify_owner_on_pet_report] %', SQLERRM;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notify_owner_on_pet_report ON public.pet_reports;
CREATE TRIGGER trg_notify_owner_on_pet_report
  AFTER INSERT ON public.pet_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_owner_on_pet_report();
