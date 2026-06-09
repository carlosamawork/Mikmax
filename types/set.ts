export type SetArchiveComponent = {
  imageUrl?: string
  imageAlt?: string
}

export type SetArchiveItem = {
  id: string
  title: string
  slug: string
  components: SetArchiveComponent[]
  priceMin: number
  priceMax: number
}
