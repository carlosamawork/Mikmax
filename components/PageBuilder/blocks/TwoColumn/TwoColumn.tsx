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

  // Solo permitimos rutas internas (/…, no //…) o http(s) absolutas. Cualquier
  // otro esquema (javascript:, data:, …) se descarta y la celda no enlaza.
  const url = cell.url
  const isInternal = !!url && url.startsWith('/') && !url.startsWith('//')
  const isExternal = !!url && /^https?:\/\//i.test(url)

  if (isInternal) {
    return (
      <div className={`${s.cell} ${s.media}`}>
        <Link href={url} className={s.link}>
          {inner}
        </Link>
      </div>
    )
  }
  if (isExternal) {
    return (
      <div className={`${s.cell} ${s.media}`}>
        <a href={url} target="_blank" rel="noopener noreferrer" className={s.link}>
          {inner}
        </a>
      </div>
    )
  }
  return <div className={`${s.cell} ${s.media}`}>{inner}</div>
}

export default function TwoColumn({block}: Props) {
  return (
    <section className={s.row}>
      <Cell cell={block.left} />
      <Cell cell={block.right} />
    </section>
  )
}
