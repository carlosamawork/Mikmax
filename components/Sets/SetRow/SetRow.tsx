import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import type {SetArchiveItem} from '@/types/set'
import s from './SetRow.module.scss'

function formatPrice(min: number, max: number): string {
  const fmt = (n: number) => `€${Math.round(n)}`
  return max > min ? `${fmt(min)}-${fmt(max)}` : fmt(min)
}

export default function SetRow({item}: {item: SetArchiveItem}) {
  return (
    <Link href={`/sets/${item.slug}`} className={s.row}>
      <div className={s.minis}>
        {item.components.map((c, i) => (
          <div key={i} className={s.mini}>
            {c.imageUrl && (
              <LazyImage
                src={c.imageUrl}
                alt={c.imageAlt ?? item.title}
                width={358}
                height={444}
                className={s.img}
              />
            )}
          </div>
        ))}
      </div>
      <div className={s.caption}>
        <p className={s.kicker}>Complete Set</p>
        <p className={s.title}>{item.title}</p>
        <p className={s.price}>{formatPrice(item.priceMin, item.priceMax)}</p>
      </div>
    </Link>
  )
}
