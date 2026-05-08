import Link from 'next/link'
import {LazyImage, LazyVideo} from '@/components/Common'
import type {HeroCampaignBlock, HeroCampaignSlide} from '@/sanity/types'
import s from './HeroCampaign.module.scss'

interface Props {
  block: HeroCampaignBlock
}

function SlideMedia({slide}: {slide: HeroCampaignSlide}) {
  if (slide.mediaType === 'video' && slide.video?.src) {
    return (
      <LazyVideo
        src={slide.video.src}
        poster={slide.video.poster?.imageUrl}
        posterAlt={slide.video.posterAlt}
        className={s.media}
        autoPlay
        muted
        loop
        playsInline
      />
    )
  }
  if (slide.image?.imageUrl) {
    const w = slide.image.metadata?.dimensions?.width ?? 1440
    const h = slide.image.metadata?.dimensions?.height ?? 1920
    return (
      <LazyImage
        src={slide.image.imageUrl}
        alt={slide.image.alt ?? ''}
        width={w}
        height={h}
        className={s.mediaImg}
        wrapperClassName={s.media}
        priority
      />
    )
  }
  return null
}

function Slide({slide}: {slide: HeroCampaignSlide}) {
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

export default function HeroCampaign({block}: Props) {
  const slides = block.slides ?? []
  if (slides.length === 0) return null
  const cols = slides.length >= 2 ? s.cols2 : ''
  return (
    <section className={`${s.hero} ${cols}`.trim()}>
      {slides.slice(0, 2).map((slide) => (
        <Slide key={slide._key} slide={slide} />
      ))}
    </section>
  )
}
