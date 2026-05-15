import type {ViewMode} from '@/types/shop'
import ViewToggle from './ViewToggle'
import FilterTrigger from './FilterTrigger'
import s from './ShopToolbar.module.scss'

interface Props {
  view: ViewMode
}

export default function ShopToolbar({view}: Props) {
  return (
    <div className={s.toolbar}>
      <ViewToggle value={view} />
      <FilterTrigger />
    </div>
  )
}
