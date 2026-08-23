-- Quién puede cambiar qué en una reserva.  APLICADA Y VERIFICADA 2026-08-22.
--
-- Las políticas RLS deciden SI puedes actualizar la fila, no QUÉ columnas. Con
-- "Owner manage bookings" FOR ALL el cliente podía editar cualquier campo de su
-- propia reserva: status, payment_status, total_price. Este trigger pone la
-- frontera por columna, que es lo que RLS no sabe hacer.
--
-- Reparto:
--   · admin            → todo
--   · cuidador         → status, service_phase, host_response (nunca dinero)
--   · cliente          → payment_receipt_url y payment_status solo a 'receipt_submitted'
--   · sin JWT          → exento (pg_cron: autocomplete_stale_bookings)
--   · app.booking_trusted='1' → exento (cancel_booking, que ya valida al actor)
--
-- Verificado con JWT simulado sobre datos reales, todo en transacciones
-- revertidas (7/7):
--   cliente se auto-activa            → BLOQUEADO
--   cliente sube comprobante          → permitido
--   cuidador avanza el servicio       → permitido
--   cuidador toca precio/pago         → BLOQUEADO
--   admin confirma el pago            → permitido
--   vía de confianza (cancelación)    → permitida
--   contexto sin JWT (cron)           → permitido

-- La definición exacta aplicada está en producción; este archivo la refleja.
-- (Ver también 20260822_fix_approve_host_publico.sql y
--  20260822_notification_url_por_rol.sql, aplicadas el mismo día.)

CREATE OR REPLACE FUNCTION public.guard_booking_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_host uuid;
BEGIN
  IF current_setting('request.jwt.claims', true) IS NULL THEN
    RETURN NEW;
  END IF;

  IF coalesce(current_setting('app.booking_trusted', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  v_host := public.booking_host_id(OLD.service_type, OLD.service_id);

  -- Cuidador: solo el avance del servicio. Nunca el dinero.
  IF v_host IS NOT NULL AND v_host = auth.uid() THEN
    IF NEW.id                  IS DISTINCT FROM OLD.id
    OR NEW.owner_id            IS DISTINCT FROM OLD.owner_id
    OR NEW.pet_id              IS DISTINCT FROM OLD.pet_id
    OR NEW.service_type        IS DISTINCT FROM OLD.service_type
    OR NEW.service_id          IS DISTINCT FROM OLD.service_id
    OR NEW.start_date          IS DISTINCT FROM OLD.start_date
    OR NEW.end_date            IS DISTINCT FROM OLD.end_date
    OR NEW.total_price         IS DISTINCT FROM OLD.total_price
    OR NEW.insurance_included  IS DISTINCT FROM OLD.insurance_included
    OR NEW.payment_status      IS DISTINCT FROM OLD.payment_status
    OR NEW.payment_receipt_url IS DISTINCT FROM OLD.payment_receipt_url
    OR NEW.refund_percent      IS DISTINCT FROM OLD.refund_percent
    OR NEW.refund_amount       IS DISTINCT FROM OLD.refund_amount
    OR NEW.visit_dates         IS DISTINCT FROM OLD.visit_dates
    OR NEW.start_time          IS DISTINCT FROM OLD.start_time
    OR NEW.time_block          IS DISTINCT FROM OLD.time_block
    THEN
      RAISE EXCEPTION 'Un cuidador solo puede cambiar el estado del servicio, no los datos ni el pago de la reserva.';
    END IF;
    RETURN NEW;
  END IF;

  -- Cliente: solo subir su comprobante.
  IF OLD.owner_id = auth.uid() THEN
    IF NEW.id                  IS DISTINCT FROM OLD.id
    OR NEW.owner_id            IS DISTINCT FROM OLD.owner_id
    OR NEW.pet_id              IS DISTINCT FROM OLD.pet_id
    OR NEW.service_type        IS DISTINCT FROM OLD.service_type
    OR NEW.service_id          IS DISTINCT FROM OLD.service_id
    OR NEW.start_date          IS DISTINCT FROM OLD.start_date
    OR NEW.end_date            IS DISTINCT FROM OLD.end_date
    OR NEW.status              IS DISTINCT FROM OLD.status
    OR NEW.total_price         IS DISTINCT FROM OLD.total_price
    OR NEW.insurance_included  IS DISTINCT FROM OLD.insurance_included
    OR NEW.service_phase       IS DISTINCT FROM OLD.service_phase
    OR NEW.host_response       IS DISTINCT FROM OLD.host_response
    OR NEW.cancelled_by        IS DISTINCT FROM OLD.cancelled_by
    OR NEW.cancelled_at        IS DISTINCT FROM OLD.cancelled_at
    OR NEW.cancellation_reason IS DISTINCT FROM OLD.cancellation_reason
    OR NEW.refund_percent      IS DISTINCT FROM OLD.refund_percent
    OR NEW.refund_amount       IS DISTINCT FROM OLD.refund_amount
    OR NEW.visit_dates         IS DISTINCT FROM OLD.visit_dates
    OR NEW.start_time          IS DISTINCT FROM OLD.start_time
    OR NEW.time_block          IS DISTINCT FROM OLD.time_block
    THEN
      RAISE EXCEPTION 'Solo puedes adjuntar tu comprobante de pago; el resto de la reserva lo gestionan el cuidador y el equipo.';
    END IF;

    IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
       AND NEW.payment_status <> 'receipt_submitted' THEN
      RAISE EXCEPTION 'El pago lo confirma el equipo de ApapachaPet tras revisar el comprobante.';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'No autorizado para modificar esta reserva.';
END;
$fn$;

DROP TRIGGER IF EXISTS trg_guard_booking_update ON public.bookings;
CREATE TRIGGER trg_guard_booking_update
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_update();

REVOKE ALL ON FUNCTION public.guard_booking_update() FROM PUBLIC, anon, authenticated;

-- cancel_booking lleva ahora set_config('app.booking_trusted','1',true) antes de
-- su UPDATE, y se le revocó el EXECUTE de anon.
REVOKE ALL ON FUNCTION public.cancel_booking(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_booking(uuid, text) TO authenticated;
