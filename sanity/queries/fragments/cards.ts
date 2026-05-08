import {groq} from 'next-sanity'
import {image} from './image'

// Projects fields from a `product` document for ProductCard rendering.
// Use as: `manualProducts[]->{${productCardProjection}}` etc.
// Note: compareAtPrice lives on the variant schema, not the product.
// Until we wire variant-level pricing aggregation, the card omits it
// (PriceDisplay handles missing compareAt gracefully).
export const productCardProjection = groq`
  _id,
  "title": store.title,
  "handle": store.slug.current,
  "imageUrl": store.previewImageUrl,
  "minPrice": store.priceRange.minVariantPrice,
  "maxPrice": store.priceRange.maxVariantPrice,
  "tags": store.tags
`

// Projects fields from a `look` or `set` document for BundleCard rendering.
// Use as: `looks[]->{${bundleCardProjection}}` etc.
// Note: colorLocked is a `set`-only field; on `look` documents it resolves to undefined.
export const bundleCardProjection = groq`
  _id,
  title,
  "slug": slug.current,
  "image": editorialImages[0].image{
    ${image},
    "alt": alt
  },
  priceFixed,
  priceCompareAt,
  colorLocked
`
