-- ============================================================
-- Fix: reviews.reviewer_id y host_id referenciaban auth.users(id)
-- en lugar de profiles(id) (inconsistente con el resto de tablas).
-- Por eso getHostReviews() con embed `profiles!reviewer_id(...)`
-- lanzaba PGRST200 "Could not find a relationship between 'reviews'
-- and 'profiles'", rompiendo la sección de reseñas en SpaceDetail,
-- VisiterDetail y HostDashboard.
-- profiles.id == auth.users.id (1:1), sin filas huérfanas → seguro.
-- ============================================================

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_host_id_fkey;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_reviewer_id_fkey
  FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_host_id_fkey
  FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
