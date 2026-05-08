import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PriceDisplay from '../PriceDisplay/PriceDisplay'
import type {BundleCardData} from '@/sanity/types'
import s from './BundleCard.module.scss'

interface Props {
  bundle: BundleCardData
  // 'look' or 'set' decides the route prefix.
  kind: 'look' | 'set'
  className?: string
}

export default function BundleCard({bundle, kind, className}: Props) {
  const route = kind === 'look' ? '/looks' : '/sets'
  const href = bundle.slug ? `${route}/${bundle.slug}` : '#'
  const w = bundle.image?.metadata?.dimensions?.width ?? 357
  const h = bundle.image?.metadata?.dimensions?.height ?? 476

  return (
    <Link href={href} className={`${s.card} ${className ?? ''}`.trim()}>
      <div className={s.media}>
        {bundle.image?.imageUrl && (
          <LazyImage
            src={bundle.image.imageUrl}
            alt={bundle.image.alt ?? bundle.title ?? ''}
            width={w}
            height={h}
            className={s.img}
          />
        )}
      </div>
      <div className={s.info}>
        {bundle.title && <p className={s.title}>{bundle.title}</p>}
        {bundle.colorLocked && <p className={s.color}>{bundle.colorLocked}</p>}
        <PriceDisplay min={bundle.priceFixed} compareAt={bundle.priceCompareAt} />
      </div>
    </Link>
  )
}
