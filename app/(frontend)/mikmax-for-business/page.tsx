import type {Metadata} from 'next'
import {LazyImage} from '@/components/Common'
import NewsletterForm from '@/components/Layout/Footer/NewsletterForm'
import {B2bHero} from '@/components/B2B'
import s from './B2b.module.scss'

export const metadata: Metadata = {
  title: 'Mikmax for Business',
  description: 'Cuenta profesional Mikmax: textil de hostelería para revendedores e interioristas.',
}

// Imágenes y textos de la landing: estáticos en Fase 1 (candidatos a Sanity en Fase 3).
const HERO_IMAGE = '/images/b2b/hero.jpg'
const CONSULTANCY_IMAGE = '/images/b2b/consultancy.jpg'

export default function B2bLandingPage() {
  return (
    <main className={s.page}>
      <B2bHero imageSrc={HERO_IMAGE} imageAlt="Mikmax for Business" />

      <section className={s.consultancy}>
        <div className={s.consultancyImage}>
          <LazyImage
            src={CONSULTANCY_IMAGE}
            alt="Hospitality textile consultancy"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </div>
        <div className={s.consultancyText}>
          <p>
            We provide consultancy on care and maintenance for hospitality textiles. This includes
            selecting the right laundry processes, detergents and drying methods to preserve fiber
            integrity and extend product lifespan.
          </p>
        </div>
      </section>

      <section className={s.catalog}>
        <a className={s.catalogCta} href="/catalogs/mikmax-business.pdf" download>
          Download catalog
        </a>
      </section>

      <section className={s.newsletter}>
        <NewsletterForm />
      </section>
    </main>
  )
}
