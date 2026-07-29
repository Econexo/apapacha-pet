-- Avisa a la contraparte cuando llega un mensaje de chat.
-- Inserta en `notifications`, así hereda el Web Push de trg_push_on_notification.

CREATE OR REPLACE FUNCTION public.notify_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_booking     public.bookings%ROWTYPE;
  v_host_id     uuid;
  v_destino     uuid;
  v_titulo      text;
  v_cuerpo      text;
  v_existente   uuid;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = NEW.booking_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Host del servicio (service_id es polimórfico según service_type).
  IF v_booking.service_type = 'space' THEN
    SELECT host_id, title INTO v_host_id, v_titulo FROM public.spaces WHERE id = v_booking.service_id;
  ELSE
    SELECT host_id, name  INTO v_host_id, v_titulo FROM public.visiters WHERE id = v_booking.service_id;
  END IF;

  -- El destinatario es siempre el OTRO participante.
  IF NEW.sender_id = v_booking.owner_id THEN
    v_destino := v_host_id;
  ELSE
    v_destino := v_booking.owner_id;
  END IF;

  IF v_destino IS NULL OR v_destino = NEW.sender_id THEN RETURN NEW; END IF;

  v_cuerpo := CASE
    WHEN NEW.content IS NOT NULL AND btrim(NEW.content) <> '' THEN left(NEW.content, 80)
    WHEN NEW.video_url IS NOT NULL THEN '🎥 Video'
    WHEN NEW.image_url IS NOT NULL THEN '📷 Foto'
    ELSE 'Nuevo mensaje'
  END;

  -- Anti-spam: si ya hay una notificación de este chat sin leer y reciente
  -- (< 5 min), la actualizamos en vez de insertar. El push solo se dispara en el
  -- INSERT, así que una ráfaga de mensajes no genera una ráfaga de pushes, pero
  -- un mensaje horas después sí vuelve a avisar.
  SELECT id INTO v_existente
    FROM public.notifications
   WHERE user_id = v_destino
     AND type = 'new_message'
     AND read = false
     AND data->>'booking_id' = NEW.booking_id::text
     AND created_at > now() - interval '5 minutes'
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_existente IS NOT NULL THEN
    UPDATE public.notifications
       SET body = v_cuerpo, created_at = now()
     WHERE id = v_existente;
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_destino,
      'new_message',
      COALESCE(v_titulo, 'Nuevo mensaje'),
      v_cuerpo,
      jsonb_build_object('booking_id', NEW.booking_id)
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca impedir el envío de un mensaje por un fallo de notificación.
  RAISE WARNING '[notify_on_new_message] %', SQLERRM;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_notify_on_new_message ON public.messages;
CREATE TRIGGER trg_notify_on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_message();
