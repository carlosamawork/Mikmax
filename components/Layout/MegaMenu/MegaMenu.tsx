// components/Layout/MegaMenu/MegaMenu.tsx
'use client'

import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import s from './MegaMenu.module.scss'
import type {MenuGroup} from '@/sanity/types'

interface MegaMenuProps {
  group: MenuGroup
}

export default function MegaMenu({group}: MegaMenuProps) {
  return (
    <div className={s.menu} role="menu">
      <div className={s.itemsCol}>
        <p className={s.label}>{group.label}</p>
        <ul className={s.items}>
          {group.items.map((item) => {
            if (item._type === 'linkInternal') {
              return (
                <li key={item._key} role="none">
                  <Link href={item.slug ? `/${item.slug}` : '#'} role="menuitem" className={s.itemLink}>
                    {item.title}
                  </Link>
                </li>
              )
            }
            return (
              <li key={item._key} role="none">
                <a
                  href={item.url}
                  target={item.newWindow ? '_blank' : undefined}
                  rel={item.newWindow ? 'noopener noreferrer' : undefined}
                  role="menuitem"
                  className={s.itemLink}
                >
                  {item.title}
                </a>
              </li>
            )
          })}
        </ul>
      </div>

      {group.featuredProduct?.image && (
        <Link
          href={group.featuredProduct.handle ? `/shop/product/${group.featuredProduct.handle}` : '#'}
          className={s.featured}
        >
          <LazyImage
            src={group.featuredProduct.image}
            alt={group.featuredProduct.title || 'Producto destacado'}
            width={357}
            height={554}
            wrapperClassName={s.featuredImage}
          />
          <span className={s.featuredTitle}>{group.featuredProduct.title}</span>
        </Link>
      )}
    </div>
  )
}
