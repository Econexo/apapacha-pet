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
