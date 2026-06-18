# Diseño: Internacionalización EN/ES (inglés base + español opcional)

**Fecha:** 2026-06-18
**Estado:** Aprobado (diseño) — pendiente de plan de implementación
**Stack:** Next.js 15 App Router · Sanity CMS v3 · Shopify Storefront API

---

## 1. Contexto y objetivo

El sitio hoy es **monolingüe en inglés** (frontend, CMS y producto). Se quiere
soportar **dos idiomas**:

- **`en` — inglés:** idioma base y fuente de verdad. Servido en la raíz (`/…`).
- **`es` — español:** traducción. Servido bajo prefijo (`/es/…`). Se autoselecciona
  si el navegador prefiere español.

La traducción se construye primero en los administradores (Shopify + Sanity) y la
infraestructura de consulta ya la lee. **Mientras un flag esté desactivado, todo el
sitio resuelve solo inglés** y se comporta exactamente como hoy (riesgo cero). Al
encender el flag, el español queda disponible.

Adicionalmente se deja **preparada la multimoneda vía Shopify Markets** (no activada
en esta fase): las queries Storefront pasan a usar `@inContext(country, language)` y
los precios se renderizan desde el `currencyCode` que devuelve Shopify, de modo que
abrir mercados en el futuro sea configuración y no reescritura.

### Objetivos (in scope)

- Infraestructura completa de i18n EN/ES con flag de activación (default OFF).
- Routing por idioma: inglés en raíz, español bajo `/es/`.
- Localización de las tres superficies de contenido: Sanity (CMS + editorial de
  producto), Shopify (título/descr/opciones), y textos de interfaz hardcodeados.
- SEO multilingüe (`hreflang`, `canonical`, sitemap) condicionado al flag.
- Plumbing de moneda/país en las queries Shopify (sin activar selector ni geo).

### No objetivos (out of scope, fases posteriores)

- Activar el español en producción (flip del flag) → ocurre cuando la traducción esté
  completa y revisada.
- Geo-detección de país, selector de moneda y precios por mercado (Shopify Markets
  activo) → Fase posterior; aquí solo se deja el plumbing.
- Idiomas adicionales más allá de EN/ES.

---

## 2. Modelo de locale y feature flag

- Locales soportados: `en` (default) y `es`.
- Flag único: **`NEXT_PUBLIC_I18N_ES`** (string `"true"` para activar).
  - **OFF (default / ausente):** sin rutas `/es`, sin redirección por navegador, sin
    selector de idioma, sin `hreflang`. `getLocale()` siempre devuelve `en`. Todas las
    queries resuelven inglés. Comportamiento idéntico al actual.
  - **ON:** `/es/` enrutable, middleware autodetecta y redirige a `/es/` en la primera
    visita si el `Accept-Language` prefiere español, selector visible, `hreflang`
    emitido.
- Es público (`NEXT_PUBLIC_`) porque lo consumen tanto el middleware como la UI
  cliente (selector). El middleware también lo lee en el edge.

---

## 3. Routing

Enfoque **mínimamente invasivo** (no se reestructuran las rutas bajo una carpeta
`[lang]`):

### `middleware.ts` (nuevo, en la raíz)

- Matcher: todas las rutas de `app/(frontend)` excluyendo `/admin`, `/api`, assets
  estáticos y `_next`.
- Lógica:
  1. Si `NEXT_PUBLIC_I18N_ES` está OFF → no hace nada (o 404/redirect a raíz si
     alguien fuerza `/es`). `x-locale=en`.
  2. Si la ruta empieza por `/es` → `locale = es`; **rewrite interno** quitando el
     prefijo (`/es/products` → `/products`) y se fija cabecera `x-locale=es`.
  3. Resto de rutas → `locale = en`, cabecera `x-locale=en`.
  4. Solo en la **primera visita** (sin cookie `NEXT_LOCALE`) y con flag ON: si
     `Accept-Language` prefiere `es`, redirige `308` a `/es<path>`.
- Cookie `NEXT_LOCALE` recuerda la elección manual; tiene prioridad sobre el
  `Accept-Language` en visitas posteriores.
- Compatibilidad con `trailingSlash: true` (los rewrites/redirects preservan la barra
  final).

### Helpers de servidor/cliente

- **`getLocale(): Locale`** — Server Component helper que lee `headers().get('x-locale')`
  con fallback `en`. Disponible en cualquier RSC y en las funciones de fetch.
- **`localizedHref(path: string, locale: Locale): string`** — antepone `/es` cuando
  `locale === 'es'`; deja la raíz para `en`. Se usa en todos los `<Link>` internos.
- **Selector de idioma** — componente cliente que cambia de locale conservando la ruta
  actual y escribe la cookie `NEXT_LOCALE`. Solo se renderiza con flag ON.

---

## 4. Las tres superficies de traducción

### 4a. Contenido Sanity (CMS + editorial de producto)

- Plugin **`@sanity/internationalized-array`** en los campos traducibles de los tipos:
  `home`, `settings`, `legal`, `look`, `set`, `page`, `post`, `mikmaxForBusiness`,
  `b2bArea`, y los campos editoriales de `product`
  (`propiedadesMaterial`, `recomendacionesLavado`, `usoRecomendado`).
- Cada campo pasa de valor único a array `[{_key:'en', value}, {_key:'es', value}]`.
- **Resolución en GROQ con fallback a inglés:**
  ```groq
  "title": coalesce(title[_key == $lang][0].value, title[_key == "en"][0].value)
  ```
  Todas las queries reciben el parámetro `$lang`. Con flag OFF, `$lang = "en"` siempre.
- **Caché/revalidación:** se mantiene el patrón obligatorio `next: {tags, revalidate}`.
  Los tags por tipo no cambian; la variación por idioma la cubre la clave de fetch (los
  params forman parte de la clave de caché). Revisar `app/api/revalidate/route.ts` por
  si algún tag derivado debe contemplar idioma.

#### Migración Sanity

- El inglés existente **ya es la base**: un script de migración envuelve cada valor
  actual como `{_key:'en', value: <valor actual>}`. Sin pérdida, sin riesgo.
- **Excepción B2B:** los componentes/área B2B recientes están redactados en español.
  Para esos campos el trabajo es inverso: redactar el **inglés base** y mover el español
  actual al slot `es`. Es una porción acotada (registro + área profesional).

### 4b. Contenido Shopify (título, descripción, opciones de producto)

- Traducción gestionada con la app **Translate & Adapt** de Shopify.
- Consumo con **`@inContext(language: $language, country: $country)`** en todas las
  queries Storefront relevantes (`lib/shopify.js`).
- El título de PDP/cards pasa a resolverse vía Shopify `@inContext` (en lugar del
  `store.title` base sincronizado en Sanity) cuando el locale lo requiera.
- Requiere instalar Translate & Adapt y publicar las traducciones de catálogo.

### 4c. Textos de interfaz (hardcodeados)

- Diccionario propio ligero (sin dependencia tipo next-intl, acorde al estilo lean del
  proyecto y al routing custom):
  - `lib/i18n/dictionaries/en.json` y `lib/i18n/dictionaries/es.json`.
  - Helper `getDictionary(locale)` (server) + accessor tipado.
- Trabajo mecánico: extraer los strings actuales de los componentes, dejar el **inglés
  como base** y rellenar `es`. (Para los strings B2B, que hoy están en español, el
  inglés se redacta nuevo y el español pasa al diccionario `es`.)

---

## 5. Moneda / Shopify Markets (preparado, no activado)

- **Esta fase:**
  - Las queries Shopify incorporan `@inContext(country: $country, language: $language)`.
  - `$country` por defecto a un país base (a confirmar en el plan: p. ej. `ES`).
  - Los precios se renderizan desde el `currencyCode`/money de Shopify, **auditando y
    eliminando cualquier `€` hardcodeado** en componentes.
- **Fase posterior:** geo-detección de país + selector de moneda al abrir Markets.
  Activación por configuración, sin reescribir queries.

---

## 6. SEO

- `alternates.languages` (en/es) y `canonical` por locale en cada `generateMetadata`.
- `hreflang` solo se emite con el flag ON.
- `sitemap.xml` incluye ambos idiomas cuando el flag está ON; solo inglés cuando OFF.
- `<html lang>` refleja el locale activo.

---

## 7. Fases y rollout

- **Fase 1 (este spec):** toda la infraestructura, flag **OFF** por defecto.
  - Middleware + `getLocale` + `localizedHref` + selector (oculto con flag OFF).
  - Conversión de campos Sanity a internationalized arrays + script de migración.
  - GROQ con `$lang` y `coalesce($lang, 'en')`.
  - `@inContext` en queries Shopify + render de precios por `currencyCode`.
  - Diccionario de UI EN/ES.
  - SEO `hreflang`/`canonical`/sitemap condicionados al flag.
  - Con flag OFF: el sitio sirve inglés = comportamiento actual, **riesgo cero**.
- **Fase 2:** traducir todo en los admin → flip de `NEXT_PUBLIC_I18N_ES` a ON cuando el
  español esté completo y revisado.
- **Fase 3 (futuro):** activar moneda/Shopify Markets.

---

## 8. Áreas de código afectadas (alto nivel)

- **Nuevo:** `middleware.ts`, `lib/i18n/` (locale types, `getLocale`, `localizedHref`,
  `getDictionary`, diccionarios `en.json`/`es.json`), componente selector de idioma.
- **Sanity:** schemas (envolver campos en internationalized arrays), `sanity.config.ts`
  (plugin), todas las queries en `sanity/queries/` (param `$lang` + `coalesce`), script
  de migración, revisión de `app/api/revalidate/route.ts`.
- **Shopify:** `lib/shopify.js` (`@inContext` + params `language`/`country`),
  `lib/product/buildProductView.ts` (fuente de título traducido), componentes de precio
  (render por `currencyCode`).
- **Frontend:** `<Link>` internos → `localizedHref`; componentes con strings → diccionario;
  `app/(frontend)/layout.tsx` (`<html lang>`, dictionary provider si aplica);
  `generateMetadata` de cada página (alternates/canonical); `sitemap`.

---

## 9. Riesgos y decisiones abiertas

- **País base para `@inContext`** (afecta moneda por defecto en esta fase): confirmar en
  el plan (propuesto `ES`).
- **Título de producto traducido:** confirmar si se sirve siempre vía Shopify
  `@inContext` o solo cuando `locale === 'es'`, para minimizar llamadas.
- **Volumen del diccionario de UI:** la extracción de strings es mecánica pero amplia;
  conviene un inventario en el plan para no dejar textos sin externalizar.
- **`@sanity/internationalized-array` vs migración:** validar que la conversión de los
  campos existentes no rompe queries que aún no se hayan adaptado (orden de despliegue
  de los cambios de schema + queries debe ser coordinado).

---

## 10. Testing

- Unit: `getLocale` (cabecera/fallback), `localizedHref` (en raíz vs `/es`), resolución
  de diccionario, helper de fallback GROQ (mock).
- Middleware: rutas con/sin `/es`, `Accept-Language`, cookie `NEXT_LOCALE`, flag OFF/ON.
- Integración GROQ: campo con `es` presente → devuelve `es`; sin `es` → fallback `en`.
- Regresión flag OFF: con `NEXT_PUBLIC_I18N_ES` ausente, las rutas, queries y SEO se
  comportan como hoy (solo inglés).
