'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import s from './LegalSidebar.module.scss'

type Item = {title: string; slug: string}

interface Props {
  sections: Item[]
}

export default function LegalSidebar({sections}: Props) {
  const pathname = usePathname()
  return (
    <nav aria-label="Legal sections">
      <ul className={s.list}>
        {sections.map((section, i) => {
          const href = `/legal/${section.slug}`
          const isActive = pathname === href || pathname === `${href}/`
          return (
            <li key={section.slug} className={s.item}>
              <Link
                href={href}
                className={[s.link, isActive ? s.linkActive : ''].filter(Boolean).join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {i + 1}. {section.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
