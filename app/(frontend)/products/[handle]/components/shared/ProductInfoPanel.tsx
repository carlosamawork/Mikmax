'use client'
import {useState, useEffect} from 'react'
import {PortableText} from '@portabletext/react'
import type {ProductEditorial} from '../../_types'
import s from './ProductInfoPanel.module.scss'

interface Props {
  open: boolean
  onClose: () => void
  editorial: ProductEditorial
}

type TabKey = keyof ProductEditorial

const TABS: {key: TabKey; label: string; num: number}[] = [
  {key: 'descripcion', label: 'Descripción', num: 1},
  {key: 'propiedadesMaterial', label: 'Propiedades del material', num: 2},
  {key: 'recomendacionesLavado', label: 'Recomendaciones de lavado', num: 3},
  {key: 'usoRecomendado', label: 'Uso recomendado', num: 4},
]

export default function ProductInfoPanel({open, onClose, editorial}: Props) {
  const availableTabs = TABS.filter(
    (t) => Array.isArray(editorial[t.key]) && (editorial[t.key] as unknown[]).length > 0,
  )
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

  const content = editorial[activeTab] as unknown[] | null

  return (
    <>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div className={s.panel} role="dialog" aria-modal="true" aria-label="Product information">
        <aside className={s.sidebar}>
          {TABS.map((t) => {
            const isAvailable = availableTabs.some((a) => a.key === t.key)
            const isActive = t.key === activeTab
            return (
              <button
                key={t.key}
                type="button"
                disabled={!isAvailable}
                className={[s.tab, isActive ? s.tabActive : ''].filter(Boolean).join(' ')}
                onClick={() => setActiveTab(t.key)}
              >
                {t.num}. {t.label}
              </button>
            )
          })}
        </aside>
        <div className={s.content}>
          <button type="button" className={s.close} onClick={onClose} aria-label="Close">×</button>
          {content && <PortableText value={content as never} />}
        </div>
      </div>
    </>
  )
}
