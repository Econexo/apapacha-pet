import { supabase } from '../../supabase';
import type { Profile } from '../types/database';

export async function updateProfile(data: {
  full_name?: string;
  last_name?: string;
  age?: number;
  address?: string;
  bio?: string;
  avatar_url?: string;
}): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data: updated, error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw error;
  return updated;
}

export async function uploadAvatar(uri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = blob.type.includes('png') ? 'png' : 'jpg';
  const path = `${user.id}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
