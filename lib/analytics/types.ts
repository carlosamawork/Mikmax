export type AnalyticsItem = {
  id: string // item_id final (ver formatItemId en item.ts) — debe casar con feeds/checkout
  name: string
  price: number
  quantity: number
  variant?: string // etiqueta talla/color
  currency: string
}
