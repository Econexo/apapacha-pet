// Disponibilidad de un servicio (agendamiento con calendario).
// weekdays: días aceptados (0=Dom .. 6=Sáb, igual que Date.getDay())
// blocked_dates: fechas 'YYYY-MM-DD' bloqueadas por el cuidador
// from/to: horario 'HH:MM' (check-in/out alojamiento; ventana de visita)
export interface Availability {
  weekdays: number[];
  blocked_dates: string[];
  from?: string;
  to?: string;
}

// Etiquetas indexadas por getDay() (0=Dom)
export const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
// Orden de presentación empezando en Lunes
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function defaultAvailability(): Availability {
  return { weekdays: [0, 1, 2, 3, 4, 5, 6], blocked_dates: [] };
}

// Normaliza cualquier valor (posiblemente null/parcial) a una Availability válida.
export function normalizeAvailability(a: Partial<Availability> | null | undefined): Availability {
  const base = defaultAvailability();
  if (!a) return base;
  return {
    weekdays: Array.isArray(a.weekdays) && a.weekdays.length ? a.weekdays : base.weekdays,
    blocked_dates: Array.isArray(a.blocked_dates) ? a.blocked_dates : [],
    from: a.from,
    to: a.to,
  };
}

// 'YYYY-MM-DD' en hora LOCAL (evita el corrimiento por UTC de toISOString()).
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse de 'YYYY-MM-DD' a Date local a medianoche (sin corrimiento UTC).
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

// Resumen legible del agendamiento de una visita: fechas puntuales + hora.
export function formatVisitSchedule(
  dates: string[] | null | undefined,
  time?: string | null,
  fallbackStart?: string,
): string {
  const ds = dates && dates.length ? dates : fallbackStart ? [fallbackStart] : [];
  const f = (iso: string) => parseISODate(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  const label = ds.length === 0 ? ''
    : ds.length === 1 ? f(ds[0])
    : `${ds.length} visitas · ${f(ds[0])} – ${f(ds[ds.length - 1])}`;
  const hh = time ? time.slice(0, 5) : '';
  return hh ? `${label} · ${hh}` : label;
}

// ¿El cuidador acepta este día? (día de semana permitido y no bloqueado)
export function isDayAvailable(av: Availability | null | undefined, d: Date): boolean {
  if (!av) return true;
  if (av.weekdays?.length && !av.weekdays.includes(d.getDay())) return false;
  if (av.blocked_dates?.includes(toISODate(d))) return false;
  return true;
}

// Conjunto de noches ocupadas por reservas vigentes (start inclusivo, end exclusivo).
// Solo relevante para alojamiento (un espacio aloja una reserva a la vez).
export function occupiedNights(
  bookings: { start_date: string; end_date: string; status: string }[],
): Set<string> {
  const set = new Set<string>();
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'rejected') continue;
    const start = parseISODate(b.start_date);
    const end = parseISODate(b.end_date);
    for (const d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      set.add(toISODate(d));
    }
  }
  return set;
}
