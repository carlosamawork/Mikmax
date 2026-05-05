// components/Layout/Footer/Footer.tsx
import s from './Footer.module.scss'
import NewsletterForm from './NewsletterForm'
import type {FooterProps} from '@/types/footer'
import Link from 'next/link'

export default function Footer({data}: FooterProps) {
  const links = data?.links ?? []
  const linksTerms = data?.linksTerms ?? []
  const linksSocial = data?.linksSocial ?? []

  return (
    <footer className={s.footer}>
      <div className={s.top}>
        <NewsletterForm />

        <nav className={s.nav} aria-label="Footer navigation">
          {links.map((link) => {
            const key = link._key
            if (link._type === 'linkInternal') {
              return (
                <Link key={key} href={link.href ?? '#'} className={s.navLink}>
                  {link.title}
                </Link>
              )
            }
            if (link._type === 'linkExternal') {
              return (
                <a
                  key={key}
                  href={link.url}
                  target={link.newWindow ? '_blank' : undefined}
                  rel={link.newWindow ? 'noopener noreferrer' : undefined}
                  className={s.navLink}
                >
                  {link.title}
                </a>
              )
            }
            return null
          })}
        </nav>

        {linksSocial.length > 0 && (
          <ul className={s.social} aria-label="Redes sociales">
            {linksSocial.map((sLink) => (
              <li key={sLink._key}>
                <a href={sLink.url} target="_blank" rel="noopener noreferrer">
                  {sLink.title}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className={s.country} aria-label="Country selector">
          País: España (EUR)
        </div>
      </div>

      <div className={s.legal}>
        <span>© {new Date().getFullYear()} Mikmax</span>
        {linksTerms.length > 0 && (
          <ul className={s.terms}>
            {linksTerms.map((link) => {
              if (link._type === 'linkInternal') {
                return (
                  <li key={link._key}>
                    <Link href={link.href ?? '#'}>{link.title}</Link>
                  </li>
                )
              }
              return (
                <li key={link._key}>
                  <a href={link.url}>{link.title}</a>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </footer>
  )
}
