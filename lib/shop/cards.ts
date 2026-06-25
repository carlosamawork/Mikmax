import {cache} from 'react'
import {parseSearchParams} from '@/lib/shop/searchParams'
import {buildAllCards, type BuiltCards} from '@/lib/shop/buildCards'

type RawSearchParams = Record<string, string | string[] | undefined>

// Clave string estable para que React.cache deduplique el pipeline pesado de
// Shopify entre la página (ItemList JSON-LD) y ShopArchive (grid) en una misma
// request. cache() compara argumentos por identidad, así que un objeto parseado
// no deduplicaría; el JSON string sí.
export function searchKeyFor(sp: RawSearchParams): string {
  return JSON.stringify(sp)
}

export const getCardsForRequest = cache(
  (handle: string, searchKey: string): Promise<BuiltCards> =>
    buildAllCards(handle, parseSearchParams(JSON.parse(searchKey) as RawSearchParams)),
)
