import type {B2bCompanyInfo} from '@/types/b2b'
import s from '../accountForm.module.scss'
import c from './CompanyInfo.module.scss'

// Sección read-only con los datos de empresa de un cliente B2B (validados en el alta).
// Mismo patrón que AccountField: label arriba (fuera de la caja) + valor en caja gris.
export default function CompanyInfo({company}: {company: B2bCompanyInfo}) {
  const rows: {label: string; value?: string}[] = [
    {label: 'Company', value: company.companyName},
    {label: 'VAT / Tax ID', value: company.vatNumber},
    {label: 'Country', value: company.country},
    {label: 'Fiscal address', value: company.fiscalAddress},
    {label: 'Website', value: company.companyWebsite},
  ].filter((r) => Boolean(r.value))

  return (
    <section className={s.section}>
      <h2 className={s.title}>Company information</h2>
      <p className={c.note}>
        These details were verified at registration and can’t be edited.{' '}
        <a href="mailto:contact@mikmax.com" className={c.noteLink}>
          Contact us
        </a>{' '}
        to update them.
      </p>
      {rows.map((r) => (
        <div className={c.field} key={r.label}>
          <span className={c.label}>{r.label}</span>
          <div className={c.value}>{r.value}</div>
        </div>
      ))}
    </section>
  )
}
