-- El destino de una notificación de reserva depende de quién la recibe.
--
-- La pestaña "Reservas" (/reservas) solo lista las reservas donde el usuario es
-- el dueño del gato. Al cuidador le llegan las mismas notificaciones
-- (service_completed, booking_cancelled…) y al abrirlas caía en esa lista, que
-- para él está siempre vacía. Su sitio es el panel (/panel).

CREATE OR REPLACE FUNCTION public.notification_url(p_type text, p_data jsonb, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_owner  uuid;
  v_status text;
BEGIN
  IF p_type = 'new_message' AND p_data ? 'booking_id' THEN
    RETURN '/chat/' || (p_data->>'booking_id');
  END IF;

  -- Solo la recibe el cuidador.
  IF p_type = 'booking_created' THEN
    RETURN '/panel';
  END IF;

  IF p_type IN ('application_submitted', 'user_registered', 'service_published', 'receipt_submitted') THEN
    RETURN '/admin';
  END IF;

  IF p_type IN ('application_approved', 'application_rejected') THEN
    RETURN '/perfil';
  END IF;

  IF p_data ? 'booking_id' THEN
    BEGIN
      SELECT owner_id, status INTO v_owner, v_status
        FROM public.bookings
       WHERE id = (p_data->>'booking_id')::uuid;
    EXCEPTION WHEN OTHERS THEN
      RETURN '/reservas';
    END;
    -- Si no es el dueño de la reserva, es el cuidador: su lista está en el panel.
    IF v_owner IS NOT NULL AND v_owner IS DISTINCT FROM p_user_id THEN
      RETURN '/panel';
    END IF;
    RETURN '/reservas';
  END IF;

  IF p_data ? 'application_id' THEN
    RETURN '/perfil';
  END IF;

  RETURN '/';
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
    'url',     public.notification_url(NEW.type, COALESCE(NEW.data, '{}'::jsonb), NEW.user_id),
    'tag',     COALESCE('chat-' || (NEW.data->>'booking_id'), NEW.type)
  ));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING '[push_on_notification] %', SQLERRM;
  RETURN NEW;
END;
$fn$;
