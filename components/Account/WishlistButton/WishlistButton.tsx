'use client'

import {useRouter} from 'next/navigation'
import {useWishlistEntry} from '@/context/wishlistContext'
import s from './WishlistButton.module.scss'

// Icono de marcador (bookmark) del diseño — esquina inferior derecha de la tarjeta.
function BookmarkIcon() {
  return (
    <svg viewBox="0 0 25 25" width="100%" height="100%" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M9.01854 8H15.9994C15.9811 10.9491 15.9558 16.7972 15.9972 16.9949C15.9999 16.9983 16.0007 17 15.9994 17C15.9986 17 15.9979 16.9983 15.9972 16.9949C15.9066 16.883 13.6655 14.9725 12.5229 14.003L9 16.9192L9.01854 8Z"
        fill="currentColor"
      />
    </svg>
  )
}

type Props = {
  // Entrada de wishlist explícita (sets/looks: `set:<slug>` / `look:<slug>`).
  entryId?: string
  // Producto: se compone `handle` (+ `color`) si no se pasa `entryId`.
  handle?: string
  color?: string | null
  className?: string
}

export default function WishlistButton({entryId, handle, color, className}: Props) {
  const id = entryId ?? (color ? `${handle}::${color}` : (handle ?? ''))
  const {active, hint, onClick} = useWishlistEntry(id)
  const router = useRouter()

  return (
    <span className={className ? `${s.wrap} ${className}` : s.wrap}>
      <button
        type="button"
        className={active ? `${s.btn} ${s.active}` : s.btn}
        onClick={onClick}
        aria-pressed={active}
        aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <BookmarkIcon />
      </button>
      {hint && (
        <span className={s.hint} role="alert">
          <button
            type="button"
            className={s.hintLink}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              router.push('/login')
            }}
          >
            Log in
          </button>{' '}
          to save it
        </span>
      )}
    </span>
  )
}
