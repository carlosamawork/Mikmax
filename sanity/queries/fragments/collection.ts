import {groq} from 'next-sanity'

// Projects collection metadata + parent chain (up to 3 levels) for
// breadcrumb. Deeper jerarquías se ignoran (no se espera más profundidad
// en MVP).
export const collectionProjection = groq`
  _id,
  "title": store.title,
  "handle": store.slug.current,
  "descriptionHtml": store.descriptionHtml,
  parent->{
    "title": store.title,
    "handle": store.slug.current,
    parent->{
      "title": store.title,
      "handle": store.slug.current
    }
  }
`
