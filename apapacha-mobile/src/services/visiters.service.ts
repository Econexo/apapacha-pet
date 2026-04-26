import { supabase } from '../../supabase';
import type { Visiter } from '../types/database';

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
  const { data } = await supabase
    .from('visiters')
    .select('*')
    .eq('host_id', user.id)
    .maybeSingle();
  return data ?? null;
}

export async function upsertMyVisiter(input: {
  id?: string;
  name: string;
  profession_title: string;
  bio: string;
  price_per_visit: number;
  active: boolean;
}): Promise<Visiter> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const payload = {
    ...input,
    host_id: user.id,
    rating: input.id ? undefined : 0,
    total_visits: input.id ? undefined : 0,
    image_url: null,
  };
  if (!input.id) delete payload.id;
  const { data, error } = await supabase
    .from('visiters')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
