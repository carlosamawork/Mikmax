import Link from 'next/link'
import {LazyImage, LazyVideo} from '@/components/Common'
import PortableText from '@/components/PageBuilder/PortableText/PortableText'
import type {TwoColumnBlock, TwoColumnCell} from '@/sanity/types'
import s from './TwoColumn.module.scss'

interface Props {
  block: TwoColumnBlock
}

function MediaInner({cell}: {cell: Extract<TwoColumnCell, {kind: 'media'}>}) {
  const captionCls = cell.captionTheme === 'dark' ? s.captionDark : s.captionLight
  const media = (() => {
    if (cell.mediaType === 'video' && cell.video?.src) {
      return (
        <LazyVideo
          src={cell.video.src}
          poster={cell.video.poster?.imageUrl}
          posterAlt={cell.video.posterAlt}
          className={s.asset}
          autoPlay
          muted
          loop
          playsInline
        />
      )
    }
    if (cell.image?.imageUrl) {
      const w = cell.image.metadata?.dimensions?.width ?? 1440
      const h = cell.image.metadata?.dimensions?.height ?? 810
      return (
        <LazyImage
          src={cell.image.imageUrl}
          alt={cell.image.alt ?? ''}
          width={w}
          height={h}
          className={s.img}
        />
      )
    }
    return null
  })()

  return (
    <>
      {media}
      {cell.caption && <p className={`${s.caption} ${captionCls}`}>{cell.caption}</p>}
    </>
  )
}

function Cell({cell}: {cell: TwoColumnCell}) {
  if (cell.kind === 'text') {
    return (
      <div className={`${s.cell} ${s.text}`}>
        <PortableText value={cell.body} className={s.body} />
      </div>
    )
  }

  const inner = <MediaInner cell={cell} />

  if (!cell.url) {
    return <div className={`${s.cell} ${s.media}`}>{inner}</div>
  }
  if (cell.url.startsWith('/')) {
    return (
      <div className={`${s.cell} ${s.media}`}>
        <Link href={cell.url} className={s.link}>
          {inner}
        </Link>
      </div>
    )
  }
  return (
    <div className={`${s.cell} ${s.media}`}>
      <a href={cell.url} target="_blank" rel="noopener noreferrer" className={s.link}>
        {inner}
      </a>
    </div>
  )
}

export default function TwoColumn({block}: Props) {
  return (
    <section className={s.row}>
      <Cell cell={block.left} />
      <Cell cell={block.right} />
    </section>
  )
}
