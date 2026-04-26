import { supabase } from '../../supabase';
import type { Space } from '../types/database';

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
}): Promise<Space> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const payload = { ...input, host_id: user.id, image_urls: [], rating: input.id ? undefined : 0 };
  if (!input.id) delete payload.id;
  const { data, error } = await supabase
    .from('spaces')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
