import {getB2bArea} from '@/sanity/queries/queries/b2bArea'
import {getLocale} from '@/lib/i18n/getLocale'
import PortableText from '@/components/PageBuilder/PortableText/PortableText'
import s from './Area.module.scss'

export default async function B2bAreaPage() {
  const locale = await getLocale()
  const data = await getB2bArea(locale)
  const group = data?.content
  const contactEmail = group?.contactEmail || 'business@mikmax.com'

  return (
    <div className={s.area}>
      <h1 className={s.title}>Mikmax for Business</h1>
      <dl className={s.meta}>
        <div className={s.row}>
          <dt>Commercial contact</dt>
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
          <h2 className={s.heading}>Commercial policy</h2>
          <PortableText value={group.commercialPolicy} />
        </section>
      )}

      {group?.purchaseConditions && (
        <section className={s.section}>
          <h2 className={s.heading}>Purchase conditions</h2>
          <PortableText value={group.purchaseConditions} />
        </section>
      )}

      {group?.taxInfo && (
        <section className={s.section}>
          <h2 className={s.heading}>Taxation</h2>
          <PortableText value={group.taxInfo} />
        </section>
      )}

      {!group && (
        <p className={s.note}>
          Your commercial terms are applied automatically in the cart and at checkout.
        </p>
      )}
    </div>
  )
}
