'use client'

import {useState} from 'react'
import Link from 'next/link'
import {LazyImage} from '@/components/Common'
import type {Order} from '@/types/account'
import s from './OrderCard.module.scss'

function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('es-ES', {day: 'numeric', month: 'long', year: 'numeric'}).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

// 'PAID' → 'Paid', 'PARTIALLY_REFUNDED' → 'Partially refunded'
function prettyStatus(status: string | null): string {
  if (!status) return '—'
  const lower = status.replace(/_/g, ' ').toLowerCase()
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

function Pair({label, value, className}: {label: string; value: string; className?: string}) {
  return (
    <div className={className ? `${s.pair} ${className}` : s.pair}>
      <span className={s.label}>{label}</span>
      <span className={s.value}>{value}</span>
    </div>
  )
}

export default function OrderCard({order}: {order: Order}) {
  const [open, setOpen] = useState(false)
  const date = formatDate(order.processedAt)
  const status = prettyStatus(order.financialStatus)

  return (
    <article className={s.order}>
      {/* Desktop: fila de meta */}
      <div className={s.metaRow}>
        <Pair label="Order placed" value={date} />
        <Pair label="Order no." value={order.number} />
        <Pair label="Ship to" value={order.shipTo || '—'} />
        <Pair label="Total" value={order.total} />
      </div>

      {/* Mobile: solo fecha encima de la tarjeta */}
      <div className={s.dateMobile}>
        <Pair label="Order placed" value={date} />
      </div>

      {order.lineItems.map((li, i) => (
        <div key={`${order.id}-${i}`} className={s.card}>
          <div className={s.mediaCol}>
            {li.image ? (
              <LazyImage
                src={li.image.src}
                alt={li.image.altText || li.title}
                fill
                sizes="96px"
                wrapperClassName={s.media}
                className={s.img}
              />
            ) : (
              <div className={s.media} aria-hidden="true" />
            )}
          </div>

          <div className={s.cols}>
            <Pair label="Product" value={li.title} />
            <Pair label="Order no." value={order.number} className={s.mobileOnly} />
            <div className={open ? `${s.collapse} ${s.open}` : s.collapse}>
              <Pair label="Category" value={li.category || '—'} />
              <Pair label="Payment Status" value={status} />
              <Pair label="Ship to" value={order.shipTo || '—'} className={s.mobileOnly} />
              <Pair label="Total" value={order.total} className={s.mobileOnly} />
            </div>
          </div>

          <div className={s.actions}>
            <button
              type="button"
              className={s.moreBtn}
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
            >
              {open ? 'Less information' : 'More information'}
            </button>
            <div className={s.btnStack}>
              {li.handle && (
                <Link href={`/products/${li.handle}`} className={s.btnLight}>
                  View product
                </Link>
              )}
              {order.statusUrl && (
                <a
                  href={order.statusUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.btnDark}
                >
                  View order
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </article>
  )
}
