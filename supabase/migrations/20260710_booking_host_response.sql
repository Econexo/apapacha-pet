-- ============================================================
-- Flujo de reserva: agregar el paso de aceptación del cuidador.
-- host_response: pending (esperando al cuidador) → accepted / rejected.
-- El pago del cliente ocurre DESPUÉS de que el cuidador acepta.
-- Reservas existentes se marcan 'accepted' (ya pasaron ese paso).
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS host_response TEXT NOT NULL DEFAULT 'pending'
  CHECK (host_response IN ('pending', 'accepted', 'rejected'));

-- Backfill: las reservas ya existentes no deben quedar bloqueadas
UPDATE public.bookings SET host_response = 'accepted' WHERE host_response = 'pending';
