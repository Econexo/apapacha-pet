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
