const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikmax.com'

const wrap = (inner: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.5">${inner}</div>`

export function approvedEmail(companyName: string) {
  return {
    subject: 'Tu cuenta B2B de Mikmax está activa',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>Tu cuenta de empresa ha sido aprobada. Ya puedes iniciar sesión y comprar con tus condiciones.</p>
       <p><a href="${SITE}/b2b">Acceder a Mikmax for Business</a></p>`,
    ),
  }
}

// Para aprobaciones desde el panel (REVIEW): incluye enlace para fijar contraseña.
export function approvedWithActivationEmail(companyName: string, activationUrl: string) {
  return {
    subject: 'Tu cuenta B2B de Mikmax está activa — crea tu contraseña',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>Hemos aprobado tu cuenta de empresa. Crea tu contraseña para empezar:</p>
       <p><a href="${activationUrl}">Crear contraseña y acceder</a></p>`,
    ),
  }
}

export function reviewEmail(companyName: string) {
  return {
    subject: 'Hemos recibido tu solicitud B2B',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>Estamos revisando tu solicitud de cuenta de empresa. Te escribiremos en cuanto la validemos.</p>`,
    ),
  }
}

export function rejectedEmail(companyName: string) {
  return {
    subject: 'Necesitamos más información sobre tu solicitud B2B',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>No hemos podido validar automáticamente tu solicitud. Responde a este correo con tu CIF/VAT y datos
       de empresa para continuar.</p>`,
    ),
  }
}

export function moreInfoEmail(companyName: string) {
  return {
    subject: 'Necesitamos completar tu solicitud B2B',
    html: wrap(
      `<p>Hola ${companyName},</p>
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
         <li>Empresa: ${data.companyName}</li>
         <li>VAT: ${data.vatNumber}</li>
         <li>País: ${data.country}</li>
         <li>Tipo: ${data.clientType}</li>
         <li>Email: ${data.corporateEmail}</li>
         <li>Web: ${data.companyWebsite || '—'}</li>
         <li>Dirección fiscal: ${data.fiscalAddress}</li>
         <li>Score: ${data.score}</li>
         <li>Notas: ${data.notes || '—'}</li>
       </ul>
       <p>Revisar en Sanity Studio → Solicitudes B2B.</p>`,
    ),
  }
}
