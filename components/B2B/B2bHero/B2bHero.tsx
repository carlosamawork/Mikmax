import {LazyImage} from '@/components/Common'
import B2bLogin from '@/components/B2B/B2bLogin/B2bLogin'
import s from './B2bHero.module.scss'

export default function B2bHero({imageSrc, imageAlt}: {imageSrc?: string; imageAlt?: string}) {
  return (
    <section className={s.hero}>
      <div className={s.headingBlock}>
        <h1 className={s.heading}>Create a business account</h1>
      </div>
      <div className={s.row}>
        <div className={s.formBlock}>
          <B2bLogin />
        </div>
        {imageSrc && (
          <div className={s.imageCol}>
            <LazyImage
              src={imageSrc}
              alt={imageAlt || 'Mikmax for Business'}
              fill
              sizes="(max-width:768px) 100vw, 50vw"
              wrapperClassName={s.imageWrap}
              className={s.image}
            />
          </div>
        )}
      </div>
    </section>
  )
}
