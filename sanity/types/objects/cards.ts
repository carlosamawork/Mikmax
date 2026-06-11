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
  // Optional: set when the card represents a specific color variant — used to deep-link to the PDP with that color preselected.
  colorSlug?: string
  // Optional: 2nd image of the variant gallery (fallback featured). Used by the
  // editorial Vista 2 featured tile to show a different shot.
  secondaryImageUrl?: string
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
