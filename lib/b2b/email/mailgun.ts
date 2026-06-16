import 'server-only'

const API_KEY = process.env.MAILGUN_API_KEY
const DOMAIN = process.env.MAILGUN_DOMAIN
// Región US por defecto; para cuentas EU usar 'https://api.eu.mailgun.net'.
const BASE = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'

interface SendArgs {
  to: string
  subject: string
  html: string
  from?: string
}

// Envía un email vía Mailgun REST. Nunca lanza: devuelve {ok} o {error} para no
// romper el flujo de alta si el email falla.
export async function sendEmail({to, subject, html, from}: SendArgs): Promise<{ok?: boolean; error?: string}> {
  if (!API_KEY || !DOMAIN) return {error: 'Mailgun not configured'}
  const sender = from || `Mikmax B2B <noreply@${DOMAIN}>`
  const auth = Buffer.from(`api:${API_KEY}`).toString('base64')
  const body = new URLSearchParams({from: sender, to, subject, html})
  try {
    const res = await fetch(`${BASE}/v3/${DOMAIN}/messages`, {
      method: 'POST',
      headers: {Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded'},
      body,
      cache: 'no-store',
    })
    if (!res.ok) return {error: `Mailgun ${res.status}`}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}
