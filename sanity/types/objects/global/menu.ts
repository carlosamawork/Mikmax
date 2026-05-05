// sanity/types/objects/global/menu.ts

export type MenuLinkInternal = {
  _key: string
  _type: 'linkInternal'
  title?: string
  // Resolved frontend href (computed by GROQ via `linkInternalHref` fragment).
  // Falls back to "#" if the referenced doc type is unknown.
  href?: string
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
