import { supabase } from '../../supabase';
import type { Booking, BookingStatus, ServiceType } from '../types/database';

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
}): Promise<Booking> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      ...bookingData,
      owner_id: user.id,
      status: 'pending',
      insurance_included: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', id);
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
    .from('avatars')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error } = await supabase
    .from('bookings')
    .update({ payment_receipt_url: data.publicUrl, payment_status: 'receipt_submitted' })
    .eq('id', bookingId)
    .eq('owner_id', user.id);
  if (error) throw error;
}

export async function confirmBookingPayment(bookingId: string): Promise<void> {
  const { error } = await supabase
    .from('bookings')
    .update({ payment_status: 'paid', status: 'active' })
    .eq('id', bookingId);
  if (error) throw error;
}
