# Sets — Single View (`/sets/[slug]`) — Diseño

- **Fecha:** 2026-06-09
- **Figma single view:** file `u92pryF41Lr42YVpq1Qxsn`, `node-id=31-13998`
- **Objetivo:** Página de detalle de un **set** (bundle de productos de la misma familia: talla por componente, color cerrado, precio por rango), funcionalmente idéntica a la Look PDP. Establece el documento `set` y reutiliza la maquinaria de bundle de looks. Es el **Spec 1 de 2**; el `/sets` archive va en un spec aparte.

---

## Decisiones acordadas (brainstorming)

1. **Modelo:** documento `set` **espejo de `look`** + un campo extra `colorLocked`. Se mantienen `look` y `set` como documentos separados (decisión del plan de arquitectura MVP original).
2. **Reutilización:** se reutiliza la maquinaria de bundle de looks **tal cual** — `LookView`, `buildLookView`, `applyLookDiscount`, `LookDetail` y `addLookToCart` ya son genéricas (lo único "look" es el nombre y el tipo del doc de entrada). **Cero cambios en el código de looks** → riesgo nulo para producción. Se asume el coste cosmético del naming "Look" en el código compartido (un rename a nombres neutros queda como follow-up opcional, fuera de alcance).
3. **`colorLocked`:** solo dato del documento (lo necesitará el archive para agrupar colorways). **No se muestra** en el single view — fiel al Figma, donde el color va dentro del título (p. ej. "…Blanc de Blanc").

---

## Estado actual relevante del repo

- **No existe** el documento `set` (documentos registrados: `collection`, `page`, `product`, `productVariant`, `post`, `look`).
- **`sanity/desk/setStructure.ts` ya existe** pero está **huérfano**: apunta a `schemaType('set')` y **no** se importa en `sanity/desk/index.ts`. Andamiaje muerto del plan MVP — se reaprovecha.
- `block.setModule` hoy referencia un `product` (no un documento bundle). **Fuera de alcance** de este spec; se revisará en el spec del archive.
- La Look PDP está completa y es el espejo exacto:
  - Doc: `sanity/schemas/documents/look.tsx` (title, slug, description, propiedadesMaterial, recomendacionesLavado, usoRecomendado, editorialImages, `components` [bundleComponent], relatedProducts, discountStrategy/Value/Code, seo, orderRank).
  - Query: `sanity/queries/queries/look.ts` (`getLook`, `getLookSlugs`, `getLookSEO`).
  - Vista: `lib/look/buildLookView.ts` → `types/look.ts` `LookView`.
  - Render: `components/Look/LookDetail.tsx` (client; usa `addLookToCart`, galerías de Product, `ProductInfoPanel`, `ImageLightbox`, `LookDesktopBar`, `LookSizeList`, `LookPrice`).
  - Ruta: `app/(frontend)/looks/[slug]/page.tsx` (+ `loading.tsx`, `error.tsx`).
  - Carrito: `context/shopContext.js` `addLookToCart(lines, discountCode)` — genérico de bundle.
  - Desk: `lookStructure.ts` + `orderLookStructure.ts`, cableados en `desk/index.ts`; `hiddenDocTypes` incluye `look`, `orderable.look`.

---

## Arquitectura

```
Documento Sanity `set` (slug, components[bundleComponent], colorLocked, …)
  ↓ getSet(slug)            (mirror de getLook; +colorLocked)
  ↓ app/(frontend)/sets/[slug]/page.tsx  (Server Component, mirror de looks/[slug])
  ↓ hidrata cada componente en vivo desde Shopify (getProductDetail)
  ↓ buildLookView(set, details, related)   (REUTILIZADO sin cambios)
  ↓ <LookDetail view={view} />             (REUTILIZADO sin cambios)
        ↓ addLookToCart(lines, discountCode)  (REUTILIZADO)
```

El `set` doc se proyecta con una forma **compatible con `SanityLookDoc`** (mismos campos) más `colorLocked`, de modo que `buildLookView(set, …)` lo acepta sin tocar su firma (`SanitySetDoc extends SanityLookDoc`).

---

## 1. Schema `set` — `sanity/schemas/documents/set.tsx`

Copia de `look.tsx` con:
- `name: 'set'`, `title: 'Set'`, icono `StackCompactIcon` (el que usa `setStructure.ts`/`setModule`).
- **Todos** los campos de `look` (title, slug, description, propiedadesMaterial, recomendacionesLavado, usoRecomendado, editorialImages, orderRank, components [`bundleComponent`, `Rule.min(2)`], relatedProducts, discountStrategy/Value/Code, seo) con sus mismos grupos (`editorial`, `pricing`, `seo`).
- **Campo nuevo** en el grupo `editorial`:
  ```ts
  defineField({
    name: 'colorLocked',
    title: 'Color cerrado',
    type: 'string',
    description: 'Color del set (p. ej. "Blanc de Blanc", "Terracota"). Informativo / agrupación en el archive.',
    validation: (Rule) => Rule.required(),
    group: 'editorial',
  })
  ```
- `preview` con `subtitle: 'Set'`; `orderings` igual que look.

**Registro:**
- `sanity/schemas/index.ts`: importar `set` y añadirlo al array `documents`.
- `sanity/desk/index.ts`: importar `setStructure` (ya existe) y un nuevo `orderSetStructure`; añadirlos a los `items` del desk y a la lista `hiddenDocTypes` (`set`, `orderable.set`).
- `CLAUDE.md`: añadir `set`, `orderable.set` a `hiddenDocTypes`.

## 2. Desk — `sanity/desk/orderSetStructure.ts`

Espejo de `orderLookStructure.ts` con `type: 'set'`, título "Ordenar Sets", icono `StackCompactIcon`. `setStructure.ts` ya es correcto (apunta a `set`).

> El `set` document usa `orderable.set` → registrar el plugin orderable para `set` igual que para `look` (ver `sanity.config.ts`/donde se registre `orderableDocumentListDeskItem`). Verificar el patrón existente de `look` y replicarlo.

## 3. Queries — `sanity/queries/queries/set.ts`

Espejo de `look.ts`:
- `SET_BY_SLUG_QUERY`: idéntica a `LOOK_BY_SLUG_QUERY` con `_type == "set"` **+ `colorLocked`** en la proyección.
- `SanitySetDoc = SanityLookDoc & {colorLocked: string | null}` (reusa los tipos de `look.ts`: `SanityLookImage`, `SanityLookComponent`).
- `getSet(slug): Promise<SanitySetDoc | null>` — tags `['set', 'product', \`set:${slug}\`]`, revalidate 300.
- `getSetSlugs(): Promise<string[]>` — `*[_type == "set" && defined(slug.current) && !(_id in path('drafts.**'))].slug.current`, tag `['set']`.
- `getSetSEO(slug)` — espejo, tags `['set', \`set:${slug}\`]`.

## 4. Vista y render — REUTILIZADOS sin cambios

- `buildLookView(set, details, relatedCards)`: se llama con el `SanitySetDoc`. No se modifica (`SanitySetDoc` es asignable a `SanityLookDoc`). `colorLocked` se ignora en la vista (no se muestra).
- `<LookDetail view={view} />`: se reutiliza tal cual.
- `addLookToCart(lines, discountCode)`: se reutiliza tal cual.

> No se crean `SetView`/`buildSetView`/`SetDetail`. Si en el futuro se quiere desacoplar el naming, se hará un rename mecánico a nombres neutros (`BundleView`, etc.) en un follow-up — fuera de alcance.

## 5. Ruta — `app/(frontend)/sets/[slug]/`

- `page.tsx`: copia de `app/(frontend)/looks/[slug]/page.tsx` cambiando look→set:
  - `import {getSet, getSetSlugs, getSetSEO} from '@/sanity/queries/queries/set'`
  - `generateStaticParams` desde `getSetSlugs`.
  - `generateMetadata` desde `getSetSEO`; canonical `${BASE_URL.origin}/sets/${slug}`; "Set not found" si falta.
  - Body: `getSet` → `notFound()` si null → hidrata handles únicos con `getProductDetail` en paralelo → `getProductCards` para related → `buildLookView(set, details, relatedCards)` → `notFound()` si `view.components.length === 0` → `<LookDetail view={view} />`.
  - `export const revalidate = 300`.
- `loading.tsx` y `error.tsx`: copias de los de `looks/[slug]`.

## 6. Revalidación

- `app/api/revalidate/route.ts`: añadir tras el bloque `page`:
  ```ts
  if (body._type === 'set') {
    if (body.slug) tags.push(`set:${body.slug}`)
  }
  ```
- `CLAUDE.md`: añadir `set`, `set:{slug}` a "Tags activos hoy".

## 7. SEO

`generateMetadata` desde `set.seo` (title/description) con fallback al título del set; canonical a `/sets/{slug}`. (El single view no añade JSON-LD propio más allá de lo que ya hace la Look PDP — se mantiene paridad.)

---

## Lista de archivos

**Nuevos**
- `sanity/schemas/documents/set.tsx`
- `sanity/desk/orderSetStructure.ts`
- `sanity/queries/queries/set.ts`
- `app/(frontend)/sets/[slug]/page.tsx`
- `app/(frontend)/sets/[slug]/loading.tsx`
- `app/(frontend)/sets/[slug]/error.tsx`

**Modificados**
- `sanity/schemas/index.ts` (registrar `set` en `documents`)
- `sanity/desk/index.ts` (importar `setStructure` + `orderSetStructure`; items + `hiddenDocTypes`)
- `app/api/revalidate/route.ts` (tag `set` / `set:{slug}`)
- `sanity.config.ts` (registrar orderable para `set`, si el plugin lista tipos explícitamente — verificar patrón de `look`)
- `CLAUDE.md` (`hiddenDocTypes` + tags)

**Reutilizados sin cambios**
- `lib/look/buildLookView.ts`, `types/look.ts`, `components/Look/*`, `context/shopContext.js` (`addLookToCart`), `components/Product/*` (galerías, panel, lightbox), `sanity/schemas/objects/bundle/bundleComponent.ts`.

**Aprovechado**
- `sanity/desk/setStructure.ts` (huérfano → se cablea).

---

## Supuestos a verificar en implementación

- Cómo se registra el plugin `orderable` para `look` (¿lista tipos en `sanity.config.ts`?) para replicarlo en `set`. Si no requiere registro explícito por tipo, omitir ese paso.
- `loading.tsx`/`error.tsx` de `looks/[slug]` son genéricos (sin texto "look" acoplado); si lo tienen, adaptarlo.
- El webhook de Sanity proyecta `slug = coalesce(store.slug.current, slug.current)`; para `set`, `slug.current` aplica (no es doc de Shopify). OK.

## Fuera de alcance (Spec 2 / futuro)

- `/sets` archive (rejilla + FilterDrawer + `getAllSets`).
- Reescritura de `block.setModule` para referenciar documentos `set`.
- Nav "Complete Sets" → `/sets`.
- Agrupación por color (colorways) en el archive.
- Atributos de bundle en el carrito (`_bundleId`/`_bundleType`) y agrupación visual.
- Rename del código compartido de bundle a nombres neutros.
