import { supabase } from '../../supabase';
import type { Visiter } from '../types/database';
import type { Availability } from '../lib/availability';

export async function uploadVisiterPhoto(localUri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = blob.type?.includes('png') ? 'png' : 'jpg';
  const path = `${user.id}/visiters/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  return `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`;
}

export async function getVisiters(): Promise<Visiter[]> {
  const { data, error } = await supabase
    .from('visiters')
    .select('*')
    .eq('active', true)
    .order('rating', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getVisiterById(id: string): Promise<Visiter> {
  const { data, error } = await supabase
    .from('visiters')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getMyVisiter(): Promise<Visiter | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('visiters')
    .select('*')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) { console.error('[getMyVisiter]', error.message); return null; }
  return data ?? null;
}

export async function getMyVisiters(): Promise<Visiter[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('visiters')
    .select('*')
    .eq('host_id', user.id)
    .order('created_at', { ascending: false });
  if (error) { console.error('[getMyVisiters]', error.message); return []; }
  return data ?? [];
}

export async function deleteMyVisiter(id: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('visiters')
    .delete()
    .eq('id', id)
    .eq('host_id', user.id);
  if (error) throw error;
}

export async function upsertMyVisiter(input: {
  id?: string;
  name: string;
  profession_title: string;
  bio: string;
  price_per_visit: number;
  active: boolean;
  image_url?: string | null;
  availability?: Availability;
}): Promise<Visiter> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const base: Record<string, any> = {
    name: input.name,
    profession_title: input.profession_title,
    bio: input.bio,
    price_per_visit: input.price_per_visit,
    active: input.active,
    host_id: user.id,
    ...(input.image_url !== undefined && { image_url: input.image_url }),
    ...(input.availability !== undefined && { availability: input.availability }),
  };
  if (input.id) {
    const { data, error } = await supabase
      .from('visiters')
      .update(base)
      .eq('id', input.id)
      .eq('host_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('visiters')
      .insert({ ...base, rating: 0, total_visits: 0, image_url: null as string | null })
      .select()
      .single();
    if (error) throw error;
    // La notificación a admins la emite el trigger DB trg_admin_new_visiter
    return data;
  }
}
