import { supabase } from '../../supabase';

export type IncidentType = 'escape' | 'injury' | 'illness' | 'property_damage' | 'other';

export interface ClaimInput {
  booking_id?: string;
  incident_type: IncidentType;
  description: string;
}

export async function submitClaim(input: ClaimInput): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  const { error } = await supabase.from('insurance_claims').insert({
    claimant_id:   user.id,
    booking_id:    input.booking_id ?? null,
    incident_type: input.incident_type,
    description:   input.description,
  });
  if (error) throw error;
}
