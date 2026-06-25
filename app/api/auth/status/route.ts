import {NextResponse} from 'next/server'
import {getCurrentCustomer} from '@/lib/auth/customer'

// Estado de sesión para el header (cookie httpOnly → no legible desde el cliente).
// Mantiene las páginas estáticas: el header lo consulta en cliente, no en el server layout.
// Valida el token contra Shopify (no solo la presencia de la cookie), para no mostrar
// "logueado" con un token caducado/inválido.
export async function GET() {
  const session = await getCurrentCustomer()
  return NextResponse.json({loggedIn: Boolean(session)}, {headers: {'Cache-Control': 'no-store'}})
}
