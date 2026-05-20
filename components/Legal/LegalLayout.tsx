import PortableText from '@/components/PageBuilder/PortableText/PortableText'
import type {LegalPageData} from '@/sanity/types'
import LegalSidebar from './LegalSidebar'
import s from './LegalLayout.module.scss'

interface Props {
  data: LegalPageData
  activeSlug: string
}

export default function LegalLayout({data, activeSlug}: Props) {
  const activeSection = data.sections.find((sec) => sec.slug === activeSlug)
  const sidebarItems = data.sections.map((sec) => ({title: sec.title, slug: sec.slug}))

  return (
    <section className={s.wrapper}>
      <h1 className={s.title}>{data.title}</h1>
      <aside className={s.sidebar}>
        <LegalSidebar sections={sidebarItems} />
      </aside>
      <div className={s.content}>
        {activeSection?.body && activeSection.body.length > 0 ? (
          <PortableText value={activeSection.body} />
        ) : (
          <p className={s.empty}>No content yet.</p>
        )}
      </div>
    </section>
  )
}
