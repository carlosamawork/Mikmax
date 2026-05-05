// sanity/types/objects/global/menu.ts

export type MenuLinkInternal = {
  _key: string
  _type: 'linkInternal'
  title?: string
  // resolved by query (optional, depending on projection)
  slug?: string
  reference?: {_ref: string; _type: 'reference'}
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

export type MenuItem = MenuLinkInternal | MenuLinkExternal | MenuGroup

export type MenuData = {
  links?: MenuItem[]
}
