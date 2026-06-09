export type AnalyticsItem = {
  id: string // variant GID o product handle/id
  name: string
  price: number
  quantity: number
  variant?: string // etiqueta talla/color
  currency: string
}
