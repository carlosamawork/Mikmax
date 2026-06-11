'use client'

import {useWishlist} from '@/context/wishlistContext'
import ProductCard from '@/components/PageBuilder/ProductCard/ProductCard'
import type {ProductCardData} from '@/sanity/types'
import s from './Wishlist.module.scss'

type WishlistGridItem = {id: string; card: ProductCardData}

// Grid reactiva: la página es Server Component y no se re-renderiza al quitar un
// favorito. Aquí, una vez cargada la wishlist en cliente, ocultamos cualquier ítem
// que ya no esté guardado (el que el usuario acaba de quitar con el icono) sin recargar.
// `id` se construye igual que en el contexto: `handle::color` (o `handle` sin color).
export default function WishlistGrid({items}: {items: WishlistGridItem[]}) {
  const {ready, has} = useWishlist()

  // Antes de que la wishlist cargue en cliente, mostramos el snapshot del servidor.
  const visible = items.filter((it) => (ready ? has(it.id) : true))

  if (ready && visible.length === 0) {
    return <p className={s.empty}>Your wishlist is empty.</p>
  }

  return (
    <div className={s.grid}>
      {visible.map((it, i) => (
        <ProductCard key={`${it.id}-${i}`} product={it.card} />
      ))}
    </div>
  )
}
