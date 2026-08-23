-- URGENTE — escalada de privilegios sin autenticar.
--
-- `approve_host` es SECURITY DEFINER y la migración original (20260425_host_flow)
-- le hizo GRANT a `authenticated` pero NUNCA revocó el EXECUTE que PostgreSQL
-- concede a PUBLIC por defecto. Resultado: cualquiera con la anon key —que viaja
-- en el bundle JS y por tanto es pública— podía llamarla y:
--   · poner role='host' a cualquier usuario (saltándose KYC, contrato y revisión)
--   · marcar su postulación como aprobada
-- Verificado en producción: la llamada como anon devolvía HTTP 204, no 401.
--
-- Dos capas de arreglo, porque una sola no basta:
--   1. Guarda de autorización DENTRO de la función (aunque alguien vuelva a
--      conceder EXECUTE de más, sin ser admin no hace nada).
--   2. REVOKE del EXECUTE por defecto de PUBLIC.

CREATE OR REPLACE FUNCTION public.approve_host(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'No autorizado: solo un administrador puede aprobar cuidadores.';
  END IF;

  UPDATE public.profiles
     SET role = 'host'
   WHERE id = target_user_id;

  UPDATE public.host_applications
     SET status = 'approved'
   WHERE applicant_id = target_user_id
     AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.approve_host(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_host(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.approve_host(uuid) TO authenticated;

-- Mismo patrón (SECURITY DEFINER sin REVOKE). Solo las llaman triggers, así que
-- ningún cliente necesita EXECUTE. Sin esto, cualquiera podía inyectar avisos
-- con texto arbitrario en la bandeja de los administradores.
REVOKE ALL ON FUNCTION public.insert_admin_notifications(text, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.insert_admin_notifications(text, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.insert_admin_notifications(text, text, text, jsonb) FROM authenticated;

REVOKE ALL ON FUNCTION public.recalcular_total_visits(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalcular_total_visits(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.recalcular_total_visits(uuid) FROM authenticated;
