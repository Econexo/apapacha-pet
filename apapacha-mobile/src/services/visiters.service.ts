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
  const base = {
    name: input.name,
    profession_title: input.profession_title,
    bio: input.bio,
    price_per_visit: input.price_per_visit,
    active: input.active,
    host_id: user.id,
  };
  const payload = input.id
    ? { ...base, id: input.id }
    : { ...base, rating: 0, total_visits: 0, image_url: null as string | null };
  const { data, error } = await supabase
    .from('visiters')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
