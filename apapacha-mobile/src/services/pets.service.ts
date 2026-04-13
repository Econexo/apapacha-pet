import { supabase } from '../../supabase';
import type { Pet } from '../types/database';

export async function getMyPets(): Promise<Pet[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addPet(petData: {
  name: string;
  breed: string;
  age_years: number;
  weight_kg: number;
  sterilized: boolean;
  medical_alerts: string[];
  image_url?: string;
}): Promise<Pet> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('pets')
    .insert({ ...petData, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}
