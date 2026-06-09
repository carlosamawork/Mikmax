import Link from 'next/link'
import {BASE_URL} from '@/utils/seoHelper'
import s from './Breadcrumb.module.scss'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface Props {
  items: BreadcrumbItem[]
}

export default function Breadcrumb({items}: Props) {
  if (!items?.length) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? {item: new URL(item.href, BASE_URL).toString()} : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}}
      />
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <ol className={s.list}>
          {items.map((item, i) => {
            const isLast = i === items.length - 1
            return (
              <li key={`${item.label}-${i}`} aria-current={isLast ? 'page' : undefined}>
                {item.href && !isLast ? <Link href={item.href}>{item.label}</Link> : item.label}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
