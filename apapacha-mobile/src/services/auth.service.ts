import { supabase } from '../../supabase';
import type { ServiceType } from '../types/database';

export async function sendOTP(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyOTP(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });
  if (error) throw error;
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
    .update({ kyc_status: 'verified' })
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
