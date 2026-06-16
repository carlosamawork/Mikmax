import {LazyImage} from '@/components/Common'
import B2bLogin from '@/components/B2B/B2bLogin/B2bLogin'
import s from '@/app/(frontend)/b2b/B2b.module.scss'

export default function B2bHero({imageSrc, imageAlt}: {imageSrc: string; imageAlt: string}) {
  return (
    <section className={s.hero}>
      <div className={s.heroLogin}>
        <B2bLogin />
      </div>
      <div className={s.heroImage}>
        <LazyImage src={imageSrc} alt={imageAlt} fill sizes="(min-width: 768px) 50vw, 100vw" />
      </div>
    </section>
  )
}
