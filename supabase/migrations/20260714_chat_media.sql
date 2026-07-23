-- Fotos en el chat de una reserva. Se guardan bajo chat-media/<booking_id>/...
-- y se PURGAN cuando la reserva se completa o cancela ("duran lo que dura el chat").

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url text;

-- Bucket público (paths con UUID de reserva, no adivinables) para poder mostrar
-- las imágenes inline. La ESCRITURA queda restringida a los participantes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat media upload by participants" ON storage.objects;
CREATE POLICY "chat media upload by participants" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media' AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND (
          b.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = b.service_id AND s.host_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "chat media delete by participants" ON storage.objects;
CREATE POLICY "chat media delete by participants" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-media' AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND (
          b.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = b.service_id AND s.host_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
        )
    )
  );

-- Lectura para participantes (permite listar la carpeta para borrar archivos vía Storage API).
DROP POLICY IF EXISTS "chat media read by participants" ON storage.objects;
CREATE POLICY "chat media read by participants" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'chat-media' AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id::text = (storage.foldername(name))[1]
        AND (
          b.owner_id = auth.uid()
          OR EXISTS (SELECT 1 FROM public.spaces s   WHERE s.id = b.service_id AND s.host_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.visiters v WHERE v.id = b.service_id AND v.host_id = auth.uid())
        )
    )
  );

-- Purga al terminar la reserva. NOTA: storage.protect_delete impide borrar
-- storage.objects desde SQL, así que aquí solo se desvincula la foto del chat
-- (image_url = NULL). El archivo físico se borra vía Storage API desde el cliente.
CREATE OR REPLACE FUNCTION public.purge_chat_media_on_end()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.messages SET image_url = NULL
      WHERE booking_id = NEW.id AND image_url IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purge_chat_media ON public.bookings;
CREATE TRIGGER trg_purge_chat_media
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.purge_chat_media_on_end();
