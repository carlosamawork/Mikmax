// components/PageBuilder/blocks/SetModule/SetModule.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import type {SetModuleBlock} from '@/sanity/types'
import s from './SetModule.module.scss'

interface Props {
  block: SetModuleBlock
}

export default function SetModule({block}: Props) {
  const {title, subtitle, product, images = []} = block
  if (!product && images.length === 0) return null

  const href = product?.handle ? `/products/${product.handle}` : null

  const content = (
    <>
      {images.length > 0 && (
        <div className={s.gallery}>
          {images.map((img, i) =>
            img.imageUrl ? (
              <LazyImage
                key={img.ref ?? i}
                src={img.imageUrl}
                alt={img.alt ?? ''}
                width={img.metadata?.dimensions?.width ?? 800}
                height={img.metadata?.dimensions?.height ?? 1000}
                className={s.img}
                wrapperClassName={s.imgWrap}
              />
            ) : null,
          )}
        </div>
      )}
      {(title || subtitle) && (
        <div className={s.text}>
          {title && <h2 className={s.title}>{title}</h2>}
          {subtitle && <p className={s.subtitle}>{subtitle}</p>}
        </div>
      )}
    </>
  )

  return (
    <section className={s.section}>
      {href ? (
        <Link href={href} className={s.link}>
          {content}
        </Link>
      ) : (
        <div className={s.link}>{content}</div>
      )}
    </section>
  )
}
