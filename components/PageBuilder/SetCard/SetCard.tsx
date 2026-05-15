import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import type {SetCardData} from '@/sanity/types'
import s from './SetCard.module.scss'

interface Props {
  set: SetCardData
  kind?: 'set' | 'look'
  className?: string
}

export default function SetCard({set, kind = 'set', className}: Props) {
  const route = kind === 'look' ? '/looks' : '/sets'
  const href = set.slug ? `${route}/${set.slug}` : '#'
  const components = (set.components ?? []).filter((c) => c.imageUrl)
  if (components.length === 0) return null

  return (
    <Link href={href} className={`${s.card} ${className ?? ''}`.trim()}>
      <div className={s.row}>
        {components.map((c, i) => (
          <div key={i} className={s.media}>
            <LazyImage
              src={c.imageUrl as string}
              alt={c.label ?? c.variantTitle ?? set.title ?? ''}
              width={357}
              height={476}
              className={s.img}
            />
          </div>
        ))}
      </div>
      <div className={s.info}>
        {set.title && <p className={s.title}>{set.title}</p>}
        {set.description && <p className={s.description}>{set.description}</p>}
      </div>
    </Link>
  )
}
