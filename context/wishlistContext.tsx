'use client'

import {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react'
import type {ReactNode} from 'react'

type ToggleResult = 'added' | 'removed' | 'unauthenticated'

type WishlistCtx = {
  ready: boolean
  loggedIn: boolean
  has: (handle: string) => boolean
  toggle: (handle: string) => Promise<ToggleResult>
}

const Ctx = createContext<WishlistCtx | null>(null)

// Carga la wishlist una vez en cliente (vía /api/wishlist) para no romper el render
// estático del PDP / tarjetas. Toggle con UI optimista.
export default function WishlistProvider({children}: {children: ReactNode}) {
  const [handles, setHandles] = useState<Set<string>>(new Set())
  const [loggedIn, setLoggedIn] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let active = true
    fetch('/api/wishlist/')
      .then((r) => r.json())
      .then((d) => {
        if (!active) return
        setLoggedIn(Boolean(d?.loggedIn))
        setHandles(new Set(Array.isArray(d?.handles) ? d.handles : []))
        setReady(true)
      })
      .catch(() => {
        if (active) setReady(true)
      })
    return () => {
      active = false
    }
  }, [])

  const has = useCallback((handle: string) => handles.has(handle), [handles])

  const toggle = useCallback(
    async (handle: string): Promise<ToggleResult> => {
      if (!loggedIn) return 'unauthenticated'
      const wasIn = handles.has(handle)
      // Optimista
      setHandles((prev) => {
        const next = new Set(prev)
        if (wasIn) next.delete(handle)
        else next.add(handle)
        return next
      })
      try {
        const r = await fetch('/api/wishlist/', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({handle}),
        })
        const d = await r.json().catch(() => null)
        if (!r.ok) throw new Error('failed')
        if (Array.isArray(d?.handles)) setHandles(new Set(d.handles))
      } catch {
        // Revertir si falla
        setHandles((prev) => {
          const next = new Set(prev)
          if (wasIn) next.add(handle)
          else next.delete(handle)
          return next
        })
      }
      return wasIn ? 'removed' : 'added'
    },
    [handles, loggedIn],
  )

  const value = useMemo<WishlistCtx>(
    () => ({ready, loggedIn, has, toggle}),
    [ready, loggedIn, has, toggle],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useWishlist(): WishlistCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}

// Hook genérico por entrada de wishlist. La identidad (`id`) es el string guardado
// en el metafield. Esquema de ids:
//   - producto:  `handle` o `handle::color`
//   - set:       `set:<slug>`
//   - lookbook:  `look:<slug>`
// Devuelve estado + handler de click + flag de "hay que loguearse".
export function useWishlistEntry(id: string) {
  const {has, toggle} = useWishlist()
  const [hint, setHint] = useState(false)
  const active = has(id)

  const onClick = useCallback(
    async (e?: {preventDefault?: () => void; stopPropagation?: () => void}) => {
      e?.preventDefault?.()
      e?.stopPropagation?.()
      const res = await toggle(id)
      if (res === 'unauthenticated') {
        setHint(true)
        window.setTimeout(() => setHint(false), 4000)
      }
    },
    [id, toggle],
  )

  return {active, hint, onClick}
}

// Hook por producto: identidad = handle + color (guarda el producto en el color elegido).
export function useWishlistItem(handle: string, color?: string | null) {
  const id = color ? `${handle}::${color}` : handle
  return useWishlistEntry(id)
}
