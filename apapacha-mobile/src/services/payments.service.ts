import { supabase } from '../../supabase';

const SUPABASE_FUNCTIONS_URL = 'https://mzqvkzjxubuqpdnznigy.supabase.co/functions/v1';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16cXZremp4dWJ1cXBkbnpuaWd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NzY2NTAsImV4cCI6MjA5MTE1MjY1MH0.t4TBnmyyKDPqTZiFOwXbko-Qa4pdund9lr6fydeRdfQ';

async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return `Bearer ${session.access_token}`;
}

export async function createPaymentIntent(
  bookingId: string,
): Promise<{ clientSecret: string }> {
  const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-payment-intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await getAuthHeader(),
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return { clientSecret: data.client_secret };
}
