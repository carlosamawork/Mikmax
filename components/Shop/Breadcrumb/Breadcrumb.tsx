import Link from 'next/link'
import type { BreadcrumbCrumb } from '@/types/shop'
import s from './Breadcrumb.module.scss'

interface Props {
  crumbs: BreadcrumbCrumb[]
}

export default function Breadcrumb({ crumbs }: Props) {
  if (crumbs.length === 0) return null
  return (
    <nav aria-label="Breadcrumb" className={s.breadcrumb}>
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className={c.href ? s.link : s.current}>
          {c.href ? (
            <Link href={c.href} className={s.link}>
              {c.label}
            </Link>
          ) : (
            c.label
          )}
          {i < crumbs.length - 1 && <span className={s.sep}> &gt; </span>}
        </span>
      ))}
    </nav>
  )
}
