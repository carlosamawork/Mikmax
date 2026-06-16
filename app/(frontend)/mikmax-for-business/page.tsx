import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {B2bHero} from '@/components/B2B'
import PageBuilder from '@/components/PageBuilder/PageBuilder'
import {getMikmaxForBusiness} from '@/sanity/queries/queries/mikmaxForBusiness'
import {urlFor} from '@/sanity/queries'
import {B2B_ENABLED} from '@/lib/b2b/flag'
import s from './B2b.module.scss'

export const metadata: Metadata = {
  title: 'Mikmax for Business',
  description: 'Cuenta profesional Mikmax: textil de hostelería para revendedores e interioristas.',
}

// Fallback estático para el hero cuando aún no se ha cargado imagen en Sanity.
const HERO_IMAGE = '/images/b2b/hero.jpg'

export default async function B2bLandingPage() {
  if (!B2B_ENABLED) notFound()
  const data = await getMikmaxForBusiness()

  const heroImage = data?.heroImage
  const heroSrc = heroImage?.ref
    ? urlFor(heroImage.ref).width(1200).url()
    : heroImage?.imageUrl || HERO_IMAGE
  const heroAlt = heroImage?.alt || 'Mikmax for Business'

  return (
    <main className={s.page}>
      <B2bHero imageSrc={heroSrc} imageAlt={heroAlt} />

      <PageBuilder blocks={data?.pageBuilder} />
    </main>
  )
}
