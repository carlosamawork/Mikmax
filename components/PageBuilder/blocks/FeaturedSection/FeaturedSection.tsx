// components/PageBuilder/blocks/FeaturedSection/FeaturedSection.tsx
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import type {FeaturedSectionBlock, FeaturedSectionSlide} from '@/sanity/types'
import s from './FeaturedSection.module.scss'

interface Props {
  block: FeaturedSectionBlock
}

function SlideMedia({slide}: {slide: FeaturedSectionSlide}) {
  if (!slide.image?.imageUrl) return null
  const w = slide.image.metadata?.dimensions?.width ?? 1440
  const h = slide.image.metadata?.dimensions?.height ?? 900
  return (
    <LazyImage
      src={slide.image.imageUrl}
      alt={slide.image.alt ?? ''}
      width={w}
      height={h}
      className={s.mediaImg}
      wrapperClassName={s.media}
    />
  )
}

function Slide({slide}: {slide: FeaturedSectionSlide}) {
  const inner = (
    <>
      <SlideMedia slide={slide} />
      {slide.title && <p className={s.title}>{slide.title}</p>}
    </>
  )

  if (!slide.url) {
    return <div className={s.slide}>{inner}</div>
  }
  if (slide.url.startsWith('/')) {
    return (
      <Link href={slide.url} className={s.slide}>
        {inner}
      </Link>
    )
  }
  return (
    <a href={slide.url} className={s.slide} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  )
}

export default function FeaturedSection({block}: Props) {
  const slides = block.slides ?? []
  if (slides.length === 0) return null
  const cols = slides.length >= 2 ? s.cols2 : ''
  return (
    <section className={`${s.section} ${cols}`.trim()}>
      {slides.slice(0, 2).map((slide) => (
        <Slide key={slide._key} slide={slide} />
      ))}
    </section>
  )
}
