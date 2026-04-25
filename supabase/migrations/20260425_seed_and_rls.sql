-- ============================================================
-- RLS: lectura pública en spaces, visiters, profiles
-- (cualquiera puede explorar sin estar logueado)
-- ============================================================

ALTER TABLE public.spaces   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visiters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;

-- Spaces: lectura pública, escritura solo para el host dueño
DROP POLICY IF EXISTS "Public read spaces"  ON public.spaces;
DROP POLICY IF EXISTS "Host manage spaces"  ON public.spaces;
CREATE POLICY "Public read spaces"  ON public.spaces FOR SELECT USING (true);
CREATE POLICY "Host manage spaces"  ON public.spaces FOR ALL   USING (auth.uid() = host_id);

-- Visiters: lectura pública, escritura solo para el host dueño
DROP POLICY IF EXISTS "Public read visiters" ON public.visiters;
DROP POLICY IF EXISTS "Host manage visiters" ON public.visiters;
CREATE POLICY "Public read visiters" ON public.visiters FOR SELECT USING (true);
CREATE POLICY "Host manage visiters" ON public.visiters FOR ALL   USING (auth.uid() = host_id);

-- Profiles: lectura pública, edición solo propia
DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "User manage own profile" ON public.profiles;
CREATE POLICY "Public read profiles"      ON public.profiles FOR SELECT USING (true);
CREATE POLICY "User manage own profile"   ON public.profiles FOR ALL    USING (auth.uid() = id);

-- Pets: solo el dueño
DROP POLICY IF EXISTS "Owner manage pets" ON public.pets;
CREATE POLICY "Owner manage pets" ON public.pets FOR ALL USING (auth.uid() = owner_id);

-- Bookings: solo el dueño de la reserva
DROP POLICY IF EXISTS "Owner manage bookings" ON public.bookings;
CREATE POLICY "Owner manage bookings" ON public.bookings FOR ALL USING (auth.uid() = owner_id);

-- Messages: participantes de la reserva
DROP POLICY IF EXISTS "Booking participants read messages" ON public.messages;
DROP POLICY IF EXISTS "Booking participants insert messages" ON public.messages;
CREATE POLICY "Booking participants read messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = messages.booking_id
        AND bookings.owner_id = auth.uid()
    )
  );
CREATE POLICY "Booking participants insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Host applications: solo el solicitante
DROP POLICY IF EXISTS "Applicant manage applications" ON public.host_applications;
CREATE POLICY "Applicant manage applications"
  ON public.host_applications FOR ALL USING (auth.uid() = applicant_id);


-- ============================================================
-- SEED: usuarios demo en auth.users (necesario por FK profiles_id_fkey)
-- ============================================================

INSERT INTO auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
)
VALUES
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'ana.garcia.demo@apapacha.pet',
  '', NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}', '{}',
  false, '', '', '', ''
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'carlos.mendoza.demo@apapacha.pet',
  '', NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"]}', '{}',
  false, '', '', '', ''
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED: perfil demo de host (UUID fijo para las FK)
-- ============================================================

INSERT INTO public.profiles (id, full_name, avatar_url, role, kyc_status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Ana García',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format',
  'host',
  'verified',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, avatar_url, role, kyc_status, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Carlos Mendoza',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format',
  'host',
  'verified',
  NOW()
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SEED: Spaces (hospedajes)
-- ============================================================

INSERT INTO public.spaces (id, host_id, title, description, location, price_per_night, rating, image_urls, features, active)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Departamento Pet-Friendly Las Condes',
  'Espacioso departamento en piso 8 con balcón cerrado. Sin perros. Máximo 2 gatos. Cámara de monitoreo 24/7 incluida.',
  'Las Condes, Santiago',
  22000,
  4.9,
  ARRAY[
    'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=600&auto=format',
    'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600&auto=format'
  ],
  ARRAY['Patio Cerrado', 'Sin Otros Gatos', 'Rascadores Premium'],
  true
),
(
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Casa con Jardín Seguro Providencia',
  'Casa con jardín completamente cercado. Zona exclusiva para gatos. Experiencia de 5 años con felinos.',
  'Providencia, Santiago',
  18000,
  4.7,
  ARRAY[
    'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format',
    'https://images.unsplash.com/photo-1511044568932-338cba0ad803?w=600&auto=format'
  ],
  ARRAY['Patio Cerrado', 'Rascadores Premium'],
  true
),
(
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'Estudio Tranquilo Ñuñoa',
  'Estudio acogedor sin animales propios. Perfecto para gatos tímidos o con necesidades especiales.',
  'Ñuñoa, Santiago',
  14000,
  4.5,
  ARRAY[
    'https://images.unsplash.com/photo-1533743983669-94fa5c4338ec?w=600&auto=format'
  ],
  ARRAY['Sin Otros Gatos'],
  true
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- SEED: Visiters
-- ============================================================

INSERT INTO public.visiters (id, host_id, name, profession_title, bio, price_per_visit, rating, total_visits, image_url, active)
VALUES (
  'b0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Ana García',
  'Técnica Veterinaria',
  'Técnica veterinaria con 7 años de experiencia. Especialista en felinos. Puedo administrar medicamentos, revisar signos vitales y enviarte fotos y videos en cada visita.',
  15000,
  5.0,
  47,
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format',
  true
),
(
  'b0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'Carlos Mendoza',
  'Cuidador Certificado',
  'Amante de los gatos con certificación en primeros auxilios animales. Visito 2 veces al día, limpio el arenero y envío reporte con fotos.',
  12000,
  4.8,
  23,
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format',
  true
),
(
  'b0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  'María Fernández',
  'Estudiante de Veterinaria',
  'Estudiante de último año de veterinaria. Experiencia con gatos de distintos temperamentos. Tarifa accesible con atención de calidad profesional.',
  9000,
  4.6,
  11,
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&auto=format',
  true
)
ON CONFLICT (id) DO NOTHING;
