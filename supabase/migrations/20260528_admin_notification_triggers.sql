-- ============================================================
-- Admin notification triggers (SECURITY DEFINER)
-- Reason: client-side insertNotificationsForAdmins() can't SELECT
-- profiles.is_admin due to RLS when called by non-admin users.
-- These triggers run server-side with full permissions.
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_admin_notifications(
  p_type  TEXT,
  p_title TEXT,
  p_body  TEXT,
  p_data  JSONB DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE is_admin = true LOOP
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (rec.id, p_type, p_title, p_body, p_data);
  END LOOP;
END;
$$;

-- ── 1. Nueva postulación de cuidador ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fn_admin_new_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.insert_admin_notifications(
    'application_submitted',
    'Nueva postulación de cuidador',
    'Un usuario envió una solicitud de tipo ' ||
      CASE WHEN NEW.service_type = 'space' THEN 'Alojamiento' ELSE 'Visita' END ||
      '. Revísala en el panel de postulaciones.',
    jsonb_build_object('applicant_id', NEW.applicant_id, 'service_type', NEW.service_type)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_new_application ON public.host_applications;
CREATE TRIGGER trg_admin_new_application
  AFTER INSERT ON public.host_applications
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_admin_new_application();

-- ── 2. Nueva reserva creada ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fn_admin_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.insert_admin_notifications(
    'booking_created',
    'Nueva reserva creada',
    'Un cliente creó una reserva de ' ||
      CASE WHEN NEW.service_type = 'space' THEN 'Alojamiento' ELSE 'Visita' END ||
      ' para el ' || TO_CHAR(NEW.start_date::date, 'DD/MM/YYYY') || '.',
    jsonb_build_object('booking_id', NEW.id, 'service_type', NEW.service_type)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_new_booking ON public.bookings;
CREATE TRIGGER trg_admin_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_admin_new_booking();

-- ── 3. Comprobante de pago enviado ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fn_admin_receipt_submitted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_receipt_url IS NOT NULL
     AND (OLD.payment_receipt_url IS NULL OR OLD.payment_receipt_url = '')
  THEN
    PERFORM public.insert_admin_notifications(
      'receipt_submitted',
      'Comprobante de pago recibido',
      'Un cliente subió un comprobante de transferencia. Revísalo en el panel de pagos.',
      jsonb_build_object('booking_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_receipt_submitted ON public.bookings;
CREATE TRIGGER trg_admin_receipt_submitted
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_admin_receipt_submitted();

-- ── 4. Nuevo usuario completó su perfil ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fn_admin_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when onboarding_done transitions to true
  IF NEW.onboarding_done = true
     AND (OLD.onboarding_done IS DISTINCT FROM true)
  THEN
    PERFORM public.insert_admin_notifications(
      'user_registered',
      'Nuevo usuario registrado',
      COALESCE(NEW.full_name, 'Un usuario') || ' ' ||
        COALESCE(NEW.last_name, '') ||
        ' completó su perfil y se unió a ApapachaPet.',
      jsonb_build_object('user_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_new_user ON public.profiles;
CREATE TRIGGER trg_admin_new_user
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_admin_new_user();

-- ── 5. Nuevo espacio publicado ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fn_admin_new_space()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.insert_admin_notifications(
    'service_published',
    'Nuevo espacio publicado',
    'Un cuidador publicó un alojamiento: "' || NEW.title || '".',
    jsonb_build_object('space_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_new_space ON public.spaces;
CREATE TRIGGER trg_admin_new_space
  AFTER INSERT ON public.spaces
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_admin_new_space();

-- ── 6. Nuevo perfil de visita publicado ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fn_admin_new_visiter()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.insert_admin_notifications(
    'service_published',
    'Nuevo perfil de visita publicado',
    'Un cuidador publicó un servicio de visita: "' || NEW.name || '".',
    jsonb_build_object('visiter_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_new_visiter ON public.visiters;
CREATE TRIGGER trg_admin_new_visiter
  AFTER INSERT ON public.visiters
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_admin_new_visiter();
