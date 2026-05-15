// components/Layout/MegaMenu/MegaMenuShop.tsx
'use client'

import {useState} from 'react'
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import s from './MegaMenu.module.scss'
import type {MenuShop} from '@/sanity/types'

interface Props {
  shop: MenuShop
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export default function MegaMenuShop({shop, onMouseEnter, onMouseLeave}: Props) {
  const tree = shop.tree ?? []
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null)

  return (
    <div
      className={s.shopMenu}
      role="menu"
      onMouseEnter={onMouseEnter}
      onMouseLeave={() => {
        setHoveredHandle(null)
        onMouseLeave?.()
      }}
    >
      {/* Image cell — pinned to row 1, col 3. Renders all parent images stacked
          and toggles them with opacity, so no remount/reflow on hover change. */}
      <div className={s.shopImageCell}>
        {tree.map((parent) => (
          <div
            key={parent.handle ?? parent.title}
            className={s.shopImageSlot}
            data-active={hoveredHandle === parent.handle ? 'true' : 'false'}
            aria-hidden={hoveredHandle !== parent.handle}
          >
            {parent.imageUrl && (
              <LazyImage
                src={parent.imageUrl}
                alt={parent.title || ''}
                fill
                sizes="(min-width: 768px) 33vw, 100vw"
                priority
                wrapperClassName={s.shopImageWrap}
                className={s.shopImage}
              />
            )}
          </div>
        ))}
      </div>

      {/* All parents flow into the grid; CSS auto-flow places them in cols 1-2
          since col 3 is reserved for the image at row 1. */}
      {tree.map((parent, idx) => (
        <div
          key={parent.handle ?? parent.title}
          className={`${s.shopCell} ${idx % 2 === 0 ? s.shopCellWhite : s.shopCellGrey}`}
          onMouseEnter={() => setHoveredHandle(parent.handle ?? null)}
        >
          <p className={s.shopLabel}>{parent.title}</p>
          <ul className={s.shopItems}>
            {parent.handle && parent.hasOwnProducts && (
              <li role="none">
                <Link
                  href={`/shop/${parent.handle}`}
                  role="menuitem"
                  className={s.shopItemLink}
                >
                  All
                </Link>
              </li>
            )}
            {(parent.children ?? []).map((child) => (
              <li key={child.handle ?? child.title} role="none">
                <Link
                  href={child.handle ? `/shop/${child.handle}` : '#'}
                  role="menuitem"
                  className={s.shopItemLink}
                >
                  {child.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
