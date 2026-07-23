import { supabase } from '../../supabase';
import type { Booking, BookingStatus, ServiceType } from '../types/database';
import { insertNotification } from './notifications.service';
import { purgeChatMedia } from './messages.service';

export async function getMyBookings(): Promise<Booking[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBooking(bookingData: {
  pet_id: string;
  service_type: ServiceType;
  service_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  visit_dates?: string[];        // visitas: fechas puntuales
  time_block?: 'am' | 'pm';      // visitas: tramo AM / PM
}): Promise<Booking> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...bookingData,
      owner_id: user.id,
      status: 'pending',
      insurance_included: false,   // Seguro Zero Trust descontinuado
    })
    .select()
    .single();
  if (error) throw error;

  // Notify the host
  try {
    const table = bookingData.service_type === 'space' ? 'spaces' : 'visiters';
    const { data: svc } = await supabase.from(table).select('host_id').eq('id', bookingData.service_id).single();
    if (svc?.host_id) {
      await insertNotification(
        svc.host_id,
        'booking_created',
        '¡Nueva reserva recibida!',
        `Tienes una nueva solicitud de reserva para el ${bookingData.start_date}.`,
        { booking_id: data.id },
      );
    }
  } catch (e) { console.error('[bookings] notify host:', e); }

  // La notificación a admins la emite el trigger DB trg_admin_new_booking

  return data;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id)
    .eq('owner_id', user.id);
  if (error) throw error;
}

export async function submitPaymentReceipt(bookingId: string, localUri: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = blob.type?.includes('png') ? 'png' : 'jpg';
  const path = `${user.id}/receipts/${bookingId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('receipts').getPublicUrl(path);

  const { error } = await supabase
    .from('bookings')
    .update({ payment_receipt_url: data.publicUrl, payment_status: 'receipt_submitted' })
    .eq('id', bookingId)
    .eq('owner_id', user.id);
  if (error) throw error;

  // La notificación a admins la emite el trigger DB trg_admin_receipt_submitted
}

export interface CancelResult {
  actor: 'owner' | 'host' | 'admin';
  refund_percent: number;
  refund_amount: number;
  paid: boolean;
}

// Cancela vía RPC: el servidor valida al actor, calcula el reembolso (fuente de
// verdad), notifica a la contraparte y envía correo. Sirve para cliente y cuidador.
export async function cancelBooking(bookingId: string, reason?: string): Promise<CancelResult> {
  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: bookingId,
    p_reason: reason ?? null,
  });
  if (error) throw error;
  // Borra las fotos del chat (el chat termina con la reserva). Best-effort.
  try { await purgeChatMedia(bookingId); } catch (e) { console.warn('[bookings] purgeChatMedia:', e); }
  return data as CancelResult;
}

export async function confirmBookingPayment(bookingId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch owner_id before updating so we can notify them
  const { data: booking } = await supabase
    .from('bookings')
    .select('owner_id')
    .eq('id', bookingId)
    .single();

  const { error } = await supabase
    .from('bookings')
    .update({ payment_status: 'paid', status: 'active' })
    .eq('id', bookingId);
  if (error) throw error;

  // Notify the booking owner
  if (booking?.owner_id) {
    try {
      await insertNotification(
        booking.owner_id,
        'booking_confirmed',
        '¡Tu reserva está activa! 🎉',
        'Tu pago fue confirmado y tu reserva ya está activa. Puedes chatear con tu cuidador.',
        { booking_id: bookingId },
      );
    } catch (e) { console.error('[bookings] notify owner:', e); }
  }
}
