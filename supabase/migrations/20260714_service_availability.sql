-- Disponibilidad por servicio (agendamiento con calendario).
-- weekdays: días de la semana aceptados (0=Dom .. 6=Sáb)
-- blocked_dates: fechas específicas bloqueadas por el cuidador ('YYYY-MM-DD')
-- from/to: horario (check-in/out para alojamiento; ventana de visita para visitas)
ALTER TABLE public.spaces
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL
  DEFAULT '{"weekdays":[0,1,2,3,4,5,6],"blocked_dates":[]}'::jsonb;

ALTER TABLE public.visiters
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL
  DEFAULT '{"weekdays":[0,1,2,3,4,5,6],"blocked_dates":[]}'::jsonb;
