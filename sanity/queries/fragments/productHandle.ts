import {groq} from 'next-sanity'

// Lightweight projection used to fetch ordered handle lists.
export const productHandleProjection = groq`
  _id,
  "handle": store.slug.current,
  orderRank
`
