-- Actualizaciones en vivo de reservas (cambios de estado se reflejan sin refrescar).
-- RLS sigue aplicando: cada usuario solo recibe eventos de las reservas que puede ver.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
END $$;
