import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-trigger-secret',
};

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const TRIGGER_SECRET = Deno.env.get('TRIGGER_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

webpush.setVapidDetails('mailto:apapachapet.app@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);

const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

interface PushPayload {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Autorización: igual que send-email, solo los triggers de la DB (secret
  // compartido) pueden invocarla. Fail-secure si el secret no está configurado.
  const secret = req.headers.get('x-trigger-secret') ?? '';
  if (!TRIGGER_SECRET || secret !== TRIGGER_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!payload.user_id || !payload.title) {
    return new Response(JSON.stringify({ error: 'user_id y title son obligatorios' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: subs, error } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', payload.user_id);

  if (error) {
    console.error('[send-push] lectura de suscripciones:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const notification = JSON.stringify({
    title: payload.title,
    body: payload.body ?? '',
    url: payload.url ?? '/',
    tag: payload.tag ?? 'apapacha',
  });

  const muertas: string[] = [];
  let enviadas = 0;

  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          notification
        );
        enviadas++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410 = el navegador desechó la suscripción: la borramos.
        if (status === 404 || status === 410) muertas.push(s.id);
        else console.error('[send-push] envío falló:', status, (e as Error).message);
      }
    })
  );

  if (muertas.length) {
    await admin.from('push_subscriptions').delete().in('id', muertas);
  }
  if (enviadas > 0) {
    await admin
      .from('push_subscriptions')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', payload.user_id);
  }

  return new Response(JSON.stringify({ ok: true, sent: enviadas, removed: muertas.length }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
