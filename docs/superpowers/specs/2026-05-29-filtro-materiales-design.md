# Filtro de materiales (productos) vía Shopify

Fecha: 2026-05-29
Estado: aprobado (pendiente confirmar keys reales en Shopify)

## Objetivo

Añadir "Materiales" como filtro en el archive de Shop (y luego en el lookbook),
reutilizando el motor de filtros existente. Espejo del filtro de **Color**.

## Decisiones tomadas

1. **Origen: taxonomía estándar de Shopify, NO metaobject custom.** El filtro de
   color ya usa la taxonomía estándar (`metafield namespace:"shopify"
   key:"color-pattern"`, con `color_taxonomy_reference`). Material funciona igual:
   se rellena el atributo de taxonomía a nivel producto y Shopify lo expone como
   facet `filter.v.t.shopify.<key>`.

2. **Material no es UNA key, es una LISTA configurable de keys.** La taxonomía de
   Shopify ofrece atributos de material distintos según categoría. Ejemplo
   confirmado: un cojín tiene **material de cubierta** (fabric) y **material de
   relleno** (filling-material), atributos separados. Otras categorías tendrán el
   suyo. El código mantiene un allowlist `MATERIAL_TAXONOMY_KEYS`
   (ej. `['fabric', 'filling-material', ...]`) a confirmar con datos reales.

3. **UI: filtro unificado.** Un único filtro "Materiales" que mezcla los valores
   de TODOS los atributos de material (cubierta + relleno + …) en una sola lista.
   El cliente ve Lino, Algodón, Pluma, etc. sin distinción de origen.

4. **Semántica: OR dentro de material, AND entre facets, filtrado en cliente.**
   Igual que color (Shopify hace AND entre metafields de taxonomía, lo que rompe
   el "Lino O Algodón"). Material es a **nivel producto** → NO multiplica cards;
   se conserva la card si los materiales del producto intersecan con los
   seleccionados.

## Cambios de código (espejo de color-pattern)

| Archivo | Cambio |
|---|---|
| `lib/shopify.js` | Añadir cada metafield de `MATERIAL_TAXONOMY_KEYS` al `PRODUCT_CARD_FRAGMENT` y al fragment de detalle (análogo a `colorPattern`). |
| `lib/shop/searchParams.ts` | `MATERIAL_TAXONOMY_KEYS` (allowlist); `material` en `FILTER_KEYS`; parser del param `material`; lectura/merge de los facets `filter.v.t.shopify.<key>` en un grupo lógico "material". |
| `lib/shop/expandToCards.ts` / `filterAndSortCards.ts` | Extraer los GIDs de valor de material del producto (unión de todas las keys) y filtrar cards con semántica OR. |
| `types/shop.ts` | `material?: string` en `ShopSearchParams`. |
| `components/Shop/FilterDrawer/MaterialChips.tsx` (nuevo) | Clon de `SizeChips`/`ColorSwatches`. |
| `components/Shop/FilterDrawer/FilterDrawer.tsx` | Nueva sección "Materiales" que renderiza los valores agrupados/deduplicados. |

### Detalle de agrupación
- Las opciones del drawer salen de `getAllShopFilters()` / `getCollectionFilters()`:
  se leen los facets de cada key de `MATERIAL_TAXONOMY_KEYS` y se fusionan en una
  sola lista, **deduplicando por label** (mapeando label → conjunto de GIDs) para
  que coincidencias entre atributos no dupliquen el chip.
- El filtrado client-side compara el conjunto de GIDs de material del producto
  contra los GIDs seleccionados (no por label) para evitar falsos positivos.

## Prerequisito en Shopify (lo hace el cliente)

1. Asignar **categoría** al producto (de ahí salen los atributos de taxonomía).
2. Rellenar el/los atributos **Material/Fabric/Filling** con valores de la lista
   de Shopify.
3. En **Search & Discovery** activar esos metafields como filtros.

## Keys confirmadas en vivo (verificado vía Storefront API)

`MATERIAL_TAXONOMY_KEYS = ['cover-material', 'filler-material', 'fabric']`

- `filter.v.t.shopify.cover-material` "Material de la cubierta" → Cotton, Felt, Wool
- `filter.v.t.shopify.filler-material` "Material de relleno" → Cotton
- `filter.v.t.shopify.fabric` "Tejido" → Cotton

**"Cotton" aparece en las tres keys** → en el filtro unificado se muestra un único
chip "Cotton" (dedupe por label) y un producto pasa si cubierta/relleno/tejido
contiene ese material. Confirma la necesidad de agrupar por label y matchear por el
conjunto de GIDs asociados a ese label en las tres keys.

Activar como filtro en Search & Discovery es obligatorio: verificado que asignar el
valor al producto es necesario pero NO suficiente para que el facet aparezca.

## Idioma de los valores (decidido)

Mostrar los labels **tal cual vienen de Shopify** (inglés: Cotton, Felt, Wool). La
web se está construyendo en inglés y se traducirá a español más adelante como parte
de la i18n global del sitio; los materiales entrarán en ese esfuerzo. No se crea
diccionario label→ES ahora (sería desechable).

## Open items

- Descubrir las keys de material de categorías futuras y añadirlas a la lista.

## Fuera de alcance (spec aparte)

- Archive de lookbooks (`/looks`) — reutilizará este filtro de material.
- Schema de `set`/bundles, Sanity.
