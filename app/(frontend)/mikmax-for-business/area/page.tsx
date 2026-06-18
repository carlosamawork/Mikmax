import {getCurrentCustomer} from '@/lib/auth/customer'
import {getB2bArea} from '@/sanity/queries/queries/b2bArea'
import {getLocale} from '@/lib/i18n/getLocale'
import PortableText from '@/components/PageBuilder/PortableText/PortableText'
import s from './Area.module.scss'

export default async function B2bAreaPage() {
  const session = await getCurrentCustomer()
  const clientType = session?.customer.b2bClientType?.value
  const isDesigner = clientType === 'designer'
  const condition = isDesigner ? 'Interior Designer' : 'Reseller'

  const locale = await getLocale()
  const data = await getB2bArea(locale)
  const group = isDesigner ? data?.designer : data?.reseller
  const contactEmail = group?.contactEmail || 'business@mikmax.com'

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
          <dd>
            {group?.contactName && <span className={s.contactName}>{group.contactName}</span>}
            <a href={`mailto:${contactEmail}`} className={s.contactLink}>
              {contactEmail}
            </a>
          </dd>
        </div>
      </dl>

      {data?.intro && (
        <section className={s.section}>
          <PortableText value={data.intro} />
        </section>
      )}

      {group?.commercialPolicy && (
        <section className={s.section}>
          <h2 className={s.heading}>Política comercial</h2>
          <PortableText value={group.commercialPolicy} />
        </section>
      )}

      {group?.purchaseConditions && (
        <section className={s.section}>
          <h2 className={s.heading}>Condiciones de compra</h2>
          <PortableText value={group.purchaseConditions} />
        </section>
      )}

      {group?.taxInfo && (
        <section className={s.section}>
          <h2 className={s.heading}>Fiscalidad</h2>
          <PortableText value={group.taxInfo} />
        </section>
      )}

      {!group && (
        <p className={s.note}>
          Tus condiciones comerciales se aplican automáticamente en el carrito y el checkout.
        </p>
      )}
    </main>
  )
}
