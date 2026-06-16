import type {B2bCompanyInfo} from '@/types/b2b'
import s from '../accountForm.module.scss'
import c from './CompanyInfo.module.scss'

const CONDITION: Record<string, string> = {
  reseller: 'Reseller',
  designer: 'Interior Designer',
}

// Sección read-only con los datos de empresa de un cliente B2B (validados en el alta).
export default function CompanyInfo({company}: {company: B2bCompanyInfo}) {
  const rows: {label: string; value?: string}[] = [
    {label: 'Company', value: company.companyName},
    {label: 'VAT / Tax ID', value: company.vatNumber},
    {label: 'Country', value: company.country},
    {label: 'Account type', value: company.clientType ? CONDITION[company.clientType] : undefined},
    {label: 'Fiscal address', value: company.fiscalAddress},
    {label: 'Website', value: company.companyWebsite},
  ].filter((r) => Boolean(r.value))

  return (
    <section className={s.section}>
      <h2 className={s.title}>Company information</h2>
      <dl className={c.list}>
        {rows.map((r) => (
          <div className={c.row} key={r.label}>
            <dt className={c.label}>{r.label}</dt>
            <dd className={c.value}>{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
