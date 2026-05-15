import Link from 'next/link'
import {LazyImage, LazyVideo} from '@/components/Common'
import type {CampaignImageVideoBlock} from '@/sanity/types'
import s from './CampaignImageVideo.module.scss'

interface Props {
  block: CampaignImageVideoBlock
}

const ratioClass: Record<string, string> = {
  '16:9': 'r-16-9',
  '4:5': 'r-4-5',
  '1:1': 'r-1-1',
  '3:4': 'r-3-4',
  '21:9': 'r-21-9',
  '3:2': 'r-3-2',
}

export default function CampaignImageVideo({block}: Props) {
  const ratio = block.aspectRatio ?? '16:9'
  const ratioCls = ratio === 'auto' ? '' : (s[ratioClass[ratio]] ?? s['r-16-9'])
  const wrapCls = block.fullBleed ? s.bleed : s.contained
  const narrowCls = block.narrow ? s.narrow : ''

  // When aspectRatio === 'auto', derive the ratio from the image's natural
  // dimensions so the box matches the asset exactly.
  const autoRatioStyle: React.CSSProperties | undefined =
    ratio === 'auto' && block.image?.metadata?.dimensions
      ? {
          aspectRatio: `${block.image.metadata.dimensions.width} / ${block.image.metadata.dimensions.height}`,
        }
      : undefined

  const media = (() => {
    if (block.mediaType === 'video' && block.video?.src) {
      return (
        <LazyVideo
          src={block.video.src}
          poster={block.video.poster?.imageUrl}
          posterAlt={block.video.posterAlt}
          className={s.video}
          autoPlay
          muted
          loop
          playsInline
        />
      )
    }
    if (block.image?.imageUrl) {
      const w = block.image.metadata?.dimensions?.width ?? 1440
      const h = block.image.metadata?.dimensions?.height ?? 810
      return (
        <LazyImage
          src={block.image.imageUrl}
          alt={block.image.alt ?? ''}
          width={w}
          height={h}
          className={s.img}
        />
      )
    }
    return null
  })()

  const inner = (
    <div className={`${s.media} ${ratioCls}`.trim()} style={autoRatioStyle}>
      {media}
      {block.headline && <p className={s.headline}>{block.headline}</p>}
    </div>
  )

  const sectionCls = `${s.wrap} ${wrapCls} ${narrowCls}`.trim().replace(/\s+/g, ' ')

  if (!block.url) {
    return <section className={sectionCls}>{inner}</section>
  }
  if (block.url.startsWith('/')) {
    return (
      <section className={sectionCls}>
        <Link href={block.url}>{inner}</Link>
      </section>
    )
  }
  return (
    <section className={sectionCls}>
      <a href={block.url} target="_blank" rel="noopener noreferrer">
        {inner}
      </a>
    </section>
  )
}
