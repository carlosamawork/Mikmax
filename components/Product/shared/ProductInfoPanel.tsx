'use client'
import {useState, useEffect} from 'react'
import type {PortableTextBlock} from '@portabletext/types'
import PortableText from '@/components/PageBuilder/PortableText/PortableText'
import type {ProductEditorial} from '@/types/product'
import s from './ProductInfoPanel.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  editorial: ProductEditorial
}

type TabKey = keyof ProductEditorial

const TABS: {key: TabKey; label: string}[] = [
  {key: 'descripcion', label: 'Descripción'},
  {key: 'propiedadesMaterial', label: 'Propiedades del material'},
  {key: 'recomendacionesLavado', label: 'Recomendaciones de lavado'},
  {key: 'usoRecomendado', label: 'Uso recomendado'},
]

function tabHasContent(value: ProductEditorial[TabKey]): boolean {
  if (typeof value === 'string') return value.trim().length > 0
  return Array.isArray(value) && value.length > 0
}

export default function ProductInfoPanel({open, onClose, editorial}: Props) {
  const availableTabs = TABS.filter((t) => tabHasContent(editorial[t.key]))
  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0]?.key ?? 'descripcion')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || availableTabs.length === 0) return null

  const content = editorial[activeTab]

  return (
    <>
      <div className={s.panel} role="dialog" aria-modal="true" aria-label="Product information">
        <aside className={s.sidebar}>
          {availableTabs.map((t, i) => {
            const isActive = t.key === activeTab
            return (
              <button
                key={t.key}
                type="button"
                className={[s.tab, isActive ? s.tabActive : ''].filter(Boolean).join(' ')}
                onClick={() => setActiveTab(t.key)}
              >
                {i + 1}. {t.label}
              </button>
            )
          })}
        </aside>
        <div className={s.content}>
          {typeof content === 'string' ? (
            // Shopify descriptionHtml is merchant-curated, trusted content.
            // eslint-disable-next-line react/no-danger
            <div dangerouslySetInnerHTML={{__html: content}} />
          ) : Array.isArray(content) && content.length > 0 ? (
            <PortableText value={content as PortableTextBlock[]} />
          ) : (
            <p className={s.empty}>No information available yet.</p>
          )}
        </div>
        <button type="button" className={s.close} onClick={onClose} aria-label="Close">×</button>
        <button
          type="button"
          className={s.mobileFooter}
          onClick={onClose}
          aria-label="Close information"
        >
          <span>Close Information</span>
          <span aria-hidden>×</span>
        </button>
      </div>
    </>
  )
}
