'use client'

import {useWishlist} from '@/context/wishlistContext'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import LookCard from '@/components/Looks/LookCard/LookCard'
import type {ProductCardData} from '@/sanity/types'
import type {LookArchiveItem} from '@/types/look'
import s from './Wishlist.module.scss'

type ProductItem = {id: string; card: ProductCardData}
type LookItem = {id: string; item: LookArchiveItem}

type Props = {
  products: ProductItem[]
  looks: LookItem[]
}

// Grid reactiva: la página es Server Component y no se re-renderiza al quitar un
// favorito. Aquí, una vez cargada la wishlist en cliente, ocultamos cualquier ítem
// que ya no esté guardado (el que el usuario acaba de quitar con el icono) sin recargar.
// `id`: `handle::color` para producto, `look:<slug>` para look.
export default function WishlistGrid({products, looks}: Props) {
  const {ready, has} = useWishlist()

  // Antes de que la wishlist cargue en cliente, mostramos el snapshot del servidor.
  const isVisible = (id: string) => (ready ? has(id) : true)

  const visibleProducts = products.filter((it) => isVisible(it.id))
  const visibleLooks = looks.filter((it) => isVisible(it.id))

  if (ready && visibleProducts.length === 0 && visibleLooks.length === 0) {
    return <p className={s.empty}>Your wishlist is empty.</p>
  }

  return (
    <div className={s.sections}>
      {visibleProducts.length > 0 && (
        <section className={s.section}>
          <h2 className={s.heading}>Products</h2>
          <div className={s.grid}>
            {visibleProducts.map((it, i) => (
              <ProductCard key={`${it.id}-${i}`} product={it.card} />
            ))}
          </div>
        </section>
      )}

      {visibleLooks.length > 0 && (
        <section className={s.section}>
          <h2 className={s.heading}>Looks</h2>
          <div className={s.grid}>
            {visibleLooks.map((it, i) => (
              <LookCard key={`${it.id}-${i}`} look={it.item} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
