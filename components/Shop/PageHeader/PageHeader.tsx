import type {ActiveFilter, ViewMode} from '@/types/shop'
import ViewToggle from './ViewToggle'
import FilterTrigger from './FilterTrigger'
import ActiveFilterChips from './ActiveFilterChips'
import s from './PageHeader.module.scss'

interface Props {
  title: string
  count: number
  view: ViewMode
  active: ActiveFilter[]
  description?: string
}

export default function PageHeader({title, count, view, active, description}: Props) {
  return (
    <header className={s.header}>
      <div className={s.row}>
        <div className={s.titleBlock}>
          <h1 className={s.title}>{title}</h1>
          <p className={s.count}>{count} products</p>
        </div>
        <div className={s.actions}>
          <ViewToggle value={view} />
          <FilterTrigger count={active.length} />
        </div>
      </div>
      <ActiveFilterChips active={active} />
      {description && <p className={s.description}>{description}</p>}
    </header>
  )
}
