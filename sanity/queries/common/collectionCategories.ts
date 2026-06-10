import {groq} from 'next-sanity'
import {client} from '../index'

// Handles de las colecciones "hijas" (con parent definido) — para resolver la
// categoría más específica de un producto en la cuenta (pedidos).
export async function getChildCollectionHandles(): Promise<Set<string>> {
  const rows = await client.fetch<{handle: string}[]>(
    groq`*[_type == "collection" && defined(parent) && !store.isDeleted && coalesce(hideFromShopMenu, false) == false]{
      "handle": store.slug.current
    }`,
    {},
    {next: {tags: ['collection'], revalidate: 3600}},
  )
  return new Set((rows ?? []).map((r) => r.handle).filter(Boolean))
}
