import Link from 'next/link'
import type {CSSProperties} from 'react'
import type {ViewMode} from '@/types/shop'
import type {LookArchiveItem} from '@/types/look'
import LookCard from '@/components/Looks/LookCard/LookCard'
import s from './LookGrid.module.scss'

interface Props {
  looks: LookArchiveItem[]
  view: ViewMode
  hasActiveFilters?: boolean
}

export default function LookGrid({looks, view, hasActiveFilters}: Props) {
  if (looks.length === 0) {
    return (
      <div className={s.empty}>
        {hasActiveFilters ? (
          <>
            <p>No looks match your filters.</p>
            <Link href="/looks">Clear filters</Link>
          </>
        ) : (
          <p>No looks yet.</p>
        )}
      </div>
    )
  }

  return (
    <div
      className={s.grid}
      style={{['--cols' as string]: view === '2col' ? 2 : 4} as CSSProperties}
    >
      {looks.map((look) => (
        <LookCard key={look.id} look={look} />
      ))}
    </div>
  )
}
