import {LazyImage} from '@/components/Common'
import type {DownloadButtonBlock} from '@/sanity/types'
import s from './DownloadButton.module.scss'

interface Props {
  block: DownloadButtonBlock
}

export default function DownloadButton({block}: Props) {
  if (!block.fileUrl) return null
  const img = block.image
  const hasImage = Boolean(img?.imageUrl)
  const w = img?.metadata?.dimensions?.width ?? 1440
  const h = img?.metadata?.dimensions?.height ?? 900

  return (
    <section className={`${s.section} ${hasImage ? s.withImage : ''}`.trim()}>
      {hasImage && (
        <LazyImage
          src={img!.imageUrl}
          alt={img!.alt ?? ''}
          width={w}
          height={h}
          className={s.image}
          wrapperClassName={s.imageWrap}
        />
      )}
      <a className={s.button} href={block.fileUrl} download>
        {block.title}
      </a>
      {block.description && <p className={s.description}>{block.description}</p>}
    </section>
  )
}
