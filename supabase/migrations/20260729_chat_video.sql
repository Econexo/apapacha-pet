-- Videos en el chat. Mismo ciclo de vida que las fotos: viven lo que dura el
-- chat de la reserva y se purgan al completarla o cancelarla.

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS video_url text;

-- Límite de 25 MB y tipos permitidos en el bucket (antes solo imágenes).
UPDATE storage.buckets
   SET file_size_limit = 26214400,
       allowed_mime_types = ARRAY[
         'image/jpeg','image/png','image/webp','image/heic',
         'video/mp4','video/quicktime','video/webm'
       ]
 WHERE id = 'chat-media';

-- La purga existente solo desvinculaba image_url; ahora también video_url.
CREATE OR REPLACE FUNCTION public.purge_chat_media_on_end()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.messages
       SET image_url = NULL, video_url = NULL
     WHERE booking_id = NEW.id AND (image_url IS NOT NULL OR video_url IS NOT NULL);
  END IF;
  RETURN NEW;
END;
$$;
