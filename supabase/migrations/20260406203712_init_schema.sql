CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Perfiles
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'sitter', 'admin')) DEFAULT 'owner',
  verification_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Espacios del Anfitrión (Estilo Airbnb)
CREATE TABLE public.spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sitter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  safety_features TEXT[],
  amenities JSONB,
  images_url TEXT[]
);

-- 3. Gatos
CREATE TABLE public.cats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  medical_notes TEXT
);

-- 4. Reservas
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.profiles(id),
  sitter_id UUID REFERENCES public.profiles(id),
  cat_id UUID REFERENCES public.cats(id),
  status TEXT CHECK (status IN ('pending', 'paid', 'active', 'completed', 'cancelled')) DEFAULT 'pending'
);

-- 5. Logs de Monitoreo (Realtime)
CREATE TABLE public.monitoring_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  sitter_id UUID REFERENCES public.profiles(id),
  event_type TEXT,
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Seguridad RLS Básica
ALTER TABLE public.monitoring_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own logs" ON public.monitoring_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.bookings WHERE bookings.id = monitoring_logs.booking_id AND bookings.owner_id = auth.uid())
);
