-- Configurable platform fees (read by Edge Function)
CREATE TABLE public.platform_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO platform_config (key, value) VALUES
  ('platform_fee_pct',  '10'),
  ('insurance_fee_clp', '2500'),
  ('app_fee_clp',       '4500');

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

ALTER TABLE public.platform_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read platform_config" ON public.platform_config
  FOR SELECT USING (true);
