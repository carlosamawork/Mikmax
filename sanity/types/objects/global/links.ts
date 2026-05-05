// sanity/types/objects/global/links.ts
// This module is kept as a thin re-export to avoid breaking existing imports.
// Authoritative menu/link types now live in `./menu`.
export type {MenuLinkInternal, MenuLinkExternal, MenuItem} from './menu'

// Legacy alias kept for older imports — do NOT add new code that uses this.
export type ExternalLink = import('./menu').MenuLinkExternal
export type MenuLink = import('./menu').MenuLinkExternal | import('./menu').MenuLinkInternal
