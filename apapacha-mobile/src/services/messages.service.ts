import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import type { Message } from '../types/database';

export async function getMessages(bookingId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(bookingId: string, content: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('messages').insert({
    booking_id: bookingId,
    sender_id: user.id,
    content,
  });
  if (error) throw error;
}

export function subscribeToMessages(
  bookingId: string,
  callback: (msg: Message) => void
): RealtimeChannel {
  return supabase
    .channel(`messages:${bookingId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `booking_id=eq.${bookingId}`,
      },
      payload => callback(payload.new as Message)
    )
    .subscribe();
}
