'use client'

import {useEffect, useRef, useState} from 'react'
import {useRouter} from 'next/navigation'
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import {predictiveSearch} from '@/app/(frontend)/search/actions'
import type {PredictiveResult} from '@/app/(frontend)/search/actions'
import type {Dictionary} from '@/lib/i18n/getDictionary'
import {formatMoney} from '@/lib/money'
import {getStoreCurrency} from '@/lib/analytics/item'
import s from './SearchOverlay.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  copy: Dictionary['search']
}

const EMPTY: PredictiveResult = {cards: [], total: 0}

// Client component: locale flag is OFF in production so 'en' is correct today.
// currencyCode comes from getStoreCurrency() (env-based); locale-threading deferred.
function formatPrice(min?: number): string {
  if (typeof min !== 'number') return ''
  return formatMoney({amount: min, currencyCode: getStoreCurrency()}, 'en')
}

export default function SearchOverlay({open, onClose, copy}: Props) {
  const router = useRouter()
  const [value, setValue] = useState('')
  const [result, setResult] = useState<PredictiveResult>(EMPTY)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lastFetch = useRef(0)

  // Reset + focus only when the open state itself changes.
  useEffect(() => {
    if (!open) return
    setValue('')
    setResult(EMPTY)
    inputRef.current?.focus()
  }, [open])

  // Scroll-lock + ESC; depends on onClose but does no reset work.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = original
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const q = value.trim()
    if (!q) {
      setResult(EMPTY)
      return
    }
    const id = ++lastFetch.current
    setLoading(true)
    const t = setTimeout(() => {
      predictiveSearch(q)
        .then((r) => {
          if (id === lastFetch.current) {
            setResult(r)
            setLoading(false)
          }
        })
        .catch(() => {
          if (id === lastFetch.current) {
            setResult(EMPTY)
            setLoading(false)
          }
        })
    }, 250)
    return () => clearTimeout(t)
  }, [value, open])

  function goToResults() {
    const q = value.trim()
    if (!q) return
    onClose()
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    goToResults()
  }

  if (!open) return null

  const q = value.trim()
  const showNoResults = q.length > 0 && !loading && result.total === 0

  return (
    <div className={s.overlay}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        className={s.panel}
        role="dialog"
        aria-modal="true"
        aria-label={copy.dialogAriaLabel}
      >
        <div className={s.bar}>
          <form className={s.form} onSubmit={onSubmit}>
            <input
              ref={inputRef}
              type="search"
              className={s.input}
              placeholder={copy.placeholder}
              aria-label={copy.inputAriaLabel}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </form>
          <button type="button" className={s.close} onClick={onClose} aria-label={copy.closeLabel}>
            ×
          </button>
        </div>

        {result.cards.length > 0 && (
          <div className={s.results}>
            {result.cards.map((p) => (
              <Link
                key={p.id}
                href={
                  p.colorSlug ? `/products/${p.handle}?color=${p.colorSlug}` : `/products/${p.handle}`
                }
                className={s.item}
                onClick={onClose}
              >
                {p.imageUrl && (
                  <LazyImage
                    src={p.imageUrl}
                    alt={p.imageAlt ?? p.title}
                    width={48}
                    height={60}
                    className={s.thumb}
                  />
                )}
                <span className={s.info}>
                  <span className={s.itemTitle}>{p.title}</span>
                  <span className={s.itemPrice}>{formatPrice(p.minPrice)}</span>
                </span>
              </Link>
            ))}
            <button type="button" className={s.viewAll} onClick={goToResults}>
              {copy.viewAll.replace('{total}', String(result.total))}
            </button>
          </div>
        )}

        {loading && q.length > 0 && result.cards.length === 0 && (
          <p className={s.message}>{copy.searching}</p>
        )}

        {showNoResults && (
          <p className={s.message}>{copy.noResults.replace('{query}', q)}</p>
        )}
      </div>
    </div>
  )
}
