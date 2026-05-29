-- Requires: pg_net extension and the send-email Edge Function deployed with TRIGGER_SECRET set.
-- Replace 'YOUR_PROJECT_REF' with the actual Supabase project reference.

-- ─── Helper: call the send-email Edge Function via pg_net ─────────────────────
CREATE OR REPLACE FUNCTION private.call_send_email(payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_url  text;
  v_secret text;
BEGIN
  v_url    := current_setting('app.supabase_functions_url', true);
  v_secret := current_setting('app.trigger_secret', true);

  PERFORM net.http_post(
    url     := v_url || '/send-email',
    headers := jsonb_build_object(
                 'Content-Type',       'application/json',
                 'x-trigger-secret',   v_secret
               ),
    body    := payload::text
  );
EXCEPTION WHEN OTHERS THEN
  -- Never block the main transaction if email fails
  RAISE WARNING '[send-email] pg_net call failed: %', SQLERRM;
END;
$$;

-- ─── 1. Welcome email — fires when onboarding_done flips to true ──────────────
CREATE OR REPLACE FUNCTION private.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.onboarding_done = true AND (OLD.onboarding_done IS DISTINCT FROM true) THEN
    PERFORM private.call_send_email(
      jsonb_build_object(
        'type',      'welcome',
        'record',    row_to_json(NEW)::jsonb
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_onboarding_done_email ON public.profiles;
CREATE TRIGGER on_onboarding_done_email
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.trigger_welcome_email();

-- ─── 2. Booking confirmation email — fires on new booking ─────────────────────
CREATE OR REPLACE FUNCTION private.trigger_booking_confirm_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM private.call_send_email(
    jsonb_build_object(
      'type',   'booking_confirm',
      'record', row_to_json(NEW)::jsonb
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_created_email ON public.bookings;
CREATE TRIGGER on_booking_created_email
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION private.trigger_booking_confirm_email();

-- ─── 3. Application received email — fires on new host application ─────────────
CREATE OR REPLACE FUNCTION private.trigger_application_received_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM private.call_send_email(
    jsonb_build_object(
      'type',   'application_received',
      'record', row_to_json(NEW)::jsonb
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_application_submitted_email ON public.host_applications;
CREATE TRIGGER on_application_submitted_email
  AFTER INSERT ON public.host_applications
  FOR EACH ROW EXECUTE FUNCTION private.trigger_application_received_email();

-- Note: approval/rejection emails are sent manually from the admin panel (AdminScreen)
-- to allow including a rejection reason and avoid double-sending.

-- ─── Add rejection_reason column if missing ───────────────────────────────────
ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ─── Runtime config (set these via Supabase Dashboard → Settings → Vault / Config) ──
-- Run these manually after deploying, replacing values:
--   SELECT set_config('app.supabase_functions_url', 'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1', false);
--   SELECT set_config('app.trigger_secret', '<your_TRIGGER_SECRET_value>', false);
-- Or set them as permanent DB settings via ALTER DATABASE:
--   ALTER DATABASE postgres SET "app.supabase_functions_url" = 'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1';
--   ALTER DATABASE postgres SET "app.trigger_secret" = '<your_TRIGGER_SECRET_value>';
