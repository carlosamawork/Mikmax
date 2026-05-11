export type ProductCardData = {
  _id: string
  title?: string
  handle?: string
  imageUrl?: string
  minPrice?: number
  maxPrice?: number
  compareAtPrice?: number
  tags?: string
  // Optional: set when card represents a specific variant; false renders "Agotado" overlay.
  availableForSale?: boolean
}

export type SetCardComponent = {
  label?: string
  variantTitle?: string
  imageUrl?: string
}

export type SetCardData = {
  _id: string
  title?: string
  description?: string
  slug?: string
  components?: SetCardComponent[]
}
