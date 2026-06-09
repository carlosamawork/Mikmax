# Our Story + sistema de páginas estáticas — Diseño

- **Fecha:** 2026-06-09
- **Figma:** Desktop | Our Story — `node-id=11-4622` (file `u92pryF41Lr42YVpq1Qxsn`)
- **Objetivo:** Implementar la página *Our Story* y, al hacerlo, dejar establecido el sistema reutilizable para generar otras páginas estáticas (Mikmax for Business, Contact, etc.) sin tocar código en cada nueva.

---

## Decisiones acordadas (brainstorming)

1. **Contenido:** editable en Sanity vía el `pageBuilder` que ya existe en el documento `page`. Cada página estática = un documento `page`.
2. **Routing:** URLs en la raíz (`/our-story`), resueltas por la ruta catch-all `app/(frontend)/[...slug]/page.tsx` (que hoy solo redirige a `/`).
3. **Bloque:** un único bloque flexible `block.twoColumn` (fila de 2 celdas; cada celda elige texto o imagen/vídeo). Reproduce fiel el Figma, incluidas las filas mixtas `texto | imagen`.
4. **Breadcrumb:** se generaliza el componente en **este** spec y se estrena en Our Story (migrando el de Product al nuevo). El despliegue al resto del sitio va en un **spec aparte**. Se muestra en todas las páginas **menos la home**; primer crumb siempre `Home`.

---

## Estado actual relevante del repo

- `sanity/schemas/documents/page.ts` ya tiene `title`, `slug`, `showHero`/`hero`, `body`, **`pageBuilder`** (array de bloques; su descripción menciona literalmente "Our Story, B2B, landings") y `seo`.
- `components/PageBuilder/PageBuilder.tsx` despacha bloques por `_type` y se usa en la home (`app/(frontend)/page.tsx` → `getHome()`).
- Bloques existentes: `heroCampaign`, `campaignImageVideo`, `imageWithProduct`, `productModule`, `lookModule`, `setModule`, `featuredSection`, `richText`.
- **No hay ninguna ruta pública que renderice documentos `page`.** `app/(frontend)/[...slug]/page.tsx` hace `permanentRedirect('/')`.
- `components/Product/shared/Breadcrumb.tsx` existe pero está hardcodeado a `Home > Shop > {title}` y solo lo usa Product.
- Header, AnnouncementBanner y Footer son globales en `app/(frontend)/layout.tsx` → **fuera de alcance**.

---

## Arquitectura

```
Documento Sanity `page` (slug: our-story)
  └─ pageBuilder[]  (varios block.twoColumn apilados)
        ↓ getPage(slug)  → GROQ con fragmento pageBuilder compartido
        ↓ app/(frontend)/[...slug]/page.tsx  (Server Component)
        ↓ <Breadcrumb items=[Home, Our Story] />  +  <PageBuilder blocks=… />
        ↓ <TwoColumn> por cada fila
```

---

## 1. Bloque `block.twoColumn`

### Schema — `sanity/schemas/objects/blocks/twoColumn.ts`
Bloque con dos celdas que reutilizan un object compartido:

- `left`: `twoColumnCell` (requerido)
- `right`: `twoColumnCell` (requerido)

### Object compartido — `sanity/schemas/objects/twoColumnCell.ts`
Campo `kind` (radio: `text` | `media`, requerido, default `text`).

- **kind === 'text'**
  - `body`: type `body` (PortableText, igual que `block.richText`). Visible solo si `kind === 'text'`.
- **kind === 'media'** (espeja `campaignImageVideo`)
  - `mediaType`: `image` | `video` (radio, default `image`)
  - `image`: `image` con `hotspot` y campo `alt` (requerido cuando hay imagen)
  - `video`: object `{ src: url, poster: image, posterAlt: string }`
  - `caption`: string opcional (rótulo superpuesto, p. ej. "Mikmax for Business"). Vacío = sin rótulo → cubre las celdas de caption "transparente" del Figma.
  - `captionTheme`: `light` | `dark` (default `light`)
  - `url`: string opcional (hace clicable la celda entera; acepta rutas relativas o absolutas)

`hidden: ({parent}) => parent?.kind !== 'media'` / `!== 'text'` por campo, según el patrón de `campaignImageVideo`. `preview` que muestre `kind` + caption/primer texto + media.

### Registro
- `sanity/schemas/objects/blocks/index.ts`: importar `twoColumn`, añadir a `blockSchemas`.
- Registrar el object `twoColumnCell` donde se registran los objects compartidos (verificar `sanity/schemas/index.ts` / `sanity/schema.ts`).
- El documento `page` ya incluye `blockTypeNames` en su `pageBuilder`, así que el nuevo bloque aparece automáticamente.

---

## 2. Tipos — `sanity/types/objects/blocks/`

- `twoColumn.ts`: 
  ```ts
  export type TwoColumnCell =
    | { kind: 'text'; body?: PortableTextBlock[] }
    | {
        kind: 'media'
        mediaType?: 'image' | 'video'
        image?: SanityImageRef
        video?: SanityVideo
        caption?: string
        captionTheme?: 'light' | 'dark'
        url?: string
      }
  export type TwoColumnBlock = {
    _key: string
    _type: 'block.twoColumn'
    left: TwoColumnCell
    right: TwoColumnCell
  }
  ```
  (`SanityImageRef`/`SanityVideo` se reusan de `./heroCampaign`.)
- `index.ts`: re-export + añadir `TwoColumnBlock` a la unión `PageBuilderBlock`.

---

## 3. Render — `components/PageBuilder/blocks/TwoColumn/`

- `TwoColumn.tsx`: `<section class={s.row}>` con dos `<div class={s.cell}>`.
  - Celda `text` → `<PortableText value={cell.body} />` (el de `components/PageBuilder/PortableText`).
  - Celda `media` → `LazyImage` / `LazyVideo` (según `mediaType`) + `caption` opcional (`s.captionLight`/`s.captionDark`). Si `url`: envolver en `Link` (rutas `/…`) o `<a target="_blank" rel="noopener noreferrer">` (absolutas), igual que `CampaignImageVideo`.
- `TwoColumn.module.scss` (**mobile-first**, CLAUDE.md):
  - Base móvil: `.row` flex-column; cada `.cell` a ancho completo apilada; media con altura/aspect razonable, texto con su padding.
  - `@media (min-width: 768px)`: `.row` flex-row, dos celdas `flex: 1`, gutter 1px, padding lateral 5px (Figma: `gap-px`, `px-[5px]`).
  - `@media (min-width: 1024px)`: altura de fila ~450px (Figma), texto alineado abajo-izquierda sobre fondo blanco; caption superpuesta abajo-izquierda.
- Registrar `case 'block.twoColumn'` en `components/PageBuilder/PageBuilder.tsx`.

---

## 4. Ruta — `app/(frontend)/[...slug]/page.tsx`

Reemplaza el `permanentRedirect('/')` actual por resolución de `page`:

- `generateStaticParams()`: query de todos los slugs de `page` → `{slug: [handle]}` (catch-all → array de un segmento).
- `generateMetadata({params})`: `getPage(slug)`; metadata desde `page.seo` con fallback a `siteTitle`/`siteDescription` y `canonical = ${BASE_URL.origin}/${slug}`. Espeja `legal/[section]/page.tsx`.
- Componente: une `slug` (catch-all) a un handle. Si la query devuelve `page` → renderiza `<Breadcrumb>` + `<PageBuilder blocks={page.pageBuilder} />`. Si no existe (o slug multi-segmento) → conserva el `permanentRedirect('/')` actual.
- `export const revalidate = 3600`.

> Precedencia de rutas Next: los segmentos estáticos (`products`, `shop`, `looks`, `legal`, `search`) ganan al catch-all, que actúa solo como fallback → sin colisiones.

---

## 5. Query y caché

- **Refactor en alcance:** extraer la proyección de `pageBuilder[]` de `sanity/queries/queries/home.ts` a un fragmento compartido `sanity/queries/fragments/pageBuilder.ts` (incluye `mediaProjection` y todos los `_type == … =>`), **añadiendo** el caso:
  ```groq
  _type == "block.twoColumn" => {
    left{ kind, body, ${mediaProjection}, caption, captionTheme, url },
    right{ kind, body, ${mediaProjection}, caption, captionTheme, url }
  }
  ```
  Reusar el fragmento en `home.ts` y en el nuevo `page.ts` (DRY).
- `sanity/queries/queries/page.ts` → `getPage(slug)`:
  ```ts
  *[_type == "page" && slug.current == $slug][0]{
    _id, title, slug,
    pageBuilder[]{ _key, _type, ${pageBuilderProjection} },
    seo{ ${seo} }
  }
  ```
  con `{next: {tags: ['page', 'product', 'look', `page:${slug}`], revalidate: 3600}}`.
- **Revalidación on-demand** (CLAUDE.md):
  - `app/api/revalidate/route.ts`: registrar invalidación de `page` y `page:${slug}`.
  - Actualizar la lista "Tags activos hoy" en CLAUDE.md añadiendo `page`, `page:{slug}`.

---

## 6. Breadcrumb (porción de este spec)

- Nuevo componente genérico `components/Common/Breadcrumb/`:
  - API: `items: { label: string; href?: string }[]`. El último ítem (sin `href`) es `aria-current="page"`.
  - Reutiliza los estilos actuales (`Home` gris, último negro, uppercase, Monument Grotesk; `padding`, `gap` del SCSS de Product).
  - Renderiza también JSON-LD `BreadcrumbList` (schema.org) para SEO.
- **Estreno:** Our Story pasa `items=[{label:'Home', href:'/'}, {label:'Our Story'}]`, renderizado justo bajo el header (encima del `PageBuilder`).
- **Migración:** `components/Product/shared/Breadcrumb.tsx` → usar el genérico (`Home > Shop > {title}`), eliminando el componente acoplado. Verificar el punto de uso en la página de producto.
- **Fuera de alcance (spec aparte):** cablear el breadcrumb en shop/collection, looks, lookbook detail, legal y search.

---

## 7. SEO / metadata

- `generateMetadata` desde `page.seo` (title/description/image) con fallbacks de `utils/seoHelper`.
- `canonical` a la URL en raíz. OG image vía `urlFor(...).width(1200)` si hay imagen (patrón de legal).
- JSON-LD `BreadcrumbList` emitido por el componente Breadcrumb.

---

## 8. Studio

- Verificar que el documento `page` es **creable** en el desk del Studio y, si aplica, que está en `hiddenDocTypes` (`sanity/desk/...` / config). Si no aparece como creable, añadir su entrada en el desk structure.

---

## Lista de archivos (resumen)

**Nuevos**
- `sanity/schemas/objects/twoColumnCell.ts`
- `sanity/schemas/objects/blocks/twoColumn.ts`
- `sanity/types/objects/blocks/twoColumn.ts`
- `sanity/queries/fragments/pageBuilder.ts`
- `sanity/queries/queries/page.ts`
- `components/PageBuilder/blocks/TwoColumn/TwoColumn.tsx`
- `components/PageBuilder/blocks/TwoColumn/TwoColumn.module.scss`
- `components/Common/Breadcrumb/Breadcrumb.tsx`
- `components/Common/Breadcrumb/Breadcrumb.module.scss`

**Modificados**
- `sanity/schemas/objects/blocks/index.ts` (registro `twoColumn`)
- registro del object `twoColumnCell` (índice de schemas)
- `sanity/types/objects/blocks/index.ts` (unión `PageBuilderBlock`)
- `sanity/queries/queries/home.ts` (usar fragmento compartido)
- `components/PageBuilder/PageBuilder.tsx` (case `block.twoColumn`)
- `app/(frontend)/[...slug]/page.tsx` (resolver `page`)
- `app/api/revalidate/route.ts` (tags `page` / `page:{slug}`)
- `components/Common/index.ts` (export Breadcrumb)
- página de Product (usar Breadcrumb genérico) + borrar `components/Product/shared/Breadcrumb.*`
- `CLAUDE.md` (lista de tags activos)

---

## Supuestos a verificar en implementación

- Header/Footer globales en el layout cubren las zonas superior/inferior del Figma (no se reconstruyen).
- El tipo `body` (PortableText) y el `<PortableText>` renderer cubren el texto multi-párrafo del Figma.
- El documento `page` es creable en el Studio; si no, ajustar el desk.
- Punto exacto de uso del Breadcrumb actual en la página de producto.

## Fuera de alcance

- Rollout del breadcrumb al resto del sitio (spec aparte).
- Header, AnnouncementBanner, Footer.
- `productModule` en modo colección (limitación ya existente, ajena a esto).
