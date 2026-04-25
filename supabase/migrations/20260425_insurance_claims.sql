-- supabase/migrations/20260425_insurance_claims.sql

CREATE TABLE public.insurance_claims (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claimant_id   UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  booking_id    UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('escape', 'injury', 'illness', 'property_damage', 'other')),
  description   TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved', 'rejected')),
  submitted_at  TIMESTAMPTZ DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ
);

ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;

-- Users can create and read their own claims
CREATE POLICY "Users insert own claims" ON public.insurance_claims
  FOR INSERT WITH CHECK (auth.uid() = claimant_id);

CREATE POLICY "Users read own claims" ON public.insurance_claims
  FOR SELECT USING (auth.uid() = claimant_id);
