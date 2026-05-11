import {groq} from 'next-sanity'

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

// Projects fields from a `set` or `look` document for SetCard rendering.
// Returns one image per component (the Shopify variant preview), the title,
// the descriptive copy and the slug for the detail page link.
export const setCardProjection = groq`
  _id,
  title,
  description,
  "slug": slug.current,
  "components": components[]{
    label,
    "variantTitle": productVariant->store.title,
    "imageUrl": productVariant->store.previewImageUrl
  }
`
