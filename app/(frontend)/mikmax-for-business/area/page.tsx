import {getCurrentCustomer} from '@/lib/auth/customer'
import s from './Area.module.scss'

// Área profesional mínima (Fase 1). Versión rica (política comercial, exención IVA,
// contacto asignado desde Sanity) → Fase 3.
export default async function B2bAreaPage() {
  const session = await getCurrentCustomer()
  const clientType = session?.customer.b2bClientType?.value
  const condition = clientType === 'designer' ? 'Interior Designer' : 'Reseller'

  return (
    <main className={s.area}>
      <h1 className={s.title}>Mikmax for Business</h1>
      <dl className={s.meta}>
        <div className={s.row}>
          <dt>Condición</dt>
          <dd>{condition}</dd>
        </div>
        <div className={s.row}>
          <dt>Contacto comercial</dt>
          <dd>business@mikmax.com</dd>
        </div>
      </dl>
      <p className={s.note}>
        Tus condiciones comerciales se aplican automáticamente en el carrito y el checkout.
      </p>
    </main>
  )
}
