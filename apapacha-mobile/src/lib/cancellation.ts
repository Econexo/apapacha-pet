import { parseISODate } from './availability';

// Tarifa no reembolsable (debe coincidir con el checkout y el RPC cancel_booking).
export const APP_FEE = 4500;
// Reservas antiguas incluían el Seguro Zero Trust ($2.500), ya descontinuado.
export const LEGACY_INSURANCE_FEE = 2500;
const NON_REFUNDABLE = APP_FEE;

// Preview del reembolso del lado cliente (informativo; el servidor recalcula y es la
// fuente de verdad). Refleja la misma política que public.cancel_booking.
export function refundPreview(opts: {
  startDate: string;
  totalPrice: number;
  paid: boolean;
  byHost?: boolean;
  hadInsurance?: boolean;   // reservas antiguas con Seguro Zero Trust
}): { percent: number; amount: number } {
  const { startDate, totalPrice, paid, byHost, hadInsurance } = opts;
  const nonRefundable = NON_REFUNDABLE + (hadInsurance ? LEGACY_INSURANCE_FEE : 0);
  const days = Math.floor((parseISODate(startDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  let percent: number;
  if (byHost) percent = 100;          // cuidador (fuerza mayor) → 100%
  else if (!paid) percent = 100;      // aún no paga → nada retenido
  else if (days >= 7) percent = 100;  // +7 días
  else if (days >= 2) percent = 50;   // 48 h – 7 días
  else percent = 0;                   // −48 h o ya iniciado
  const refundable = paid ? Math.max(0, totalPrice - nonRefundable) : 0;
  return { percent, amount: Math.round((refundable * percent) / 100) };
}

export const fmtCLP = (n: number) => `$${n.toLocaleString('es-CL')}`;
