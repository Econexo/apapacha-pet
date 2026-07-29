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

export async function sendMessage(
  bookingId: string,
  content: string,
  imageUrl?: string,
  videoUrl?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('messages').insert({
    booking_id: bookingId,
    sender_id: user.id,
    content,
    ...(imageUrl && { image_url: imageUrl }),
    ...(videoUrl && { video_url: videoUrl }),
  });
  if (error) throw error;
}

// Sube una foto al chat. Se guarda bajo chat-media/<booking_id>/... y se purga
// cuando la reserva termina (ver trigger purge_chat_media_on_end).
export async function uploadChatImage(bookingId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = blob.type?.includes('png') ? 'png' : 'jpg';
  const path = `${bookingId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('chat-media').getPublicUrl(path).data.publicUrl;
}

export const CHAT_VIDEO_MAX_BYTES = 25 * 1024 * 1024;   // 25 MB (límite del bucket)
export const CHAT_VIDEO_MAX_SECONDS = 60;

// Sube un video al chat. Mismo esquema de carpetas que las fotos, así la purga
// por reserva (purgeChatMedia) lo borra sin cambios.
export async function uploadChatVideo(bookingId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  if (blob.size > CHAT_VIDEO_MAX_BYTES) {
    throw new Error('VIDEO_DEMASIADO_GRANDE');
  }
  const ext = blob.type?.includes('quicktime') ? 'mov' : blob.type?.includes('webm') ? 'webm' : 'mp4';
  const path = `${bookingId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, blob, { contentType: blob.type || 'video/mp4', upsert: true });
  if (error) throw error;
  return supabase.storage.from('chat-media').getPublicUrl(path).data.publicUrl;
}

// Borra los archivos de fotos del chat de una reserva (al completar/cancelar).
// Best-effort: si falla, el trigger igual desvincula las fotos (image_url = NULL).
export async function purgeChatMedia(bookingId: string): Promise<void> {
  const { data } = await supabase.storage.from('chat-media').list(bookingId);
  if (data && data.length) {
    await supabase.storage.from('chat-media').remove(data.map(f => `${bookingId}/${f.name}`));
  }
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
