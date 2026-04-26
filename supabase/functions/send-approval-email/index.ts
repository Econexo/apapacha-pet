import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const FROM_EMAIL = 'ApapachaPet <bienvenida@apapacha.pet>';

function buildContractHtml(name: string, lastName: string, serviceType: string, date: string): string {
  const service = serviceType === 'space' ? 'Hospedaje Felino' : 'Visitas Domiciliarias';
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: Georgia, serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1A0A2E; }
  h1 { color: #6B35A0; font-size: 22px; text-align: center; }
  h2 { color: #6B35A0; font-size: 16px; margin-top: 28px; }
  p { line-height: 1.7; font-size: 14px; }
  .header { text-align: center; border-bottom: 2px solid #6B35A0; padding-bottom: 20px; margin-bottom: 30px; }
  .logo { font-size: 28px; font-weight: bold; color: #6B35A0; }
  .clause { margin-bottom: 16px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 60px; gap: 40px; }
  .sig-block { flex: 1; border-top: 1px solid #333; padding-top: 8px; font-size: 12px; }
  .footer { font-size: 11px; color: #7B6B8D; text-align: center; margin-top: 40px; border-top: 1px solid #E8D5F5; padding-top: 16px; }
  .highlight { background: #F5EEFF; padding: 12px 16px; border-left: 3px solid #6B35A0; margin: 16px 0; border-radius: 4px; }
</style></head>
<body>
  <div class="header">
    <div class="logo">🐾 ApapachaPet</div>
    <p style="margin:4px 0;font-size:13px;color:#7B6B8D;">Hospitalidad Felina Premium</p>
    <h1>CONTRATO DE PRESTACIÓN DE SERVICIOS<br>PARA CUIDADORES</h1>
  </div>

  <div class="highlight">
    <strong>Cuidador:</strong> ${name} ${lastName}<br>
    <strong>Modalidad:</strong> ${service}<br>
    <strong>Fecha de inicio:</strong> ${date}<br>
    <strong>Plataforma:</strong> ApapachaPet — apapacha-mobile.vercel.app
  </div>

  <h2>CLÁUSULA 1 — OBJETO DEL CONTRATO</h2>
  <p class="clause">El presente contrato regula la relación entre <strong>ApapachaPet SpA</strong> (en adelante "la Plataforma") y el Cuidador identificado más arriba, quien prestará servicios de <strong>${service}</strong> a través de la aplicación ApapachaPet, conforme a los estándares de calidad y bienestar animal establecidos por la Plataforma.</p>

  <h2>CLÁUSULA 2 — OBLIGACIONES DEL CUIDADOR</h2>
  <p class="clause">El Cuidador se compromete a:</p>
  <ul>
    <li>Brindar atención de calidad a los felinos a su cargo, siguiendo las instrucciones del dueño.</li>
    <li>Comunicar de inmediato cualquier incidente, lesión o enfermedad al dueño y a la Plataforma.</li>
    <li>Mantener el espacio limpio, seguro y adecuado para la permanencia de los animales.</li>
    <li>No subcontratar ni transferir los cuidados a terceros sin autorización expresa.</li>
    <li>Respetar la política de Confianza Cero de ApapachaPet y sus protocolos de seguridad.</li>
    <li>Permitir verificación de identidad (KYC) y revisión periódica de sus instalaciones.</li>
  </ul>

  <h2>CLÁUSULA 3 — TARIFAS Y COMISIONES</h2>
  <p class="clause">El Cuidador fija libremente sus tarifas dentro de los rangos permitidos por la Plataforma. ApapachaPet retendrá una comisión de servicio del <strong>10%</strong> sobre cada reserva completada, más el cargo fijo de Seguro Zero Trust de <strong>$2.500 CLP</strong> por reserva, según lo establecido en las políticas vigentes.</p>

  <h2>CLÁUSULA 4 — SEGURO Y RESPONSABILIDADES</h2>
  <p class="clause">Cada reserva incluye una <strong>Malla de Seguro Zero Trust</strong>. En caso de incidente, el Cuidador deberá reportarlo a través de la sección "Trust & Safety" de la aplicación dentro de las 24 horas. Las responsabilidades y coberturas se rigen por la Ley 21.020 (Tenencia Responsable de Mascotas) y la normativa vigente en Chile.</p>

  <h2>CLÁUSULA 5 — DURACIÓN Y TÉRMINO</h2>
  <p class="clause">El presente contrato tiene vigencia indefinida a partir de la fecha de aprobación y podrá ser terminado por cualquiera de las partes con aviso previo de <strong>15 días corridos</strong>. ApapachaPet podrá suspender o terminar el acceso del Cuidador de forma inmediata ante incumplimientos graves, fraude o maltrato animal.</p>

  <h2>CLÁUSULA 6 — PROTECCIÓN DE DATOS</h2>
  <p class="clause">El tratamiento de datos personales del Cuidador se realizará conforme a la <strong>Ley 19.628</strong> sobre Protección de la Vida Privada de Chile. Los datos serán utilizados exclusivamente para la gestión de servicios dentro de la Plataforma.</p>

  <h2>CLÁUSULA 7 — JURISDICCIÓN</h2>
  <p class="clause">Las partes se someten a la jurisdicción de los Tribunales Ordinarios de Justicia de la ciudad de Santiago, Chile, para la resolución de cualquier conflicto derivado del presente contrato.</p>

  <div class="signatures">
    <div class="sig-block">
      <p style="margin:0"><strong>${name} ${lastName}</strong></p>
      <p style="margin:4px 0;font-size:12px;color:#7B6B8D;">Cuidador — Firma y Timbre</p>
      <br><br>
      <p style="margin:0;font-size:12px;">Fecha: ___________________</p>
    </div>
    <div class="sig-block">
      <p style="margin:0"><strong>ApapachaPet SpA</strong></p>
      <p style="margin:4px 0;font-size:12px;color:#7B6B8D;">Representante Legal</p>
      <br><br>
      <p style="margin:0;font-size:12px;">Fecha: ${date}</p>
    </div>
  </div>

  <div class="footer">
    ApapachaPet SpA · Santiago, Chile · contacto@apapacha.pet<br>
    Este documento fue generado automáticamente por la plataforma ApapachaPet.
  </div>
</body>
</html>`;
}

function buildWelcomeHtml(name: string, serviceType: string): string {
  const service = serviceType === 'space' ? 'Hospedaje Felino' : 'Visitas Domiciliarias';
  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><style>
  body { font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #FAF7FD; }
  .container { background: #fff; border-radius: 16px; overflow: hidden; margin: 20px; }
  .hero { background: linear-gradient(135deg, #6B35A0, #B57BCC); padding: 40px 32px; text-align: center; color: white; }
  .hero h1 { margin: 0 0 8px; font-size: 24px; }
  .hero p { margin: 0; opacity: 0.9; font-size: 15px; }
  .body { padding: 32px; }
  .body p { color: #1A0A2E; line-height: 1.6; font-size: 15px; }
  .steps { background: #FAF7FD; border-radius: 12px; padding: 20px; margin: 20px 0; }
  .step { display: flex; gap: 12px; margin-bottom: 12px; align-items: flex-start; }
  .step-num { background: #6B35A0; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; flex-shrink: 0; padding-top: 2px; }
  .cta { background: #6B35A0; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; display: inline-block; font-weight: bold; margin: 8px 0; }
  .footer { padding: 20px 32px; border-top: 1px solid #E8D5F5; font-size: 12px; color: #7B6B8D; text-align: center; }
</style></head>
<body>
  <div class="container">
    <div class="hero">
      <div style="font-size:48px;margin-bottom:12px">🐾</div>
      <h1>¡Bienvenido/a, ${name}!</h1>
      <p>Tu postulación como Cuidador de ${service} fue aprobada</p>
    </div>
    <div class="body">
      <p>Hola <strong>${name}</strong>,</p>
      <p>Nos alegra informarte que tu postulación para ofrecer servicios de <strong>${service}</strong> en ApapachaPet fue <strong>aprobada</strong>. Ya puedes comenzar a recibir reservas en nuestra plataforma.</p>

      <div class="steps">
        <p style="font-weight:bold;margin:0 0 12px;color:#6B35A0">Próximos pasos:</p>
        <div class="step">
          <div class="step-num">1</div>
          <p style="margin:0"><strong>Revisa el contrato adjunto</strong> — imprime el documento, fírmalo y envíalo de vuelta a <a href="mailto:apapachapet.app@gmail.com">apapachapet.app@gmail.com</a> o cárgalo directamente en la app desde tu Perfil.</p>
        </div>
        <div class="step">
          <div class="step-num">2</div>
          <p style="margin:0"><strong>Completa tu perfil</strong> — agrega foto, descripción detallada y tu tarifa.</p>
        </div>
        <div class="step">
          <div class="step-num">3</div>
          <p style="margin:0"><strong>¡Empieza a recibir reservas!</strong> — los dueños de gatos ya pueden encontrarte en Explorar.</p>
        </div>
      </div>

      <p style="text-align:center">
        <a class="cta" href="https://apapacha-mobile.vercel.app">Ir a la App →</a>
      </p>

      <p style="font-size:13px;color:#7B6B8D">Si tienes preguntas, escríbenos a <a href="mailto:apapachapet.app@gmail.com">apapachapet.app@gmail.com</a></p>
    </div>
    <div class="footer">ApapachaPet SpA · Santiago, Chile · 🐾 Hospitalidad Felina Premium</div>
  </div>
</body>
</html>`;
}

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

    // Verify caller is admin
    const { data: caller } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    if (!caller?.is_admin) throw new Error('Forbidden');

    const { applicant_id, application_id, service_type } = await req.json() as {
      applicant_id: string;
      application_id: string;
      service_type: string;
    };

    // Get applicant profile + auth email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, last_name')
      .eq('id', applicant_id)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(applicant_id);
    const email = authUser?.user?.email;
    if (!email) throw new Error('No email found for applicant');

    const name = profile?.full_name ?? 'Cuidador';
    const lastName = profile?.last_name ?? '';
    const date = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

    const contractHtml = buildContractHtml(name, lastName, service_type, date);
    const welcomeHtml = buildWelcomeHtml(name, service_type);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: '🐾 ¡Bienvenido/a a ApapachaPet! Tu solicitud fue aprobada',
        html: welcomeHtml,
        attachments: [
          {
            filename: `contrato-apapachapet-${name.toLowerCase().replace(' ', '-')}.html`,
            content: btoa(unescape(encodeURIComponent(contractHtml))),
          },
        ],
      }),
    });

    const result = await response.json();
    if (result.statusCode && result.statusCode >= 400) throw new Error(result.message ?? 'Email send failed');

    // Mark application as email sent
    await supabase.from('host_applications')
      .update({ welcome_email_sent: true })
      .eq('id', application_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
