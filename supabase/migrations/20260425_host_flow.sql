-- supabase/migrations/20260425_host_flow.sql

-- Update role constraint to allow 'host' (previously 'owner'/'sitter'/'admin')
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('owner', 'host', 'admin'));

-- Atomic host approval: updates profile role + application status in one call
CREATE OR REPLACE FUNCTION public.approve_host(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
    SET role = 'host'
    WHERE id = target_user_id;

  UPDATE public.host_applications
    SET status = 'approved'
    WHERE applicant_id = target_user_id
      AND status = 'pending';
END;
$$;

-- Grant execute to authenticated users so RPC call works
GRANT EXECUTE ON FUNCTION public.approve_host(UUID) TO authenticated;
