import {groq} from 'next-sanity'

// Resolves a linkInternal reference to a frontend href.
//
// Why no GROQ select(...) and no `_type == "linkInternal" => {…}` conditional
// spread: when these are nested inside an outer object projection that also
// uses condition => {…} spreads (or another select arm), the GROQ parser
// fails with "expected '}' following object body". We instead project the
// bare `_type` and `slug` of the referenced doc on every link (it's null for
// linkExternal/linkSocial because they have no `reference` field) and let
// TypeScript compute the href via `getInternalHref` at consumption time.

export type LinkInternalRef = {
  _type?: string
  slug?: string
}

export const linkInternalHref = groq`
  "ref": reference->{
    _type,
    "slug": coalesce(store.slug.current, slug.current)
  }
`

export function getInternalHref(ref?: LinkInternalRef | null): string {
  if (!ref) return '#'
  switch (ref._type) {
    case 'home':
      return '/'
    case 'page':
      return ref.slug ? `/${ref.slug}` : '#'
    case 'collection':
      return ref.slug ? `/shop/${ref.slug}` : '#'
    case 'product':
      return ref.slug ? `/shop/product/${ref.slug}` : '#'
    default:
      return '#'
  }
}

// Single link item projection. The bare `...` spread captures the link's own
// fields (title, url, newWindow for external/social; nothing extra for
// internal). The `${linkInternalHref}` adds a resolved `ref` for internal
// links — null for external/social since they don't have a `reference` field.
export const linkResolved = groq`
  ...,
  ${linkInternalHref}
`

// Social link projection.
export const socialLinkResolved = groq`
  _key,
  _type,
  title,
  url,
  newWindow
`
