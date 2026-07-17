// Tipos de la capa de cuenta B2C (frontend).

export type RegisterInput = {
  email: string
  password: string
}

export type AuthResult = {ok: true} | {ok: false; error: string}

export type CustomerAddress = {
  id?: string
  address1?: string | null
  address2?: string | null
  city?: string | null
  zip?: string | null
  country?: string | null
  province?: string | null
  phone?: string | null
}

// Forma cruda de la conexión de pedidos que devuelve la Storefront API.
export type RawOrderLineItemNode = {
  title: string
  quantity: number
  variant?: {
    image?: {src: string; altText?: string | null} | null
    product?: {
      handle?: string | null
      productType?: string | null
      collections?: {edges: {node: {handle?: string | null; title?: string | null}}[]} | null
    } | null
  } | null
}

export type RawOrderNode = {
  id: string
  name?: string | null
  orderNumber?: number | null
  financialStatus?: string | null
  totalPrice?: {amount: string; currencyCode: string} | null
  processedAt?: string | null
  statusUrl?: string | null
  shippingAddress?: {
    name?: string | null
    firstName?: string | null
    lastName?: string | null
  } | null
  lineItems?: {edges: {node: RawOrderLineItemNode}[]} | null
}

export type Customer = {
  id: string
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  acceptsMarketing?: boolean
  defaultAddress?: CustomerAddress | null
  metafield?: {value: string} | null
  b2bValidated?: {value: string} | null
  b2bDiscount?: {value: string} | null
  orders?: {edges: {node: RawOrderNode}[]} | null
}

export type AccountInfoInput = {
  firstName: string
  lastName: string
  birthday: string // 'DD/MM/AAAA'
}

export type ShippingInput = {
  address1: string
  zip: string
  city: string
  province: string
  country: string
  phoneCountry: string // prefijo, p.ej. '+34'
  phone: string
}

export type ActionResult = {ok: true} | {ok: false; error: string}

export type OrderLineItem = {
  title: string
  quantity: number
  category: string | null
  handle: string | null
  image: {src: string; altText: string | null} | null
}

export type Order = {
  id: string
  number: string
  processedAt: string // ISO
  total: string // formateado con moneda
  shipTo: string
  financialStatus: string | null
  statusUrl: string
  lineItems: OrderLineItem[]
}
