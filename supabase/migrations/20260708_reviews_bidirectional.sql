-- ============================================================
-- Reseñas bidireccionales: el UNIQUE(booking_id) solo permitía UNA
-- reseña por reserva (owner→host). Para permitir también host→owner
-- (cliente calificado por el cuidador, estilo Uber), se cambia a
-- UNIQUE(booking_id, reviewer_id): cada participante reseña una vez.
-- reviews.host_id se usa como "reviewee" (a quién califican):
--   owner→host: host_id = host;  host→owner: host_id = owner.
-- ============================================================
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_booking_id_key;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_booking_reviewer_key UNIQUE (booking_id, reviewer_id);
