import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceDisplay from '@/components/PageBuilder/PriceDisplay/PriceDisplay'
import type {LookArchiveItem} from '@/types/look'
import s from './LookCard.module.scss'

export default function LookCard({look}: {look: LookArchiveItem}) {
  return (
    <Link href={`/looks/${look.slug}`} className={s.card}>
      <div className={s.media}>
        {look.imageUrl && (
          <LazyImage
            src={look.imageUrl}
            alt={look.imageAlt ?? look.title}
            width={357}
            height={476}
            className={s.img}
          />
        )}
      </div>
      <div className={s.info}>
        <p className={s.title}>{look.title}</p>
        <PriceDisplay
          min={look.discMin}
          max={look.discMax > look.discMin ? look.discMax : undefined}
          compareAt={look.hasDiscount ? look.rawMin : undefined}
        />
      </div>
    </Link>
  )
}
