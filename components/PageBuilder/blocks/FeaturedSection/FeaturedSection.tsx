import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import PortableText from '../../PortableText/PortableText'
import type {FeaturedSectionBlock} from '@/sanity/types'
import s from './FeaturedSection.module.scss'

interface Props {
  block: FeaturedSectionBlock
}

function Cta({label, url}: {label?: string; url?: string}) {
  if (!label || !url) return null
  if (url.startsWith('/')) {
    return (
      <Link href={url} className={s.cta}>
        {label}
      </Link>
    )
  }
  return (
    <a href={url} className={s.cta} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  )
}

export default function FeaturedSection({block}: Props) {
  const sectionCls = `${s.section} ${block.mediaPosition === 'right' ? s.right : ''}`.trim()
  return (
    <section className={sectionCls}>
      <div className={s.media}>
        {block.image?.imageUrl && (
          <LazyImage
            src={block.image.imageUrl}
            alt={block.image.alt ?? ''}
            width={block.image.metadata?.dimensions?.width ?? 1200}
            height={block.image.metadata?.dimensions?.height ?? 1500}
            className={s.img}
          />
        )}
      </div>
      <div className={s.copy}>
        {block.headline && <h2 className={s.headline}>{block.headline}</h2>}
        {block.body?.length ? <PortableText value={block.body} /> : null}
        <Cta label={block.cta?.label} url={block.cta?.url} />
      </div>
    </section>
  )
}
