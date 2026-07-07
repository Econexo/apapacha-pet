-- ============================================================
-- Fix: los correos por trigger (welcome, booking_confirm,
-- application_received) NUNCA se enviaban. Tres causas:
--
--   1. La extensión pg_net NO estaba instalada en remoto →
--      net.http_post() no existía → el trigger lanzaba error
--      que el bloque EXCEPTION de call_send_email tragaba en
--      silencio.
--   2. El config app.supabase_functions_url / app.trigger_secret
--      estaba NULL (ALTER DATABASE requiere superuser y la
--      Management API no lo permite). Solución: embeber la URL y
--      el secret directamente en la función SECURITY DEFINER
--      (schema private, no accesible vía API pública).
--   3. call_send_email pasaba `body := payload::text` a
--      net.http_post, que espera `body jsonb`. El cast a text
--      rompía la resolución de la función → error tragado.
--      Se corrige pasando `body := payload` (jsonb).
--
-- IMPORTANTE: reemplaza __TRIGGER_SECRET__ por el valor real del
-- secret TRIGGER_SECRET de la Edge Function (Supabase → Edge
-- Functions → Secrets). NO se commitea el valor real al repo.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION private.call_send_email(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_url    text := 'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1';
  v_secret text := '__TRIGGER_SECRET__';
BEGIN
  PERFORM net.http_post(
    url     := v_url || '/send-email',
    body    := payload,   -- jsonb (NO ::text: net.http_post espera jsonb)
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'x-trigger-secret', v_secret
               )
  );
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear la transacción principal si el correo falla
  RAISE WARNING '[send-email] pg_net call failed: %', SQLERRM;
END;
$fn$;
