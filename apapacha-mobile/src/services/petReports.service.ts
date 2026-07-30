import { supabase } from '../../supabase';
import type { PetMood, PetReport } from '../types/database';

type IconName = 'tennisball-outline' | 'leaf-outline' | 'heart-outline' | 'moon-outline' | 'search-outline' | 'sad-outline' | 'paw-outline';

// Etiquetas e íconos de cada ánimo. El ícono es un Ionicon (no emoji) para
// seguir el sistema de diseño; el valor guardado en la DB es la clave.
export const PET_MOODS: { value: PetMood; label: string; icon: IconName }[] = [
  { value: 'jugueton',    label: 'Juguetón',    icon: 'tennisball-outline' },
  { value: 'tranquilo',   label: 'Tranquilo',   icon: 'leaf-outline'       },
  { value: 'feliz',       label: 'Feliz',       icon: 'heart-outline'      },
  { value: 'descansando', label: 'Descansando', icon: 'moon-outline'       },
  { value: 'curioso',     label: 'Curioso',     icon: 'search-outline'     },
  { value: 'decaido',     label: 'Decaído',     icon: 'sad-outline'        },
];

export function moodLabel(mood: PetMood): string {
  return PET_MOODS.find(m => m.value === mood)?.label ?? mood;
}

export function moodIcon(mood: PetMood): IconName {
  return PET_MOODS.find(m => m.value === mood)?.icon ?? 'paw-outline';
}

// Sube la foto del reporte al bucket chat-media: mismas políticas por
// participante de la reserva y misma purga cuando el servicio termina.
async function uploadReportPhoto(bookingId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = blob.type?.includes('png') ? 'png' : 'jpg';
  const path = `${bookingId}/reporte-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('chat-media')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('chat-media').getPublicUrl(path).data.publicUrl;
}

export async function createPetReport(
  bookingId: string,
  mood: PetMood,
  note?: string,
  photoUri?: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const photo_url = photoUri ? await uploadReportPhoto(bookingId, photoUri) : null;

  const { error } = await supabase.from('pet_reports').insert({
    booking_id: bookingId,
    author_id: user.id,
    mood,
    note: note?.trim() ? note.trim() : null,
    photo_url,
  });
  if (error) throw error;
}

export async function getLatestPetReport(bookingId: string): Promise<PetReport | null> {
  const { data, error } = await supabase
    .from('pet_reports')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('[petReports] getLatestPetReport:', error.message); return null; }
  return (data as PetReport) ?? null;
}
