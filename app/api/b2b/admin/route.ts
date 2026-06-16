import {type NextRequest, NextResponse} from 'next/server'
import {parseBody} from 'next-sanity/webhook'
import {getB2bApplication, resolveB2bApplication} from '@/lib/b2b/application'
import {createReviewedB2bCustomer} from '@/lib/b2b/shopify'
import {customerRecover} from '@/lib/shopify'
import {sendEmail} from '@/lib/b2b/email/mailgun'
import {approvedWithActivationEmail, rejectedEmail, moreInfoEmail} from '@/lib/b2b/email/templates'
import type {B2bClientType} from '@/types/b2b'

export const runtime = 'nodejs'

// Webhook firmado de Sanity: se dispara cuando un b2bApplication tiene `adminAction`
// definido (lo escriben los botones del panel). Procesa la acción y limpia el flag.
type WebhookBody = {_id?: string; adminAction?: string}

export async function POST(req: NextRequest) {
  let isValidSignature: boolean | null
  let body: WebhookBody | null
  try {
    ;({isValidSignature, body} = await parseBody<WebhookBody>(
      req,
      process.env.SANITY_B2B_WEBHOOK_SECRET,
    ))
  } catch (err) {
    return NextResponse.json({message: err instanceof Error ? err.message : 'bad body'}, {status: 400})
  }

  if (!isValidSignature) {
    return NextResponse.json({message: 'Invalid signature'}, {status: 401})
  }
  if (!body?._id) {
    return NextResponse.json({message: 'Missing _id'}, {status: 400})
  }

  const app = await getB2bApplication(body._id)
  if (!app) return NextResponse.json({message: 'not found'}, {status: 404})

  const action = app.adminAction
  // El flag pudo limpiarse ya (webhook duplicado / carrera): nada que hacer.
  if (!action) return NextResponse.json({skipped: 'no_action'})

  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikmax.com'

  if (action === 'reject') {
    await resolveB2bApplication(body._id, {status: 'rejected'})
    await sendEmail({to: app.corporateEmail, ...rejectedEmail(app.companyName)})
    return NextResponse.json({ok: true, action})
  }

  if (action === 'more_info') {
    await resolveB2bApplication(body._id, {status: 'more_info'})
    await sendEmail({to: app.corporateEmail, ...moreInfoEmail(app.companyName)})
    return NextResponse.json({ok: true, action})
  }

  if (action === 'approve') {
    const result = await createReviewedB2bCustomer({
      email: app.corporateEmail,
      companyName: app.companyName,
      clientType: app.clientType as B2bClientType,
    })
    if (result.error || !result.customerId) {
      // No perder la solicitud: registra el error y limpia el flag.
      await resolveB2bApplication(body._id, {
        internalNotes: `Aprobación fallida: ${result.error}. Revisar manualmente.`,
      })
      return NextResponse.json({error: result.error || 'create_failed'}, {status: 502})
    }
    await resolveB2bApplication(body._id, {status: 'approved', shopifyCustomerId: result.customerId})
    // Cliente nuevo (sin contraseña) → enviar enlace para fijarla. Si ya existía, ya tiene login.
    if (!result.existed) await customerRecover(app.corporateEmail)
    await sendEmail({
      to: app.corporateEmail,
      ...approvedWithActivationEmail(app.companyName, `${site}/login`),
    })
    return NextResponse.json({ok: true, action, existed: result.existed})
  }

  return NextResponse.json({message: 'unknown action'}, {status: 400})
}
