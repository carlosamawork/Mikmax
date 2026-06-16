const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikmax.com'

// Escapa valores controlados por el usuario antes de interpolarlos en HTML de email.
const e = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

// Solo permite URLs http(s) en atributos href; cualquier otra cosa cae a '#'.
const safeUrl = (url: string) => {
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : '#'
  } catch {
    return '#'
  }
}

const wrap = (inner: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.5">${inner}</div>`

export function approvedEmail(companyName: string) {
  return {
    subject: 'Tu cuenta B2B de Mikmax está activa',
    html: wrap(
      `<p>Hola ${e(companyName)},</p>
       <p>Tu cuenta de empresa ha sido aprobada. Ya puedes iniciar sesión y comprar con tus condiciones.</p>
       <p><a href="${safeUrl(`${SITE}/mikmax-for-business`)}">Acceder a Mikmax for Business</a></p>`,
    ),
  }
}

// Para aprobaciones desde el panel (REVIEW): aviso de bienvenida.
// El enlace para fijar contraseña llega en un email separado (reset de Shopify).
export function approvedWithActivationEmail(companyName: string, activationUrl: string) {
  return {
    subject: 'Tu cuenta B2B de Mikmax está activa',
    html: wrap(
      `<p>Hola ${e(companyName)},</p>
       <p>Hemos aprobado tu cuenta de empresa. En breve recibirás un correo aparte con un enlace
       para crear tu contraseña y empezar a comprar con tus condiciones.</p>
       <p><a href="${safeUrl(activationUrl)}">Ir a Mikmax for Business</a></p>`,
    ),
  }
}

export function reviewEmail(companyName: string) {
  return {
    subject: 'Hemos recibido tu solicitud B2B',
    html: wrap(
      `<p>Hola ${e(companyName)},</p>
       <p>Estamos revisando tu solicitud de cuenta de empresa. Te escribiremos en cuanto la validemos.</p>`,
    ),
  }
}

export function rejectedEmail(companyName: string) {
  return {
    subject: 'Necesitamos más información sobre tu solicitud B2B',
    html: wrap(
      `<p>Hola ${e(companyName)},</p>
       <p>No hemos podido validar automáticamente tu solicitud. Responde a este correo con tu CIF/VAT y datos
       de empresa para continuar.</p>`,
    ),
  }
}

export function moreInfoEmail(companyName: string) {
  return {
    subject: 'Necesitamos completar tu solicitud B2B',
    html: wrap(
      `<p>Hola ${e(companyName)},</p>
       <p>Para continuar con tu alta necesitamos información adicional. Responde a este correo y te ayudamos.</p>`,
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
  return {
    subject: `[B2B REVIEW] ${data.companyName} (score ${data.score})`,
    html: wrap(
      `<p><strong>Nueva solicitud B2B en revisión</strong></p>
       <ul>
         <li>Empresa: ${e(data.companyName)}</li>
         <li>VAT: ${e(data.vatNumber)}</li>
         <li>País: ${e(data.country)}</li>
         <li>Tipo: ${e(data.clientType)}</li>
         <li>Email: ${e(data.corporateEmail)}</li>
         <li>Web: ${e(data.companyWebsite || '—')}</li>
         <li>Dirección fiscal: ${e(data.fiscalAddress)}</li>
         <li>Score: ${e(data.score)}</li>
         <li>Notas: ${e(data.notes || '—')}</li>
       </ul>
       <p>Revisar en Sanity Studio → Solicitudes B2B.</p>`,
    ),
  }
}
