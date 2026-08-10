-- El contador de visitas de un cuidador estaba muerto.
--
-- `visiters.total_visits` se creaba en 0 (visiters.service.ts) y NADIE lo
-- actualizaba nunca: ni la app ni la base de datos. Se muestra en Explorar y en
-- el detalle del visitador, así que un cuidador con visitas reales aparecía
-- con 0 (caso reportado: "RonRRon", 2 reservas completadas y contador en 0).
--
-- En vez de incrementar, se RECALCULA desde las reservas: así no hay deriva
-- posible y arregla también las filas históricas.

CREATE OR REPLACE FUNCTION public.recalcular_total_visits(p_visiter_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $fn$
  UPDATE public.visiters v
     SET total_visits = (
       SELECT count(*)
         FROM public.bookings b
        WHERE b.service_type = 'visiter'
          AND b.service_id = v.id
          AND b.status = 'completed'
     )
   WHERE v.id = p_visiter_id;
$fn$;

CREATE OR REPLACE FUNCTION public.sync_total_visits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  -- Solo reservas de visita, y solo cuando cambia algo que afecta al conteo.
  IF (TG_OP = 'INSERT' AND NEW.service_type = 'visiter')
     OR (TG_OP = 'UPDATE' AND NEW.service_type = 'visiter'
         AND (NEW.status IS DISTINCT FROM OLD.status
              OR NEW.service_id IS DISTINCT FROM OLD.service_id)) THEN
    PERFORM public.recalcular_total_visits(NEW.service_id);
    -- Si la reserva cambió de servicio, el anterior también se recalcula.
    IF TG_OP = 'UPDATE' AND NEW.service_id IS DISTINCT FROM OLD.service_id THEN
      PERFORM public.recalcular_total_visits(OLD.service_id);
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.service_type = 'visiter' THEN
    PERFORM public.recalcular_total_visits(OLD.service_id);
    RETURN OLD;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear una reserva por el contador.
  RAISE WARNING '[sync_total_visits] %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$fn$;

DROP TRIGGER IF EXISTS trg_sync_total_visits ON public.bookings;
CREATE TRIGGER trg_sync_total_visits
  AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_total_visits();

-- Backfill: deja al día las filas existentes.
UPDATE public.visiters v
   SET total_visits = (
     SELECT count(*)
       FROM public.bookings b
      WHERE b.service_type = 'visiter'
        AND b.service_id = v.id
        AND b.status = 'completed'
   );
