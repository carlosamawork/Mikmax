import {NextResponse} from 'next/server'
import {getB2bApplication, updateB2bApplication} from '@/lib/b2b/application'
import {createReviewedB2bCustomer} from '@/lib/b2b/shopify'
import {customerRecover} from '@/lib/shopify'
import {sendEmail} from '@/lib/b2b/email/mailgun'
import {
  approvedWithActivationEmail,
  rejectedEmail,
  moreInfoEmail,
} from '@/lib/b2b/email/templates'
import type {B2bClientType} from '@/types/b2b'

export const runtime = 'nodejs'

const ACTIONS = new Set(['approve', 'reject', 'more_info'])

export async function POST(req: Request, {params}: {params: Promise<{action: string}>}) {
  const {action} = await params
  if (!ACTIONS.has(action)) {
    return NextResponse.json({error: 'unknown_action'}, {status: 404})
  }

  // Auth simple por secreto compartido (header). El Studio lo envía.
  const secret = req.headers.get('x-b2b-admin-secret')
  if (!secret || secret !== process.env.B2B_ADMIN_ACTION_SECRET) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401})
  }

  let body: {id?: string}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({error: 'invalid_json'}, {status: 400})
  }
  if (!body.id) return NextResponse.json({error: 'missing_id'}, {status: 400})

  const app = await getB2bApplication(body.id)
  if (!app) return NextResponse.json({error: 'not_found'}, {status: 404})

  if (action === 'reject') {
    await updateB2bApplication(body.id, {status: 'rejected'})
    await sendEmail({to: app.corporateEmail, ...rejectedEmail(app.companyName)})
    return NextResponse.json({status: 'rejected'})
  }

  if (action === 'more_info') {
    await updateB2bApplication(body.id, {status: 'more_info'})
    await sendEmail({to: app.corporateEmail, ...moreInfoEmail(app.companyName)})
    return NextResponse.json({status: 'more_info'})
  }

  // approve: crea el customer (sin password) + activación por email.
  const result = await createReviewedB2bCustomer({
    email: app.corporateEmail,
    companyName: app.companyName,
    clientType: app.clientType as B2bClientType,
  })
  if (result.error || !result.customerId) {
    return NextResponse.json({error: result.error || 'create_failed'}, {status: 502})
  }
  await updateB2bApplication(body.id, {status: 'approved', shopifyCustomerId: result.customerId})

  // Dispara el flujo de recuperación existente para que el cliente fije contraseña.
  await customerRecover(app.corporateEmail)
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikmax.com'
  await sendEmail({
    to: app.corporateEmail,
    ...approvedWithActivationEmail(app.companyName, `${site}/login`),
  })
  return NextResponse.json({status: 'approved'})
}
