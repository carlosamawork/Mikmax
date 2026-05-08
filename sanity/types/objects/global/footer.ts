// sanity/types/objects/global/footer.ts
import type {MenuLinkInternal, MenuLinkExternal} from './menu'

export type SocialLink = {
  _key: string
  _type: 'linkSocial'
  title?: string
  url?: string
  newWindow?: boolean
}

export type FooterNewsletter = {
  title?: string
  body?: string
  placeholder?: string
  buttonLabel?: string
}

export type FooterCollectionParent = {
  title?: string
  handle?: string
}

export type FooterColumn = {
  _key: string
  _type: 'footerColumn'
  title: string
  links: Array<MenuLinkInternal | MenuLinkExternal>
}

export type FooterColumnShop = {
  _key: string
  _type: 'footerColumnShop'
  title: string
  parents?: FooterCollectionParent[]
  extraLinks?: Array<MenuLinkInternal | MenuLinkExternal>
}

export type FooterColumnSocial = {
  _key: string
  _type: 'footerColumnSocial'
  title: string
  links: SocialLink[]
}

export type FooterColumnAny = FooterColumn | FooterColumnShop | FooterColumnSocial

export type FooterRegion = {
  _key: string
  code: string
  label: string
  currency: string
  isDefault?: boolean
}

export type FooterColumnData = {
  newsletter?: FooterNewsletter
  columns?: FooterColumnAny[]
  regions?: FooterRegion[]
}

export type FooterData = {
  footer?: FooterColumnData
}
