// components/Layout/Footer/Footer.tsx
import s from './Footer.module.scss'
import NewsletterForm from './NewsletterForm'
import RegionSelector from './RegionSelector'
import {LazyImage} from '@/components/Common'
import type {FooterProps} from '@/types/footer'
import type {SocialLink, FooterColumnAny, LinkInternalRef} from '@/sanity/types'
import {getInternalHref} from '@/sanity/queries/fragments/links'
import Link from 'next/link'

type FooterLinkItem = {
  _key: string
  _type: 'linkInternal' | 'linkExternal'
  title?: string
  ref?: LinkInternalRef
  url?: string
  newWindow?: boolean
}

function FooterLinks({links}: {links: FooterLinkItem[]}) {
  return (
    <ul className={s.colLinks}>
      {links.map((link) => {
        const key = link._key
        if (link._type === 'linkInternal') {
          return (
            <li key={key}>
              <Link href={getInternalHref(link.ref)} className={s.colLink}>
                {link.title}
              </Link>
            </li>
          )
        }
        return (
          <li key={key}>
            <a
              href={link.url}
              target={link.newWindow ? '_blank' : undefined}
              rel={link.newWindow ? 'noopener noreferrer' : undefined}
              className={s.colLink}
            >
              {link.title}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

function SocialColumn({title, links}: {title: string; links: SocialLink[]}) {
  return (
    <div className={s.col}>
      <p className={s.colTitle}>{title}</p>
      <ul className={s.colLinks}>
        {links.map((link) => (
          <li key={link._key}>
            <a
              href={link.url}
              target={link.newWindow ? '_blank' : undefined}
              rel={link.newWindow ? 'noopener noreferrer' : undefined}
              className={s.colLink}
            >
              {link.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ShopColumn({
  title,
  parents,
  extraLinks,
}: {
  title: string
  parents?: Array<{title?: string; handle?: string}>
  extraLinks?: FooterLinkItem[]
}) {
  return (
    <div className={s.col}>
      <p className={s.colTitle}>{title}</p>
      <ul className={s.colLinks}>
        {(parents ?? []).map((p) => (
          <li key={p.handle ?? p.title}>
            <Link href={p.handle ? `/shop/${p.handle}` : '#'} className={s.colLink}>
              {p.title}
            </Link>
          </li>
        ))}
        {(extraLinks ?? []).map((link) => {
          if (link._type === 'linkInternal') {
            return (
              <li key={link._key}>
                <Link href={getInternalHref(link.ref)} className={s.colLink}>
                  {link.title}
                </Link>
              </li>
            )
          }
          return (
            <li key={link._key}>
              <a
                href={link.url}
                target={link.newWindow ? '_blank' : undefined}
                rel={link.newWindow ? 'noopener noreferrer' : undefined}
                className={s.colLink}
              >
                {link.title}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Footer({data}: FooterProps) {
  const newsletter = data?.newsletter
  const columns: FooterColumnAny[] = data?.columns ?? []
  const regions = data?.regions ?? []

  return (
    <footer className={s.footer}>
      {/* <div className={s.top}>
        <div className={s.newsletter}>
          <NewsletterForm
            title={newsletter?.title}
            subtitle={newsletter?.body}
            placeholder={newsletter?.placeholder}
            buttonLabel={newsletter?.buttonLabel}
          />
          <span className={s.copyright}>© {new Date().getFullYear()} Mikmax</span>
        </div>

        <div className={s.columns}>
          {columns.map((col) => {
            if (col._type === 'footerColumnShop') {
              return (
                <ShopColumn
                  key={col._key}
                  title={col.title}
                  parents={col.parents}
                  extraLinks={col.extraLinks}
                />
              )
            }
            if (col._type === 'footerColumnSocial') {
              return (
                <SocialColumn key={col._key} title={col.title} links={col.links} />
              )
            }
            return (
              <div key={col._key} className={s.col}>
                <p className={s.colTitle}>{col.title}</p>
                <FooterLinks links={col.links} />
              </div>
            )
          })}

          <div className={s.regionWrap}>
            <RegionSelector regions={regions} />
          </div>
        </div>
      </div> */}

      <div className={s.bigLogo} aria-hidden>
        <LazyImage
          src="/icons/mikmax.svg"
          alt=""
          width={1440}
          height={297}
          className={s.bigLogoImg}
          priority
        />
      </div>
    </footer>
  )
}
