export type SetArchiveComponent = {
  imageUrl?: string
  imageAlt?: string
}

export type SetArchiveItem = {
  id: string
  title: string
  slug: string
  components: SetArchiveComponent[]
  // Rango de precio del set (suma de componentes), ya con el descuento aplicado.
  priceMin: number
  priceMax: number
}
