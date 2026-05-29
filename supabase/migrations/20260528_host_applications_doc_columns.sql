-- Add document URL columns to host_applications (were missing from initial schema)
ALTER TABLE public.host_applications
  ADD COLUMN IF NOT EXISTS kyc_doc_url        TEXT,
  ADD COLUMN IF NOT EXISTS selfie_url         TEXT,
  ADD COLUMN IF NOT EXISTS safety_evidence_url TEXT,
  ADD COLUMN IF NOT EXISTS evidence_url_2     TEXT;
