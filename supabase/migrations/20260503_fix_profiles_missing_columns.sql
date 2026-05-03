-- Fix: columnas faltantes en profiles detectadas en runtime
-- signed_contract_url: definida en host_flow pero no en init_schema
-- onboarding_done: referenciada en triggers y app code

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signed_contract_url TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_done      BOOLEAN NOT NULL DEFAULT false;
