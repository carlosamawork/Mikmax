// Forma unica del descuento B2B — espejo del parseo de la Function
// (mikmax-b2b-app/extensions/b2b-discount/src/pricing.ts). Modulo puro, sin IO.

export interface Tier {
  minSubtotal: number
  percent: number
}

export type DiscountSpec = {type: 'fixed'; percent: number} | {type: 'tiers'; tiers: Tier[]}

function parseTiers(raw: unknown): Tier[] | null {
  if (!Array.isArray(raw)) return null
  const tiers: Tier[] = []
  for (const t of raw) {
    if (typeof t?.minSubtotal !== 'number' || typeof t?.percent !== 'number') return null
    tiers.push({minSubtotal: t.minSubtotal, percent: t.percent})
  }
  return tiers
}

// Acepta formato nuevo y legacy ({resellerPercent, designerTiers} -> tiers).
export function parseDiscountSpec(json: string | null | undefined): DiscountSpec | null {
  if (!json) return null
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (o.type === 'fixed') {
    return typeof o.percent === 'number' ? {type: 'fixed', percent: o.percent} : null
  }
  if (o.type === 'tiers') {
    const tiers = parseTiers(o.tiers)
    return tiers ? {type: 'tiers', tiers} : null
  }
  if (typeof o.resellerPercent === 'number') {
    const tiers = parseTiers(o.designerTiers)
    return tiers ? {type: 'tiers', tiers} : null
  }
  return null
}

// Highest minSubtotal that is <= subtotal.
export function tierPercent(tiers: Tier[], subtotal: number): number {
  let best = 0
  let bestMin = -1
  for (const t of tiers) {
    if (subtotal >= t.minSubtotal && t.minSubtotal > bestMin) {
      best = t.percent
      bestMin = t.minSubtotal
    }
  }
  return best
}

// % que se pinta en PDP/listados: solo los descuentos fijos tienen precio visible
// fuera del carrito (los tramos dependen del subtotal, indefinido sin carrito).
export function displayPercent(spec: DiscountSpec | null): number {
  if (spec?.type !== 'fixed') return 0
  return Math.max(0, Math.min(spec.percent, 100))
}
