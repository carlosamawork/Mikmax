// sanity/types/objects/global/menu.ts

export type LinkInternalRef = {
  _type?: string
  slug?: string
}

export type MenuLinkInternal = {
  _key: string
  _type: 'linkInternal'
  title?: string
  // Raw projected reference. Compute the href via `getInternalHref(ref)`
  // from `sanity/queries/fragments/links` at the point of consumption.
  ref?: LinkInternalRef
}

export type MenuLinkExternal = {
  _key: string
  _type: 'linkExternal'
  title?: string
  url: string
  newWindow?: boolean
}

export type MenuFeaturedProduct = {
  _id: string
  title?: string
  handle?: string
  image?: string
}

export type MenuGroup = {
  _key: string
  _type: 'menuGroup'
  label: string
  items: Array<MenuLinkInternal | MenuLinkExternal>
  featuredProduct?: MenuFeaturedProduct
}

// Auto mega-menu built from parent/child collections.
// `tree` is filled by the settings GROQ at render time.
export type CollectionTreeChild = {
  title?: string
  handle?: string
}

export type CollectionTreeParent = {
  title?: string
  handle?: string
  imageUrl?: string
  children?: CollectionTreeChild[]
}

export type MenuShop = {
  _key: string
  _type: 'menuShop'
  label: string
  tree?: CollectionTreeParent[]
}

export type MenuItem = MenuLinkInternal | MenuLinkExternal | MenuGroup | MenuShop

export type MenuData = {
  links?: MenuItem[]
}
