import {NextResponse} from 'next/server'
import {getCustomerToken, clearCustomerSession} from '@/lib/auth/session'
import {getCustomerWishlist} from '@/lib/shopify'
import {setCustomerWishlist} from '@/lib/shopify-admin'

function parseHandles(value?: string | null): string[] {
  if (!value) return []
  try {
    const arr = JSON.parse(value)
    return Array.isArray(arr) ? arr.filter((h): h is string => typeof h === 'string') : []
  } catch {
    return []
  }
}

// GET → estado de la wishlist del cliente (handles). Sin sesión: vacío.
export async function GET() {
  const token = await getCustomerToken()
  if (!token) {
    return NextResponse.json({loggedIn: false, handles: []}, {headers: {'Cache-Control': 'no-store'}})
  }
  const res = await getCustomerWishlist(token)
  // Token presente pero Shopify no resuelve cliente (caducado/inválido):
  // tratar como deslogueado y limpiar la cookie para no quedar en estado roto.
  if (!res?.customer) {
    await clearCustomerSession()
    return NextResponse.json({loggedIn: false, handles: []}, {headers: {'Cache-Control': 'no-store'}})
  }
  const handles = parseHandles(res.customer.metafield?.value)
  return NextResponse.json({loggedIn: true, handles}, {headers: {'Cache-Control': 'no-store'}})
}

// POST {handle} → añade o quita ese handle (toggle). Escribe vía Admin API.
export async function POST(request: Request) {
  const token = await getCustomerToken()
  if (!token) {
    return NextResponse.json({loggedIn: false, error: 'unauthenticated'}, {status: 401})
  }
  const body = await request.json().catch(() => null)
  const handle = typeof body?.handle === 'string' ? body.handle : null
  if (!handle) {
    return NextResponse.json({error: 'missing handle'}, {status: 400})
  }

  const res = await getCustomerWishlist(token)
  const customerId = res?.customer?.id
  if (!customerId) {
    // Token inválido/caducado: limpiar sesión y responder 401 para que la UI
    // pida re-login, en vez de un 400 que deja el botón "roto".
    await clearCustomerSession()
    return NextResponse.json({loggedIn: false, error: 'unauthenticated'}, {status: 401})
  }

  const current = parseHandles(res?.customer?.metafield?.value)
  const has = current.includes(handle)
  const next = has ? current.filter((h) => h !== handle) : [...current, handle]

  const write = await setCustomerWishlist(customerId, next)
  if ((write as {error?: string})?.error) {
    return NextResponse.json({error: (write as {error: string}).error}, {status: 500})
  }

  return NextResponse.json(
    {handles: next, action: has ? 'removed' : 'added'},
    {headers: {'Cache-Control': 'no-store'}},
  )
}
