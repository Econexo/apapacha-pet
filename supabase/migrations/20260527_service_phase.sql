-- Add service_phase to bookings for host-driven status tracking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_phase TEXT NOT NULL DEFAULT 'not_started'
  CHECK (service_phase IN ('not_started', 'in_progress'));

-- Update RLS: owners can read their own bookings (already exists), hosts can update phase
-- Existing policy covers SELECT; add UPDATE for hosts via service function
-- No new policy needed — hosts already have UPDATE through service-role calls / existing policies
