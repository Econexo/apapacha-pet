-- Admins can SELECT all host applications (was missing — only UPDATE policy existed)
DROP POLICY IF EXISTS "Admins can read any application" ON public.host_applications;
CREATE POLICY "Admins can read any application" ON public.host_applications
  FOR SELECT USING (public.is_admin() OR auth.uid() = applicant_id);

-- Ensure submitted_at has a default so new rows are always timestamped
ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ DEFAULT NOW();
