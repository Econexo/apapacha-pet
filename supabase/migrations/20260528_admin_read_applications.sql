-- Admins can SELECT all host applications (was missing — only UPDATE policy existed)
DROP POLICY IF EXISTS "Admins can read any application" ON public.host_applications;
CREATE POLICY "Admins can read any application" ON public.host_applications
  FOR SELECT USING (public.is_admin() OR auth.uid() = applicant_id);

-- Ensure submitted_at has a default so new rows are always timestamped
ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();

-- Add FK constraint so PostgREST can resolve profiles join
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'host_applications_applicant_id_fkey'
      AND table_name = 'host_applications'
  ) THEN
    ALTER TABLE public.host_applications
      ADD CONSTRAINT host_applications_applicant_id_fkey
      FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
