import {groq} from 'next-sanity'

// Resolves a linkInternal reference to a frontend href based on the
// referenced document type. Pages map to /<slug>; collections and products
// use their Shopify-synced handle under the corresponding shop route.
export const linkInternalHref = groq`"href": select(
  reference->_type == "home"       => "/",
  reference->_type == "page"       => "/" + reference->slug.current,
  reference->_type == "collection" => "/shop/" + coalesce(reference->store.slug.current, reference->slug.current),
  reference->_type == "product"    => "/shop/product/" + coalesce(reference->store.slug.current, reference->slug.current),
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
