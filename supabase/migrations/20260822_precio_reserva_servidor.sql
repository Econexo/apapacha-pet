-- El precio lo fija el servidor, no el navegador.  APLICADA Y VERIFICADA 2026-08-22.
--
-- total_price llegaba calculado desde el cliente en el INSERT y nadie lo
-- recomprobaba: bastaba una petición a la API con la anon key —que viaja en el
-- bundle— para crear una reserva por $1. El trigger recalcula desde la tarifa
-- vigente del servicio y sobrescribe lo que venga, así el importe guardado
-- —el mismo que ve el cliente en las instrucciones de transferencia— es el real.
--
-- Fórmula verificada contra las 9 reservas existentes: reproduce el total
-- guardado en TODAS, incluidas las antiguas que llevaban el seguro de 2500.
-- Probada además con INSERT real en transacción revertida:
--   alojamiento 3 noches enviado a $1  → guardado 40500 (12000*3+4500)
--   visitas 2 fechas enviadas a $0     → guardado 32500 (14000*2+4500)

CREATE OR REPLACE FUNCTION public.set_booking_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_tarifa   integer;
  v_unidades integer;
  v_total    integer;
BEGIN
  IF NEW.service_type = 'space' THEN
    SELECT price_per_night INTO v_tarifa FROM public.spaces WHERE id = NEW.service_id;
    v_unidades := GREATEST(1, NEW.end_date - NEW.start_date);
  ELSE
    SELECT price_per_visit INTO v_tarifa FROM public.visiters WHERE id = NEW.service_id;
    v_unidades := GREATEST(1, COALESCE(array_length(NEW.visit_dates, 1), 1));
  END IF;

  IF v_tarifa IS NULL THEN
    RAISE EXCEPTION 'El servicio no existe o no tiene tarifa publicada.';
  END IF;

  v_total := v_tarifa * v_unidades
             + 4500
             + CASE WHEN COALESCE(NEW.insurance_included, false) THEN 2500 ELSE 0 END;

  NEW.total_price := v_total;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_set_booking_price ON public.bookings;
CREATE TRIGGER trg_set_booking_price
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_booking_price();

REVOKE ALL ON FUNCTION public.set_booking_price() FROM PUBLIC, anon, authenticated;
