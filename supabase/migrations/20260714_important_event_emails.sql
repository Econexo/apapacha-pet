-- ============================================================
-- Correos por eventos importantes, disparados desde la BD
-- (confiable: la Edge Function corre con service_role y resuelve
-- el email; el cliente NO puede resolverlo porque auth.admin
-- requiere service_role).
--
-- Reutiliza private.call_send_email (ya desplegada con el
-- TRIGGER_SECRET embebido en 20260701_fix_email_delivery.sql).
--
-- Eventos cubiertos:
--   1. Postulación aprobada / rechazada  (host_applications.status)
--   2. Pago confirmado → reserva activa  (bookings.payment_status → 'paid')
--   3. Cuidador aceptó / rechazó reserva (bookings.host_response)
-- ============================================================

-- ─── 1. Resultado de postulación (aprobada / rechazada) ──────────────────────
CREATE OR REPLACE FUNCTION private.trigger_application_result_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    PERFORM private.call_send_email(
      jsonb_build_object('type', 'application_approved', 'record', row_to_json(NEW)::jsonb));
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    PERFORM private.call_send_email(
      jsonb_build_object('type', 'application_rejected', 'record', row_to_json(NEW)::jsonb));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_result_email ON public.host_applications;
CREATE TRIGGER on_application_result_email
  AFTER UPDATE ON public.host_applications
  FOR EACH ROW EXECUTE FUNCTION private.trigger_application_result_email();

-- ─── 2. Pago confirmado → reserva activa ─────────────────────────────────────
CREATE OR REPLACE FUNCTION private.trigger_payment_confirmed_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    PERFORM private.call_send_email(
      jsonb_build_object('type', 'payment_confirmed', 'record', row_to_json(NEW)::jsonb));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_confirmed_email ON public.bookings;
CREATE TRIGGER on_payment_confirmed_email
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION private.trigger_payment_confirmed_email();

-- ─── 3. Respuesta del cuidador (aceptó / rechazó) ────────────────────────────
CREATE OR REPLACE FUNCTION private.trigger_booking_response_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.host_response IS DISTINCT FROM OLD.host_response THEN
    IF NEW.host_response = 'accepted' THEN
      PERFORM private.call_send_email(
        jsonb_build_object('type', 'booking_accepted', 'record', row_to_json(NEW)::jsonb));
    ELSIF NEW.host_response = 'rejected' THEN
      PERFORM private.call_send_email(
        jsonb_build_object('type', 'booking_rejected', 'record', row_to_json(NEW)::jsonb));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_response_email ON public.bookings;
CREATE TRIGGER on_booking_response_email
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION private.trigger_booking_response_email();
