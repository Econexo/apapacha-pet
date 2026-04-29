import { supabase } from '../../supabase';
import type { ServiceType } from '../types/database';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function completeKyc(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase
    .from('profiles')
    .update({ kyc_status: 'under_review' })
    .eq('id', user.id);
  if (error) throw error;
}

export async function applyAsHost(data: {
  service_type: ServiceType;
  kyc_doc_url?: string;
  safety_evidence_url?: string;
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { error } = await supabase.from('host_applications').insert({
    applicant_id: user.id,
    service_type: data.service_type,
    kyc_doc_url: data.kyc_doc_url ?? null,
    safety_evidence_url: data.safety_evidence_url ?? null,
    status: 'pending',
  });
  if (error) throw error;
}
