const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikmax.com'
const LOGO = `${SITE}/icons/mikmax-logo-email.png`

// Escapa valores controlados por el usuario antes de interpolarlos en HTML de email.
const e = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Solo permite URLs http(s) en atributos href; cualquier otra cosa cae a la home.
const safeUrl = (url: string) => {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : SITE
  } catch {
    return SITE
  }
}

// --- Bloques de contenido reutilizables (estilos inline, email-safe) ---

const heading = (text: string) =>
  `<h1 style="margin:0 0 16px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:20px;line-height:1.3;font-weight:700;color:#2b2b2b;">${e(text)}</h1>`

const paragraph = (html: string) =>
  `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#2b2b2b;">${html}</p>`

const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
     <tr><td style="background:#2b2b2b;">
       <a href="${safeUrl(href)}" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:0.5px;color:#ffffff;text-decoration:none;text-transform:uppercase;">${e(label)}</a>
     </td></tr>
   </table>`

// Envuelve el contenido en la maquetación corporativa: cabecera con logo + footer con links.
function layout(inner: string) {
  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mikmax</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;">
        <tr><td style="padding:28px 32px 22px;border-bottom:1px solid #ededed;">
          <a href="${SITE}" style="text-decoration:none;"><img src="${LOGO}" width="120" alt="Mikmax" style="display:block;border:0;width:120px;height:auto;"></a>
        </td></tr>
        <tr><td style="padding:32px;">
          ${inner}
        </td></tr>
        <tr><td style="padding:22px 32px;border-top:1px solid #ededed;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#8a8a8a;">
          <p style="margin:0 0 8px;">
            <a href="${SITE}/shop" style="color:#2b2b2b;text-decoration:none;">Shop</a> &nbsp;·&nbsp;
            <a href="${SITE}/mikmax-for-business" style="color:#2b2b2b;text-decoration:none;">Mikmax for Business</a> &nbsp;·&nbsp;
            <a href="${SITE}/contact" style="color:#2b2b2b;text-decoration:none;">Contact</a>
          </p>
          <p style="margin:0;">© 2026 Mikmax · <a href="${SITE}" style="color:#8a8a8a;text-decoration:none;">www.mikmax.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

// --- Emails ---

export function approvedEmail(companyName: string) {
  return {
    subject: 'Tu cuenta B2B de Mikmax está activa',
    html: layout(
      heading('Tu cuenta de empresa está activa') +
        paragraph(`Hola ${e(companyName)},`) +
        paragraph(
          'Hemos aprobado tu cuenta de empresa. Ya puedes iniciar sesión y comprar con tus condiciones.',
        ) +
        button(`${SITE}/mikmax-for-business`, 'Acceder a Mikmax for Business'),
    ),
  }
}

// Para aprobaciones desde el panel (REVIEW): aviso de bienvenida.
// El enlace para fijar contraseña llega en un email separado (reset de Shopify).
export function approvedWithActivationEmail(companyName: string, activationUrl: string) {
  return {
    subject: 'Tu cuenta B2B de Mikmax está activa',
    html: layout(
      heading('Bienvenido a Mikmax for Business') +
        paragraph(`Hola ${e(companyName)},`) +
        paragraph(
          'Hemos aprobado tu cuenta de empresa. En breve recibirás un correo aparte con un enlace para crear tu contraseña y empezar a comprar con tus condiciones.',
        ) +
        button(activationUrl, 'Ir a Mikmax for Business'),
    ),
  }
}

export function reviewEmail(companyName: string) {
  return {
    subject: 'Hemos recibido tu solicitud B2B',
    html: layout(
      heading('Estamos revisando tu solicitud') +
        paragraph(`Hola ${e(companyName)},`) +
        paragraph(
          'Hemos recibido tu solicitud de cuenta de empresa y la estamos revisando. Te escribiremos en cuanto la validemos.',
        ),
    ),
  }
}

export function rejectedEmail(companyName: string) {
  return {
    subject: 'Necesitamos más información sobre tu solicitud B2B',
    html: layout(
      heading('Necesitamos más información') +
        paragraph(`Hola ${e(companyName)},`) +
        paragraph(
          'No hemos podido validar automáticamente tu solicitud. Responde a este correo con tu CIF/VAT y los datos de tu empresa para continuar.',
        ),
    ),
  }
}

export function moreInfoEmail(companyName: string) {
  return {
    subject: 'Necesitamos completar tu solicitud B2B',
    html: layout(
      heading('Completa tu solicitud') +
        paragraph(`Hola ${e(companyName)},`) +
        paragraph(
          'Para continuar con tu alta necesitamos información adicional. Responde a este correo y te ayudamos.',
        ),
    ),
  }
}

export function internalReviewEmail(data: {
  companyName: string
  vatNumber: string
  country: string
  clientType: string
  corporateEmail: string
  companyWebsite?: string
  fiscalAddress: string
  score: number
  notes?: string
}) {
  const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a8a8a;white-space:nowrap;vertical-align:top;">${e(label)}</td>
       <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#2b2b2b;">${e(value)}</td>
     </tr>`
  return {
    subject: `[B2B REVIEW] ${data.companyName} (score ${data.score})`,
    html: layout(
      heading('Nueva solicitud B2B en revisión') +
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 16px;">
           ${row('Empresa', data.companyName)}
           ${row('VAT', data.vatNumber)}
           ${row('País', data.country)}
           ${row('Tipo', data.clientType)}
           ${row('Email', data.corporateEmail)}
           ${row('Web', data.companyWebsite || '—')}
           ${row('Dirección fiscal', data.fiscalAddress)}
           ${row('Score', String(data.score))}
           ${row('Notas', data.notes || '—')}
         </table>` +
        paragraph('Revísala en Sanity Studio → Solicitudes B2B.'),
    ),
  }
}
