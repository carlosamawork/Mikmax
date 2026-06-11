import type {ViewMode} from '@/types/shop'
import ViewToggle from './ViewToggle'
import FilterTrigger from './FilterTrigger'
import s from './ShopToolbar.module.scss'

interface Props {
  view: ViewMode
  // Quita el margen superior de separación, para páginas que ya tienen un
  // encabezado encima (p.ej. /search). Por defecto mantiene el espaciado del shop.
  flush?: boolean
}

export default function ShopToolbar({view, flush}: Props) {
  return (
    <div className={`${s.toolbar}${flush ? ` ${s.flush}` : ''}`}>
      <ViewToggle value={view} />
      <FilterTrigger />
    </div>
  )
}
