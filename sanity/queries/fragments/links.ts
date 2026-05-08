import {groq} from 'next-sanity'

// Resolves a linkInternal reference to a frontend href.
//
// Why no GROQ select(...): when `linkInternalHref` is interpolated inside an
// object projection that already uses `condition => { ... }` conditional
// spreads (e.g. `links[]{ _type == "linkInternal" => { ... } }`), GROQ's
// parser fails on `select(... => ...)` arms with "expected '}' following
// object body" — the outer `=>` confuses the parser. Instead we project
// the bare `_type` and `slug` fields and let TS compute the href via the
// `getInternalHref` helper at consumption time.

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

// Single link item projection (internal or external) with a uniform shape.
// Use inside an array projection: `links[]{ ${linkResolved} }`.
export const linkResolved = groq`
  ...,
  _type == "linkInternal" => {
    _key,
    _type,
    title,
    ${linkInternalHref}
  }
`

// Social link projection.
export const socialLinkResolved = groq`
  _key,
  _type,
  title,
  url,
  newWindow
`
