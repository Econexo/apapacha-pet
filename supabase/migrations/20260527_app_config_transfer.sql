-- Tabla de configuración de la app — datos sensibles que NO deben estar en el bundle JS
-- Solo usuarios autenticados pueden leer; nadie puede escribir desde el cliente (service role only)

CREATE TABLE IF NOT EXISTS public.app_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Lectura: solo usuarios con sesión activa (authenticated role, NO anon)
DROP POLICY IF EXISTS "Authenticated read app_config" ON public.app_config;
CREATE POLICY "Authenticated read app_config" ON public.app_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Sin políticas de INSERT/UPDATE/DELETE para el cliente:
-- los valores solo se gestionan desde el Dashboard de Supabase (service role)

-- NOTA: Insertar los datos reales MANUALMENTE en el Dashboard con:
-- INSERT INTO public.app_config (key, value) VALUES (
--   'transfer_details',
--   '{"banco":"...","tipo":"...","numero":"...","rut":"...","nombre":"...","email":"..."}'
-- );
-- NO incluir los valores reales en este archivo de migración.
