import RelatedMiniCard from '../shared/RelatedMiniCard'
import type {ProductMiniCard} from '../../_types'
import s from './RelatedGrid.module.scss'

interface Props {
  products: ProductMiniCard[]
  currency: string
}

export default function RelatedGrid({products, currency}: Props) {
  if (products.length === 0) return null
  return (
    <section className={s.section}>
      <h3 className={s.heading}>Related Products</h3>
      <div className={s.grid}>
        {products.map((p) => (
          <RelatedMiniCard key={p.handle} product={p} currency={currency} />
        ))}
      </div>
    </section>
  )
}
