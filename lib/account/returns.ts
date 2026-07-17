const RETURN_WINDOW_DAYS = 30
const BLOCKING_RETURN_STATUSES = new Set(['RETURN_REQUESTED', 'IN_PROGRESS'])

export const RETURN_REASONS = [
  {value: 'SIZE_TOO_SMALL', label: 'Too small'},
  {value: 'SIZE_TOO_LARGE', label: 'Too large'},
  {value: 'UNWANTED', label: 'No longer wanted'},
  {value: 'NOT_AS_DESCRIBED', label: 'Not as described'},
  {value: 'WRONG_ITEM', label: 'Wrong item received'},
  {value: 'DEFECTIVE', label: 'Damaged or defective'},
  {value: 'COLOR', label: 'Color not as expected'},
  {value: 'STYLE', label: 'Style not as expected'},
  {value: 'OTHER', label: 'Other'},
] as const

export function isReturnEligible(
  o: {processedAt: string; financialStatus: string | null; returnStatus?: string | null},
  now: Date = new Date(),
): boolean {
  if (o.financialStatus !== 'PAID') return false
  if (o.returnStatus && BLOCKING_RETURN_STATUSES.has(o.returnStatus)) return false
  const processed = Date.parse(o.processedAt)
  if (Number.isNaN(processed)) return false
  const ageDays = (now.getTime() - processed) / 86_400_000
  return ageDays <= RETURN_WINDOW_DAYS
}

// El id Storefront llega como gid://shopify/Order/123?key=... — el Admin usa el GID sin query.
export function adminOrderGid(storefrontId: string): string | null {
  const m = storefrontId.match(/^gid:\/\/shopify\/Order\/(\d+)/)
  return m ? `gid://shopify/Order/${m[1]}` : null
}

export interface ReturnSelection {
  fulfillmentLineItemId: string
  quantity: number
  returnReason: string
}

const VALID_REASONS = new Set(RETURN_REASONS.map((r) => r.value as string))

export function validateSelections(
  selections: unknown,
  available: {fulfillmentLineItemId: string; maxQuantity: number}[],
): ReturnSelection[] | null {
  if (!Array.isArray(selections) || selections.length === 0) return null
  const maxById = new Map(available.map((a) => [a.fulfillmentLineItemId, a.maxQuantity]))
  const out: ReturnSelection[] = []
  for (const sel of selections) {
    const s = sel as Partial<ReturnSelection>
    if (typeof s?.fulfillmentLineItemId !== 'string') return null
    const max = maxById.get(s.fulfillmentLineItemId)
    if (max === undefined) return null
    if (typeof s.quantity !== 'number' || !Number.isInteger(s.quantity)) return null
    if (s.quantity < 1 || s.quantity > max) return null
    if (typeof s.returnReason !== 'string' || !VALID_REASONS.has(s.returnReason)) return null
    out.push({fulfillmentLineItemId: s.fulfillmentLineItemId, quantity: s.quantity, returnReason: s.returnReason})
  }
  return out
}
