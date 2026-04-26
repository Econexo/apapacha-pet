-- ============================================================
-- reviews: reseñas de clientes a cuidadores
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  tip_amount    INTEGER NOT NULL DEFAULT 0,  -- CLP, 0 = sin propina
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id)  -- una sola reseña por reserva
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Lectura: el propio host puede ver sus reseñas, el reviewer las suyas, y lectura pública
DROP POLICY IF EXISTS "Public read reviews" ON public.reviews;
CREATE POLICY "Public read reviews"
  ON public.reviews FOR SELECT USING (true);

-- Insertar: solo el reviewer (dueño de la reserva)
DROP POLICY IF EXISTS "Reviewer create review" ON public.reviews;
CREATE POLICY "Reviewer create review"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Actualizar: solo el reviewer puede editar su reseña
DROP POLICY IF EXISTS "Reviewer update review" ON public.reviews;
CREATE POLICY "Reviewer update review"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = reviewer_id);
