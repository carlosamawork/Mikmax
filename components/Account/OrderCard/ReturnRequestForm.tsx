'use client'

import {FormEvent, useEffect, useState} from 'react'
import {getReturnableItemsAction, requestOrderReturn} from '@/app/(frontend)/account/actions'
import {RETURN_REASONS} from '@/lib/account/returns'
import s from './OrderCard.module.scss'

type ReturnableItem = {fulfillmentLineItemId: string; title: string; maxQuantity: number}

type LineSelection = {checked: boolean; quantity: number; returnReason: string}

export default function ReturnRequestForm({
  orderId,
  onDone,
  onCancel,
}: {
  orderId: string
  onDone: () => void
  onCancel?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<ReturnableItem[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selections, setSelections] = useState<Record<string, LineSelection>>({})
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    getReturnableItemsAction(orderId).then((res) => {
      if (!active) return
      if (res.error || !res.items || res.items.length === 0) {
        setLoadError(res.error ?? 'empty')
        setItems([])
      } else {
        setItems(res.items)
        setSelections(
          Object.fromEntries(
            res.items.map((item) => [
              item.fulfillmentLineItemId,
              {checked: false, quantity: 1, returnReason: ''},
            ]),
          ),
        )
      }
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [orderId])

  function toggleItem(id: string, checked: boolean) {
    setSelections((prev) => ({...prev, [id]: {...prev[id], checked}}))
  }

  function setQuantity(id: string, quantity: number) {
    setSelections((prev) => ({...prev, [id]: {...prev[id], quantity}}))
  }

  function setReason(id: string, returnReason: string) {
    setSelections((prev) => ({...prev, [id]: {...prev[id], returnReason}}))
  }

  const selectedEntries = Object.entries(selections).filter(([, sel]) => sel.checked)
  const canSubmit =
    !submitting &&
    selectedEntries.length > 0 &&
    selectedEntries.every(([, sel]) => sel.returnReason)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    const payload = selectedEntries.map(([fulfillmentLineItemId, sel]) => ({
      fulfillmentLineItemId,
      quantity: sel.quantity,
      returnReason: sel.returnReason,
    }))
    const res = await requestOrderReturn(orderId, payload, note)
    setSubmitting(false)
    if (res.error) {
      setSubmitError(res.error)
      return
    }
    setDone(true)
    onDone()
  }

  if (done) {
    return (
      <p className={s.returnSuccess}>
        Return requested — we&apos;ll email you once it&apos;s reviewed.
      </p>
    )
  }

  if (loading) {
    return <p className={s.returnStatusMsg}>Loading…</p>
  }

  if (loadError || items.length === 0) {
    return <p className={s.returnStatusMsg}>No items available for return.</p>
  }

  return (
    <form className={s.returnForm} onSubmit={onSubmit} noValidate>
      {items.map((item) => {
        const sel = selections[item.fulfillmentLineItemId]
        return (
          <div key={item.fulfillmentLineItemId} className={s.returnLine}>
            <label className={s.returnLineCheck}>
              <input
                type="checkbox"
                checked={sel?.checked ?? false}
                onChange={(e) => toggleItem(item.fulfillmentLineItemId, e.target.checked)}
              />
              <span>{item.title}</span>
            </label>

            <select
              className={s.returnSelect}
              value={sel?.quantity ?? 1}
              disabled={!sel?.checked}
              onChange={(e) => setQuantity(item.fulfillmentLineItemId, Number(e.target.value))}
              aria-label="Quantity"
            >
              {Array.from({length: item.maxQuantity}, (_, i) => i + 1).map((qty) => (
                <option key={qty} value={qty}>
                  {qty}
                </option>
              ))}
            </select>

            <select
              className={s.returnSelect}
              value={sel?.returnReason ?? ''}
              disabled={!sel?.checked}
              onChange={(e) => setReason(item.fulfillmentLineItemId, e.target.value)}
              aria-label="Return reason"
            >
              <option value="">Select a reason</option>
              {RETURN_REASONS.map((reason) => (
                <option key={reason.value} value={reason.value}>
                  {reason.label}
                </option>
              ))}
            </select>
          </div>
        )
      })}

      <textarea
        className={s.returnNote}
        placeholder="Additional details (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      {submitError && (
        <p className={s.error} role="alert">
          {submitError}
        </p>
      )}

      <div className={s.returnFormActions}>
        {onCancel && (
          <button type="button" className={s.returnCancelBtn} onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className={s.returnSubmitBtn} disabled={!canSubmit}>
          Submit request
        </button>
      </div>
    </form>
  )
}
