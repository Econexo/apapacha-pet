import { supabase } from '../../supabase';
import type { ServiceType } from '../types/database';

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: 'https://apapacha-mobile.vercel.app' },
  });
  if (error) throw error;
  return { needsConfirmation: !data.session };
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'https://apapacha-mobile.vercel.app',
  });
  if (error) throw error;
}

// Sube una imagen de la cédula al bucket privado kyc-docs y devuelve
// una URL (formato public) de la que el admin extrae el path para firmar.
export async function uploadKycDoc(side: 'front' | 'back', localUri: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const response = await fetch(localUri);
  const blob = await response.blob();
  const ext = blob.type?.includes('png') ? 'png' : 'jpg';
  const path = `${user.id}/cedula-${side === 'front' ? 'frente' : 'reverso'}.${ext}`;
  const { error } = await supabase.storage
    .from('kyc-docs')
    .upload(path, blob, { upsert: true, contentType: blob.type || 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from('kyc-docs').getPublicUrl(path).data.publicUrl;
}

export async function completeKyc(docs?: { front?: string; back?: string }): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const update: Record<string, unknown> = { kyc_status: 'under_review' };
  if (docs?.front) update.kyc_doc_front_url = docs.front;
  if (docs?.back) update.kyc_doc_back_url = docs.back;
  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', user.id);
  if (error) throw error;
}

export async function applyAsHost(data: {
  userId: string;
  service_type: ServiceType;
  kyc_doc_url?: string;
  selfie_url?: string;
  evidence_url_1?: string;
  evidence_url_2?: string;
}): Promise<void> {
  const { error } = await supabase.from('host_applications').insert({
    applicant_id: data.userId,
    service_type: data.service_type,
    kyc_doc_url: data.kyc_doc_url ?? null,
    selfie_url: data.selfie_url ?? null,
    safety_evidence_url: data.evidence_url_1 ?? null,
    evidence_url_2: data.evidence_url_2 ?? null,
    status: 'pending',
  });
  if (error) throw error;
  // La notificación a admins la emite el trigger DB trg_admin_new_application
}
