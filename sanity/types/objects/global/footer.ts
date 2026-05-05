// sanity/types/objects/global/footer.ts
import type {MenuLinkInternal, MenuLinkExternal} from './menu'

export type SocialLink = {
  _key: string
  _type: 'linkSocial'
  platform?: string
  url?: string
}

export type FooterColumnData = {
  links?: Array<MenuLinkInternal | MenuLinkExternal>
  linksSocial?: SocialLink[]
  linksTerms?: Array<MenuLinkInternal | MenuLinkExternal>
  socialModule?: SocialLink[]
  text?: unknown // PortableText — refined later
}

export type FooterData = {
  footer?: FooterColumnData
}
