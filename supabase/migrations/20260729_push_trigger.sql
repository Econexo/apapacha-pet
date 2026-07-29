-- Puente notificaciones in-app → Web Push.
--
-- Decisión de diseño: el trigger cuelga de `notifications`, no de cada evento de
-- negocio. Así TODA notificación existente (reserva aceptada, pago confirmado,
-- postulación, avisos a admins) se vuelve push sin tocar los demás triggers, y
-- las futuras lo heredan gratis.

CREATE OR REPLACE FUNCTION private.call_send_push(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_url    text := 'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1';
  v_secret text := '__TRIGGER_SECRET__';
BEGIN
  PERFORM net.http_post(
    url     := v_url || '/send-push',
    body    := payload,   -- jsonb (NO ::text: net.http_post espera jsonb)
    headers := jsonb_build_object(
                 'Content-Type',     'application/json',
                 'x-trigger-secret', v_secret
               )
  );
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear la transacción principal si el push falla
  RAISE WARNING '[send-push] pg_net call failed: %', SQLERRM;
END;
$fn$;

-- Traduce tipo + data de la notificación al path de la app.
-- Espejo de src/lib/notificationRoute.ts sobre los paths de src/linking.ts.
CREATE OR REPLACE FUNCTION public.notification_url(p_type text, p_data jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT CASE
    WHEN p_type = 'new_message' AND p_data ? 'booking_id'
      THEN '/chat/' || (p_data->>'booking_id')
    WHEN p_type = 'booking_created'
      THEN '/panel'
    WHEN p_type IN ('application_submitted', 'user_registered', 'service_published', 'receipt_submitted')
      THEN '/admin'
    WHEN p_type IN ('application_approved', 'application_rejected')
      THEN '/perfil'
    WHEN p_type IN ('booking_accepted', 'booking_rejected', 'booking_confirmed',
                    'service_started', 'service_completed', 'booking_cancelled')
      THEN '/reservas'
    WHEN p_data ? 'booking_id'
      THEN '/reservas'
    WHEN p_data ? 'application_id'
      THEN '/perfil'
    ELSE '/'
  END;
$fn$;

CREATE OR REPLACE FUNCTION public.push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  PERFORM private.call_send_push(jsonb_build_object(
    'user_id', NEW.user_id,
    'title',   NEW.title,
    'body',    NEW.body,
    'url',     public.notification_url(NEW.type, COALESCE(NEW.data, '{}'::jsonb)),
    -- Agrupa por conversación cuando aplica; si no, por tipo.
    'tag',     COALESCE('chat-' || (NEW.data->>'booking_id'), NEW.type)
  ));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[push_on_notification] %', SQLERRM;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_push_on_notification ON public.notifications;
CREATE TRIGGER trg_push_on_notification
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.push_on_notification();
