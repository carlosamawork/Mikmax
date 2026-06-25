import Link from 'next/link'
import type {CSSProperties} from 'react'
import {LazyImage} from '@/components/Common'
import JsonLd from '@/components/Common/JsonLd/JsonLd'
import {buildUrl} from '@/utils/seoHelper'
import type {EditorialImage} from '@/types/shop'
import s from './EditorialCard.module.scss'

const absUrl = (url: string) => (/^https?:\/\//.test(url) ? url : buildUrl(url))

interface Props {
  image: EditorialImage
  className?: string
  // Llena el alto de su celda (tile destacada 2×2 del grid editorial).
  fill?: boolean
  style?: CSSProperties
}

// Imagen editorial a sangre intercalada en el grid de productos (Vista 2).
// Ocupa la tile destacada 2×2; opcionalmente enlaza a una ruta y muestra un caption.
export default function EditorialCard({image, className, fill = false, style}: Props) {
  const caption = image.caption?.trim() || image.alt?.trim()
  const media = (
    <div className={`${s.media} ${fill ? s.mediaFill : ''}`.trim()}>
      {image.imageUrl && caption && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'ImageObject',
            contentUrl: absUrl(image.imageUrl),
            url: absUrl(image.imageUrl),
            caption,
            ...(image.width ? {width: image.width} : {}),
            ...(image.height ? {height: image.height} : {}),
          }}
        />
      )}
      <LazyImage
        src={image.imageUrl}
        alt={image.alt ?? ''}
        width={image.width ?? 716}
        height={image.height ?? 953}
        blurDataURL={image.blurDataURL}
        sizes="(max-width: 768px) 100vw, 50vw"
        className={s.img}
      />
      {image.caption && <p className={s.caption}>{image.caption}</p>}
    </div>
  )

  const cls = `${s.card} ${fill ? s.cardFill : ''} ${className ?? ''}`.trim()

  return image.href ? (
    <Link href={image.href} className={cls} style={style}>
      {media}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {media}
    </div>
  )
}
