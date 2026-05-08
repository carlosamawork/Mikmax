import {groq} from 'next-sanity'
import {image} from './image'

// Projects fields from a `product` document for ProductCard rendering.
// Use as: `manualProducts[]->{${productCardProjection}}` etc.
export const productCardProjection = groq`
  _id,
  "title": store.title,
  "handle": store.slug.current,
  "imageUrl": store.previewImageUrl,
  "minPrice": store.priceRange.minVariantPrice,
  "maxPrice": store.priceRange.maxVariantPrice,
  "compareAtPrice": store.compareAtPrice,
  "tags": store.tags
`

// Projects fields from a `look` or `set` document for BundleCard rendering.
// Use as: `looks[]->{${bundleCardProjection}}` etc.
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
