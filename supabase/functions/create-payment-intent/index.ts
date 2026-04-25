import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-12-18.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const { booking_id, host_stripe_account_id } = await req.json() as {
      booking_id: string;
      host_stripe_account_id: string;
    };

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('owner_id', user.id)
      .single();
    if (bookingErr || !booking) throw new Error('Booking not found');

    const { data: configRows } = await supabase
      .from('platform_config')
      .select('key, value');
    const config: Record<string, string> = {};
    for (const row of configRows ?? []) config[row.key] = row.value;

    const platformFeePct = parseFloat(config['platform_fee_pct'] ?? '10') / 100;
    const applicationFeeAmount = Math.round(booking.total_price * platformFeePct);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.total_price,
      currency: 'clp',
      application_fee_amount: applicationFeeAmount,
      transfer_data: { destination: host_stripe_account_id },
      metadata: { booking_id, user_id: user.id },
    });

    await supabase
      .from('bookings')
      .update({
        stripe_payment_intent_id: paymentIntent.id,
        payment_status: 'payment_pending',
      })
      .eq('id', booking_id);

    return new Response(
      JSON.stringify({ client_secret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
