import {groq} from 'next-sanity'

// Resolves a linkInternal reference to a frontend href based on the
// referenced document type. Pages map to /<slug>; collections and products
// use their Shopify-synced handle under the corresponding shop route.
//
// We use coalesce(select(cond => val), …, default) instead of a multi-arm
// select() because GROQ's parser, when this fragment is interpolated inside
// an object projection that already uses `condition => { … }` conditional
// spreads (e.g. `links[]{ _type == "linkInternal" => {…} }`), gets confused
// by the inner `=>` arms and fails with "expected '}' following object body".
// Each single-arm select() returns either the value or null, and coalesce
// picks the first non-null (or "#" as default).
export const linkInternalHref = groq`"href": coalesce(
  select(reference->_type == "home" => "/"),
  select(reference->_type == "page" => "/" + reference->slug.current),
  select(reference->_type == "collection" => "/shop/" + coalesce(reference->store.slug.current, reference->slug.current)),
  select(reference->_type == "product" => "/shop/product/" + coalesce(reference->store.slug.current, reference->slug.current)),
  "#"
)`

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
