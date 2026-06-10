import {NextResponse} from 'next/server'
import {getCustomerToken} from '@/lib/auth/session'

// Estado de sesión para el header (cookie httpOnly → no legible desde el cliente).
// Mantiene las páginas estáticas: el header lo consulta en cliente, no en el server layout.
export async function GET() {
  const token = await getCustomerToken()
  return NextResponse.json(
    {loggedIn: Boolean(token)},
    {headers: {'Cache-Control': 'no-store'}},
  )
}
