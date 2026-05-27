import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

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

    const { data: caller } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!caller?.is_admin) throw new Error('Forbidden: caller is not admin');

    const { table, id } = await req.json() as { table: string; id: string };

    const ALLOWED_TABLES = ['visiters', 'spaces', 'profiles', 'bookings'];
    if (!ALLOWED_TABLES.includes(table)) throw new Error(`Table "${table}" not allowed`);
    if (!id) throw new Error('Missing id');

    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) throw new Error(error.message);

    return new Response(JSON.stringify({ ok: true, count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
