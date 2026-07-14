import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createTransport } from 'npm:nodemailer@6.9.9';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SMTP_USER = Deno.env.get('SMTP_USER') ?? '';
const SMTP_PASS = Deno.env.get('SMTP_PASS') ?? '';
const FROM = `ApapachaPet <${SMTP_USER}>`;
const APP_URL = 'https://apapacha-mobile.vercel.app';

const transporter = createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

// ─── HTML Templates ──────────────────────────────────────────────────────────

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{margin:0;padding:0;background:#FAF7FD;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  .wrap{max-width:600px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(107,53,160,.10)}
  .hero{background:linear-gradient(135deg,#6B35A0,#B57BCC);padding:40px 32px;text-align:center;color:#fff}
  .hero-icon{font-size:52px;margin-bottom:12px}
  .hero h1{margin:0 0 6px;font-size:22px;font-weight:800}
  .hero p{margin:0;opacity:.88;font-size:14px}
  .body{padding:32px}
  .body p{color:#1A0A2E;line-height:1.65;font-size:15px;margin:0 0 14px}
  .highlight{background:#F5EEFF;border-left:4px solid #6B35A0;border-radius:6px;padding:14px 18px;margin:18px 0}
  .highlight p{margin:4px 0;font-size:14px}
  .steps{background:#FAF7FD;border-radius:12px;padding:20px 20px 8px;margin:18px 0}
  .step{display:flex;gap:12px;margin-bottom:14px;align-items:center}
  .step-n{background:#6B35A0;color:#fff !important;border-radius:50%;min-width:24px;width:24px;height:24px;line-height:24px;text-align:center;font-size:12px;font-weight:800;display:inline-block;flex-shrink:0}
  .step p{margin:0;font-size:14px;color:#1A0A2E;line-height:1.5}
  .cta-wrap{text-align:center;margin:24px 0 8px}
  .cta{background:#6B35A0 !important;color:#fff !important;text-decoration:none !important;padding:14px 32px;border-radius:10px;font-weight:800;font-size:15px;display:inline-block}
  .badge{display:inline-block;background:#F0FBF0;color:#1A4A1B;border:1px solid #B8E6B9;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;margin-bottom:12px}
  .badge-warn{background:#FFFBEB;color:#92400E;border-color:#FDE68A}
  .badge-danger{background:#FEF2F2;color:#991B1B;border-color:#FECACA}
  .footer{padding:20px 32px;border-top:1px solid #E8D5F5;font-size:12px;color:#7B6B8D;text-align:center;line-height:1.6}
</style></head>
<body><div class="wrap">${content}<div class="footer">
  ApapachaPet SpA · Santiago, Chile 🐾<br>
  <a href="${APP_URL}" style="color:#6B35A0">apapacha-mobile.vercel.app</a> ·
  <a href="mailto:apapachapet.app@gmail.com" style="color:#6B35A0">apapachapet.app@gmail.com</a>
</div></div></body></html>`;
}

function welcomeHtml(name: string): string {
  return baseLayout(`
    <div class="hero">
      <div class="hero-icon">🐾</div>
      <h1>¡Bienvenido/a a ApapachaPet, ${name}!</h1>
      <p>Tu cuenta está lista — la comunidad felina te espera</p>
    </div>
    <div class="body">
      <p>Hola <strong>${name}</strong>, nos alegra que formes parte de nuestra comunidad. ApapachaPet conecta a dueños de gatos con cuidadores verificados para que cada felino reciba la mejor atención.</p>
      <div class="steps">
        <p style="font-weight:800;margin:0 0 14px;color:#6B35A0">¿Por dónde empezar?</p>
        <div class="step"><div class="step-n">1</div><p><strong>Agrega tu gato</strong> — registra a tu compañero felino con su nombre, raza y cuidados especiales.</p></div>
        <div class="step"><div class="step-n">2</div><p><strong>Explora cuidadores</strong> — encuentra alojamiento certificado o visitas domiciliarias cerca de ti.</p></div>
        <div class="step"><div class="step-n">3</div><p><strong>Reserva con confianza</strong> — todos nuestros cuidadores pasan por verificación de identidad y seguridad.</p></div>
      </div>
      <div class="highlight">
        <p style="font-weight:800;color:#6B35A0">🛡️ Malla de Seguro Zero Trust</p>
        <p>Cada reserva incluye una <strong>cobertura veterinaria</strong> que protege a tu gato durante todo el servicio. Si ocurre una emergencia de salud mientras está al cuidado, respaldamos la atención veterinaria hasta el límite de la póliza.</p>
        <p>Se cobra por separado del cuidador porque <strong>no es parte de su tarifa</strong>: ApapachaPet contrata esta protección directamente por cada reserva, así el 100% de ese monto va al respaldo de tu mascota.</p>
      </div>
      <div class="cta-wrap"><a class="cta" href="${APP_URL}" style="color:#fff !important;text-decoration:none !important"><span style="color:#fff !important">Ir a la App →</span></a></div>
    </div>`);
}

function bookingConfirmHtml(name: string, serviceName: string, startDate: string, endDate: string, serviceType: string): string {
  const icon = serviceType === 'space' ? '🏠' : '🚗';
  const typeLabel = serviceType === 'space' ? 'Hospedaje' : 'Visita Básica';
  return baseLayout(`
    <div class="hero">
      <div class="hero-icon">${icon}</div>
      <h1>¡Reserva confirmada!</h1>
      <p>Tu ${typeLabel.toLowerCase()} fue registrado exitosamente</p>
    </div>
    <div class="body">
      <p>Hola <strong>${name}</strong>, tu reserva está en proceso. El cuidador recibirá una notificación y te contactará pronto para coordinar los detalles.</p>
      <div class="highlight">
        <p><strong>Servicio:</strong> ${icon} ${serviceName}</p>
        <p><strong>Tipo:</strong> ${typeLabel}</p>
        <p><strong>Fecha inicio:</strong> ${startDate}</p>
        <p><strong>Fecha término:</strong> ${endDate}</p>
      </div>
      <div class="steps">
        <p style="font-weight:800;margin:0 0 14px;color:#6B35A0">Próximos pasos</p>
        <div class="step"><div class="step-n">1</div><p>El cuidador confirmará la reserva. Te notificaremos por la app y correo.</p></div>
        <div class="step"><div class="step-n">2</div><p>Coordina los detalles de entrega desde la sección <strong>Mensajes</strong> de la app.</p></div>
        <div class="step"><div class="step-n">3</div><p>Al finalizar el servicio, califica la experiencia para ayudar a otros dueños.</p></div>
      </div>
      <div class="cta-wrap"><a class="cta" href="${APP_URL}" style="color:#fff !important;text-decoration:none !important"><span style="color:#fff !important">Ver mi reserva →</span></a></div>
    </div>`);
}

function applicationReceivedHtml(name: string, serviceType: string): string {
  const typeLabel = serviceType === 'space' ? 'Hospedaje Felino' : 'Visita Básica';
  return baseLayout(`
    <div class="hero">
      <div class="hero-icon">📋</div>
      <h1>Solicitud recibida, ${name}</h1>
      <p>Revisaremos tu postulación en las próximas 24–48 horas</p>
    </div>
    <div class="body">
      <p>Hola <strong>${name}</strong>, recibimos tu postulación para ofrecer servicios de <strong>${typeLabel}</strong> en ApapachaPet. Nuestro equipo revisará tu documentación y te responderá a la brevedad.</p>
      <div class="highlight">
        <p><strong>Modalidad solicitada:</strong> ${typeLabel}</p>
        <p><strong>Estado:</strong> En revisión</p>
        <p><strong>Tiempo estimado:</strong> 24–48 horas hábiles</p>
      </div>
      <p>Mientras tanto, puedes seguir usando la app como dueño de mascotas. Te notificaremos por correo y dentro de la app cuando haya novedades.</p>
      <p style="font-size:13px;color:#7B6B8D">¿Tienes preguntas? Escríbenos a <a href="mailto:apapachapet.app@gmail.com" style="color:#6B35A0">apapachapet.app@gmail.com</a></p>
    </div>`);
}

function applicationResultHtml(name: string, serviceType: string, approved: boolean, rejectionReason?: string): string {
  const typeLabel = serviceType === 'space' ? 'Hospedaje Felino' : 'Visita Básica';
  if (approved) {
    return baseLayout(`
      <div class="hero">
        <div class="hero-icon">✅</div>
        <h1>¡Solicitud aprobada!</h1>
        <p>Ya eres cuidador verificado en ApapachaPet</p>
      </div>
      <div class="body">
        <div class="badge">Cuidador verificado 🐾</div>
        <p>Hola <strong>${name}</strong>, nos alegra informarte que tu postulación para <strong>${typeLabel}</strong> fue <strong>aprobada</strong>. Ya puedes configurar tu servicio y comenzar a recibir reservas.</p>
        <div class="steps">
          <p style="font-weight:800;margin:0 0 14px;color:#6B35A0">Próximos pasos</p>
          <div class="step"><div class="step-n">1</div><p><strong>Completa tu perfil</strong> — agrega foto, descripción y define tu tarifa en la sección Perfil.</p></div>
          <div class="step"><div class="step-n">2</div><p><strong>Activa tu servicio</strong> — aparecerás en el listado de cuidadores disponibles.</p></div>
          <div class="step"><div class="step-n">3</div><p><strong>¡Recibe tu primera reserva!</strong> — los dueños de gatos podrán encontrarte en Explorar.</p></div>
        </div>
        <div class="cta-wrap"><a class="cta" href="${APP_URL}" style="color:#fff !important;text-decoration:none !important"><span style="color:#fff !important">Ir a la App →</span></a></div>
      </div>`);
  } else {
    return baseLayout(`
      <div class="hero" style="background:linear-gradient(135deg,#7B1D1D,#B45309)">
        <div class="hero-icon">📋</div>
        <h1>Actualización de tu solicitud</h1>
        <p>Tu postulación requiere revisión adicional</p>
      </div>
      <div class="body">
        <div class="badge badge-danger">Solicitud no aprobada</div>
        <p>Hola <strong>${name}</strong>, lamentamos informarte que tu postulación para <strong>${typeLabel}</strong> no pudo ser aprobada en esta oportunidad.</p>
        ${rejectionReason ? `<div class="highlight"><p><strong>Motivo:</strong> ${rejectionReason}</p></div>` : ''}
        <p>Puedes volver a postular una vez que hayas subsanado los puntos observados. Si tienes dudas, contáctanos y con gusto te orientamos.</p>
        <div class="cta-wrap"><a class="cta" href="mailto:apapachapet.app@gmail.com" style="background:#B45309">Consultar por correo →</a></div>
      </div>`);
  }
}

function paymentConfirmedHtml(name: string, serviceName: string, serviceType: string): string {
  const icon = serviceType === 'space' ? '🏠' : '🚗';
  return baseLayout(`
    <div class="hero">
      <div class="hero-icon">✅</div>
      <h1>¡Pago confirmado!</h1>
      <p>Tu reserva está activa y protegida</p>
    </div>
    <div class="body">
      <div class="badge">Reserva activa 🐾</div>
      <p>Hola <strong>${name}</strong>, confirmamos la recepción de tu pago. Tu reserva de <strong>${icon} ${serviceName}</strong> ya está <strong>activa</strong>.</p>
      <div class="highlight">
        <p style="font-weight:800;color:#6B35A0">🛡️ Malla de Seguro Zero Trust</p>
        <p>Tu reserva incluye <strong>cobertura veterinaria</strong> durante todo el servicio. Si ocurre una emergencia de salud mientras tu gato está al cuidado, respaldamos la atención hasta el límite de la póliza.</p>
      </div>
      <div class="steps">
        <p style="font-weight:800;margin:0 0 14px;color:#6B35A0">¿Y ahora?</p>
        <div class="step"><div class="step-n">1</div><p>Coordina la entrega con tu cuidador desde la sección <strong>Mensajes</strong>.</p></div>
        <div class="step"><div class="step-n">2</div><p>Al finalizar el servicio, califica la experiencia para ayudar a la comunidad.</p></div>
      </div>
      <div class="cta-wrap"><a class="cta" href="${APP_URL}" style="color:#fff !important;text-decoration:none !important"><span style="color:#fff !important">Ver mi reserva →</span></a></div>
    </div>`);
}

function bookingResponseHtml(name: string, serviceName: string, serviceType: string, accepted: boolean): string {
  const icon = serviceType === 'space' ? '🏠' : '🚗';
  if (accepted) {
    return baseLayout(`
      <div class="hero">
        <div class="hero-icon">🎉</div>
        <h1>¡El cuidador aceptó tu reserva!</h1>
        <p>Solo falta un paso para confirmarla</p>
      </div>
      <div class="body">
        <p>Hola <strong>${name}</strong>, buenas noticias: el cuidador aceptó tu solicitud para <strong>${icon} ${serviceName}</strong>. Para confirmar la reserva, realiza el pago y sube tu comprobante desde la app.</p>
        <div class="steps">
          <p style="font-weight:800;margin:0 0 14px;color:#6B35A0">Cómo confirmar tu reserva</p>
          <div class="step"><div class="step-n">1</div><p>Abre la reserva en <strong>Mis Reservas</strong> y toca <strong>Subir comprobante de pago</strong>.</p></div>
          <div class="step"><div class="step-n">2</div><p>Realiza la transferencia por el monto indicado y adjunta la captura.</p></div>
          <div class="step"><div class="step-n">3</div><p>Validamos el pago y tu reserva queda activa. Te avisaremos por correo.</p></div>
        </div>
        <div class="cta-wrap"><a class="cta" href="${APP_URL}" style="color:#fff !important;text-decoration:none !important"><span style="color:#fff !important">Subir comprobante →</span></a></div>
      </div>`);
  }
  return baseLayout(`
    <div class="hero" style="background:linear-gradient(135deg,#7B1D1D,#B45309)">
      <div class="hero-icon">📋</div>
      <h1>Tu reserva no pudo confirmarse</h1>
      <p>El cuidador no está disponible para esas fechas</p>
    </div>
    <div class="body">
      <div class="badge badge-danger">Reserva no aceptada</div>
      <p>Hola <strong>${name}</strong>, lamentablemente el cuidador no pudo aceptar tu reserva de <strong>${icon} ${serviceName}</strong>. No te preocupes: <strong>no se realizó ningún cobro</strong>.</p>
      <p>Te invitamos a explorar otros cuidadores verificados disponibles para tus fechas.</p>
      <div class="cta-wrap"><a class="cta" href="${APP_URL}" style="color:#fff !important;text-decoration:none !important"><span style="color:#fff !important">Explorar cuidadores →</span></a></div>
    </div>`);
}

function bookingCancelledHtml(name: string, serviceName: string, serviceType: string, toHost: boolean, refund: number, percent: number): string {
  const icon = serviceType === 'space' ? '🏠' : '🚗';
  if (toHost) {
    return baseLayout(`
      <div class="hero" style="background:linear-gradient(135deg,#7B1D1D,#B45309)">
        <div class="hero-icon">📅</div>
        <h1>Una reserva fue cancelada</h1>
        <p>Las fechas quedaron disponibles de nuevo</p>
      </div>
      <div class="body">
        <p>Hola <strong>${name}</strong>, te avisamos que el cliente canceló su reserva de <strong>${icon} ${serviceName}</strong>. Esas fechas volvieron a quedar libres en tu calendario.</p>
        <div class="cta-wrap"><a class="cta" href="${APP_URL}" style="color:#fff !important;text-decoration:none !important"><span style="color:#fff !important">Ver mi panel →</span></a></div>
      </div>`);
  }
  const refundBlock = refund > 0
    ? `<div class="highlight"><p style="font-weight:800;color:#6B35A0">💸 Reembolso</p><p>Se procesará un reembolso de <strong>$${refund.toLocaleString('es-CL')} CLP</strong> (${percent}% de la tarifa del cuidador). El Seguro Zero Trust y la tarifa de servicio no son reembolsables.</p></div>`
    : `<div class="highlight"><p>Según la política de cancelación, esta reserva no genera reembolso de la tarifa del cuidador.</p></div>`;
  return baseLayout(`
    <div class="hero" style="background:linear-gradient(135deg,#7B1D1D,#B45309)">
      <div class="hero-icon">📅</div>
      <h1>Tu reserva fue cancelada</h1>
      <p>Aquí está el detalle</p>
    </div>
    <div class="body">
      <p>Hola <strong>${name}</strong>, confirmamos la cancelación de tu reserva de <strong>${icon} ${serviceName}</strong>.</p>
      ${refundBlock}
      <p style="font-size:13px;color:#7B6B8D">¿Dudas? Escríbenos a <a href="mailto:apapachapet.app@gmail.com" style="color:#6B35A0">apapachapet.app@gmail.com</a></p>
    </div>`);
}

// ─── Email dispatch ───────────────────────────────────────────────────────────

type EmailPayload =
  | { type: 'welcome'; to: string; name: string }
  | { type: 'booking_confirm'; to: string; name: string; service_name: string; start_date: string; end_date: string; service_type: string }
  | { type: 'application_received'; to: string; name: string; service_type: string }
  | { type: 'application_approved'; to: string; name: string; service_type: string }
  | { type: 'application_rejected'; to: string; name: string; service_type: string; reason?: string }
  | { type: 'payment_confirmed'; to: string; name: string; service_name: string; service_type: string }
  | { type: 'booking_accepted'; to: string; name: string; service_name: string; service_type: string }
  | { type: 'booking_rejected'; to: string; name: string; service_name: string; service_type: string }
  | { type: 'booking_cancelled'; to: string; name: string; service_name: string; service_type: string; to_host: boolean; refund_amount: number; refund_percent: number };

async function sendEmail(payload: EmailPayload) {
  let subject: string;
  let html: string;

  switch (payload.type) {
    case 'welcome':
      subject = '🐾 ¡Bienvenido/a a ApapachaPet!';
      html = welcomeHtml(payload.name);
      break;
    case 'booking_confirm':
      subject = `🏠 Reserva confirmada — ${payload.service_name}`;
      html = bookingConfirmHtml(payload.name, payload.service_name, payload.start_date, payload.end_date, payload.service_type);
      break;
    case 'application_received':
      subject = '📋 Recibimos tu postulación como cuidador';
      html = applicationReceivedHtml(payload.name, payload.service_type);
      break;
    case 'application_approved':
      subject = '✅ ¡Tu postulación fue aprobada! — ApapachaPet';
      html = applicationResultHtml(payload.name, payload.service_type, true);
      break;
    case 'application_rejected':
      subject = '📋 Actualización de tu solicitud — ApapachaPet';
      html = applicationResultHtml(payload.name, payload.service_type, false, payload.reason);
      break;
    case 'payment_confirmed':
      subject = `✅ Pago confirmado — ${payload.service_name}`;
      html = paymentConfirmedHtml(payload.name, payload.service_name, payload.service_type);
      break;
    case 'booking_accepted':
      subject = `🎉 El cuidador aceptó tu reserva — ${payload.service_name}`;
      html = bookingResponseHtml(payload.name, payload.service_name, payload.service_type, true);
      break;
    case 'booking_rejected':
      subject = `📋 Actualización de tu reserva — ${payload.service_name}`;
      html = bookingResponseHtml(payload.name, payload.service_name, payload.service_type, false);
      break;
    case 'booking_cancelled':
      subject = payload.to_host
        ? `📅 Una reserva fue cancelada — ${payload.service_name}`
        : `📅 Tu reserva fue cancelada — ${payload.service_name}`;
      html = bookingCancelledHtml(payload.name, payload.service_name, payload.service_type, payload.to_host, payload.refund_amount, payload.refund_percent);
      break;
  }

  await transporter.sendMail({ from: FROM, to: payload.to, subject, html });
}

// ─── Internal trigger handler (called by pg_net / DB triggers) ───────────────

// Resuelve email + nombre del dueño y el nombre del servicio a partir de una reserva
async function resolveBookingCtx(
  supabase: ReturnType<typeof createClient>,
  record: Record<string, unknown>,
): Promise<{ email: string; name: string; serviceName: string; serviceType: string } | null> {
  const ownerId = record.owner_id as string;
  const { data: authUser } = await supabase.auth.admin.getUserById(ownerId);
  const email = authUser?.user?.email;
  if (!email) return null;
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', ownerId).single();
  const name = (profile?.full_name as string) ?? 'Cliente';
  const serviceType = record.service_type as string;
  const serviceId = record.service_id as string;
  let serviceName = serviceType === 'space' ? 'Alojamiento' : 'Visita Básica';
  if (serviceType === 'space') {
    const { data: sp } = await supabase.from('spaces').select('title').eq('id', serviceId).single();
    if (sp?.title) serviceName = sp.title as string;
  } else {
    const { data: vi } = await supabase.from('visiters').select('name').eq('id', serviceId).single();
    if (vi?.name) serviceName = vi.name as string;
  }
  return { email, name, serviceName, serviceType };
}

async function handleTrigger(
  supabase: ReturnType<typeof createClient>,
  body: Record<string, unknown>,
) {
  const type = body.type as string;
  const record = body.record as Record<string, unknown>;

  if (type === 'welcome') {
    const userId = record.id as string;
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const email = authUser?.user?.email;
    if (!email) return;
    const name = (record.full_name as string) ?? 'Usuario';
    await sendEmail({ type: 'welcome', to: email, name });
  }

  if (type === 'booking_confirm') {
    const ownerId = record.owner_id as string;
    const { data: authUser } = await supabase.auth.admin.getUserById(ownerId);
    const email = authUser?.user?.email;
    if (!email) return;
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', ownerId).single();
    const name = profile?.full_name ?? 'Cliente';
    const serviceType = record.service_type as string;
    const serviceId = record.service_id as string;
    let serviceName = serviceType === 'space' ? 'Alojamiento' : 'Visita Básica';
    if (serviceType === 'space') {
      const { data: sp } = await supabase.from('spaces').select('title').eq('id', serviceId).single();
      if (sp?.title) serviceName = sp.title;
    } else {
      const { data: vi } = await supabase.from('visiters').select('name').eq('id', serviceId).single();
      if (vi?.name) serviceName = vi.name;
    }
    const fmt = (d: string) => new Date(d).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    await sendEmail({
      type: 'booking_confirm',
      to: email,
      name,
      service_name: serviceName,
      start_date: fmt(record.start_date as string),
      end_date: fmt(record.end_date as string),
      service_type: serviceType,
    });
  }

  if (type === 'application_received') {
    const applicantId = record.applicant_id as string;
    const { data: authUser } = await supabase.auth.admin.getUserById(applicantId);
    const email = authUser?.user?.email;
    if (!email) return;
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', applicantId).single();
    const name = profile?.full_name ?? 'Postulante';
    await sendEmail({ type: 'application_received', to: email, name, service_type: record.service_type as string });
  }

  if (type === 'application_approved' || type === 'application_rejected') {
    const applicantId = record.applicant_id as string;
    const { data: authUser } = await supabase.auth.admin.getUserById(applicantId);
    const email = authUser?.user?.email;
    if (!email) return;
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', applicantId).single();
    const name = profile?.full_name ?? 'Postulante';
    if (type === 'application_approved') {
      await sendEmail({ type: 'application_approved', to: email, name, service_type: record.service_type as string });
    } else {
      await sendEmail({ type: 'application_rejected', to: email, name, service_type: record.service_type as string, reason: record.rejection_reason as string | undefined });
    }
  }

  if (type === 'payment_confirmed') {
    const ctx = await resolveBookingCtx(supabase, record);
    if (!ctx) return;
    await sendEmail({ type: 'payment_confirmed', to: ctx.email, name: ctx.name, service_name: ctx.serviceName, service_type: ctx.serviceType });
  }

  if (type === 'booking_accepted' || type === 'booking_rejected') {
    const ctx = await resolveBookingCtx(supabase, record);
    if (!ctx) return;
    await sendEmail({ type, to: ctx.email, name: ctx.name, service_name: ctx.serviceName, service_type: ctx.serviceType });
  }

  if (type === 'booking_cancelled') {
    const notifyHost = body.notify_host === true;
    const refund = Number(body.refund_amount ?? 0);
    const percent = Number(body.refund_percent ?? 0);
    if (notifyHost) {
      // Avisar al cuidador (dueño del servicio)
      const serviceType = record.service_type as string;
      const serviceId = record.service_id as string;
      let hostId: string | undefined;
      let serviceName = serviceType === 'space' ? 'tu alojamiento' : 'tu servicio';
      if (serviceType === 'space') {
        const { data } = await supabase.from('spaces').select('host_id, title').eq('id', serviceId).single();
        hostId = data?.host_id as string | undefined; if (data?.title) serviceName = data.title as string;
      } else {
        const { data } = await supabase.from('visiters').select('host_id, name').eq('id', serviceId).single();
        hostId = data?.host_id as string | undefined; if (data?.name) serviceName = data.name as string;
      }
      if (!hostId) return;
      const { data: authUser } = await supabase.auth.admin.getUserById(hostId);
      const email = authUser?.user?.email;
      if (!email) return;
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', hostId).single();
      await sendEmail({ type: 'booking_cancelled', to: email, name: (profile?.full_name as string) ?? 'Cuidador', service_name: serviceName, service_type: serviceType, to_host: true, refund_amount: refund, refund_percent: percent });
    } else {
      const ctx = await resolveBookingCtx(supabase, record);
      if (!ctx) return;
      await sendEmail({ type: 'booking_cancelled', to: ctx.email, name: ctx.name, service_name: ctx.serviceName, service_type: ctx.serviceType, to_host: false, refund_amount: refund, refund_percent: percent });
    }
  }
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const body = await req.json() as Record<string, unknown>;

    // Database trigger path — no auth required (called server-side via pg_net)
    const trigger = req.headers.get('x-trigger-secret');
    if (trigger === Deno.env.get('TRIGGER_SECRET')) {
      // Direct payload (has 'to' field) — send immediately without DB lookup
      if (body.to) {
        await sendEmail(body as EmailPayload);
      } else {
        await handleTrigger(supabase, body);
      }
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin direct call path — requires admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) throw new Error('Unauthorized');
    const { data: caller } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
    if (!caller?.is_admin) throw new Error('Forbidden');

    await sendEmail(body as EmailPayload);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-email]', (err as Error).message);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
