import { supabase } from '../../supabase';
import type { HostApplication, Booking } from '../types/database';

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
