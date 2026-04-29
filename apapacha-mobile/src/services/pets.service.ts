import { supabase } from '../../supabase';
import type { Pet } from '../types/database';

async function uploadPetPhoto(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = blob.type?.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/pets/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

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
  localImageUri?: string;
}): Promise<Pet> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  let image_url: string | null = null;
  if (petData.localImageUri) {
    try { image_url = await uploadPetPhoto(user.id, petData.localImageUri); } catch (_) {}
  }
  const { localImageUri: _, ...rest } = petData;
  const { data, error } = await supabase
    .from('pets')
    .insert({ ...rest, image_url, owner_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePet(petId: string, petData: {
  name: string;
  breed: string;
  age_years: number;
  weight_kg: number;
  sterilized: boolean;
  medical_alerts: string[];
  localImageUri?: string;
  existingImageUrl?: string;
}): Promise<Pet> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  let image_url = petData.existingImageUrl ?? null;
  if (petData.localImageUri) {
    try { image_url = await uploadPetPhoto(user.id, petData.localImageUri); } catch (_) {}
  }
  const { localImageUri: _a, existingImageUrl: _b, ...rest } = petData;
  const { data, error } = await supabase
    .from('pets')
    .update({ ...rest, image_url })
    .eq('id', petId)
    .eq('owner_id', user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
