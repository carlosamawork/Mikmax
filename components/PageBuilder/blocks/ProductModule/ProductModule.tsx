import ProductCard from '../../ProductCard/ProductCard'
import type {ProductModuleBlock} from '@/sanity/types'
import s from './ProductModule.module.scss'

interface Props {
  block: ProductModuleBlock
}

export default function ProductModule({block}: Props) {
  const products = block.products ?? []
  if (products.length === 0) return null

  return (
    <section className={s.section}>
      {block.title && <h2 className={s.title}>{block.title}</h2>}
      <div className={s.grid}>
        {products.map((product) => (
          <ProductCard key={product._id} product={product} />
        ))}
      </div>
    </section>
  )
}
