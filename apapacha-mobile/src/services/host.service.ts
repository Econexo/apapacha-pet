import { supabase } from '../../supabase';
import type { HostApplication, Booking } from '../types/database';
import { insertNotification, insertNotificationsForAdmins } from './notifications.service';
import { purgeChatMedia } from './messages.service';

export async function getMyApplication(): Promise<HostApplication | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('host_applications')
    .select('*')
    .eq('applicant_id', user.id)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export async function getMyHostBookings(): Promise<Booking[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [spacesResult, visitersResult] = await Promise.all([
    supabase.from('spaces').select('id').eq('host_id', user.id),
    supabase.from('visiters').select('id').eq('host_id', user.id),
  ]);

  const serviceIds = [
    ...(spacesResult.data ?? []).map(s => s.id),
    ...(visitersResult.data ?? []).map(v => v.id),
  ];

  if (serviceIds.length === 0) return [];

  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .in('service_id', serviceIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function approveHostApplication(userId: string): Promise<void> {
  const { error } = await supabase.rpc('approve_host', { target_user_id: userId });
  if (error) throw error;
}

// El cuidador acepta o rechaza una solicitud de reserva (paso previo al pago).
export async function respondToBooking(bookingId: string, accept: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const [spacesRes, visitersRes] = await Promise.all([
    supabase.from('spaces').select('id').eq('host_id', user.id),
    supabase.from('visiters').select('id').eq('host_id', user.id),
  ]);
  const myServiceIds = [
    ...(spacesRes.data ?? []).map((s: any) => s.id),
    ...(visitersRes.data ?? []).map((v: any) => v.id),
  ];

  const update = accept
    ? { host_response: 'accepted' }
    : { host_response: 'rejected', status: 'cancelled' };

  const { data: booking, error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', bookingId)
    .in('service_id', myServiceIds)
    .select('owner_id')
    .single();
  if (error) throw error;

  if (booking?.owner_id) {
    await insertNotification(
      booking.owner_id,
      accept ? 'booking_accepted' : 'booking_rejected',
      accept ? '¡Tu solicitud fue aceptada! 🎉' : 'Solicitud no aceptada',
      accept
        ? 'El cuidador aceptó tu reserva. Ya puedes subir tu comprobante de pago desde la pestaña Reservas.'
        : 'El cuidador no pudo aceptar tu reserva. Puedes buscar otro cuidador.',
      { booking_id: bookingId },
    );
  }
}

export async function startService(bookingId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const [spacesRes, visitersRes] = await Promise.all([
    supabase.from('spaces').select('id').eq('host_id', user.id),
    supabase.from('visiters').select('id').eq('host_id', user.id),
  ]);
  const myServiceIds = [
    ...(spacesRes.data ?? []).map((s: any) => s.id),
    ...(visitersRes.data ?? []).map((v: any) => v.id),
  ];

  const { data: booking, error } = await supabase
    .from('bookings')
    .update({ service_phase: 'in_progress' })
    .eq('id', bookingId)
    .in('service_id', myServiceIds)
    .select('owner_id')
    .single();
  if (error) throw error;

  await Promise.all([
    insertNotification(
      booking.owner_id,
      'service_started',
      '🐾 ¡Tu servicio ha comenzado!',
      'Tu cuidador ha iniciado el servicio. Tu compañero felino está en buenas manos.',
      { booking_id: bookingId },
    ),
    insertNotificationsForAdmins(
      'service_started',
      'Servicio iniciado',
      `El cuidador ha marcado el inicio de una reserva.`,
      { booking_id: bookingId },
    ),
  ]);
}

export async function completeBookingAsHost(bookingId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const [spacesRes, visitersRes] = await Promise.all([
    supabase.from('spaces').select('id').eq('host_id', user.id),
    supabase.from('visiters').select('id').eq('host_id', user.id),
  ]);
  const myServiceIds = [
    ...(spacesRes.data ?? []).map((s: any) => s.id),
    ...(visitersRes.data ?? []).map((v: any) => v.id),
  ];

  const { data: booking, error } = await supabase
    .from('bookings')
    .update({ status: 'completed', service_phase: 'not_started' })
    .eq('id', bookingId)
    .in('service_id', myServiceIds)
    .select('owner_id')
    .single();
  if (error) throw error;

  await Promise.all([
    insertNotification(
      booking.owner_id,
      'service_completed',
      '✅ Servicio finalizado',
      'El servicio ha concluido. ¡Esperamos que todo haya salido perfecto! Puedes dejar una reseña.',
      { booking_id: bookingId },
    ),
    insertNotificationsForAdmins(
      'service_completed',
      'Servicio finalizado',
      'El cuidador marcó una reserva como completada.',
      { booking_id: bookingId },
    ),
  ]);

  // El chat termina con el servicio: se borran las fotos. Best-effort.
  try { await purgeChatMedia(bookingId); } catch (e) { console.warn('[host] purgeChatMedia:', e); }
}
