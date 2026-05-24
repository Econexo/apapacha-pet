import { supabase } from '../../supabase';
import type { Space } from '../types/database';

export async function uploadSpacePhoto(localUri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = blob.type?.includes('png') ? 'png' : 'jpg';
  const path = `${user.id}/spaces/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('spaces')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from('spaces').getPublicUrl(path).data.publicUrl;
}

export type SpaceFilters = {
  features?: string[];
};

export async function getSpaces(filters?: SpaceFilters): Promise<Space[]> {
  let query = supabase
    .from('spaces')
    .select('*')
    .eq('active', true)
    .order('rating', { ascending: false });

  if (filters?.features && filters.features.length > 0) {
    query = query.overlaps('features', filters.features);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSpaceById(id: string): Promise<Space> {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getMySpace(): Promise<Space | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('spaces')
    .select('*')
    .eq('host_id', user.id)
    .maybeSingle();
  return data ?? null;
}

export async function upsertMySpace(input: {
  id?: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  features: string[];
  active: boolean;
  image_urls?: string[];
}): Promise<Space> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const base = {
    title: input.title,
    description: input.description,
    location: input.location,
    price_per_night: input.price_per_night,
    features: input.features,
    active: input.active,
    host_id: user.id,
    ...(input.image_urls !== undefined && { image_urls: input.image_urls }),
  };
  if (input.id) {
    const { data, error } = await supabase
      .from('spaces')
      .update(base)
      .eq('id', input.id)
      .eq('host_id', user.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from('spaces')
      .insert({ ...base, image_urls: input.image_urls ?? [], rating: 0 })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
