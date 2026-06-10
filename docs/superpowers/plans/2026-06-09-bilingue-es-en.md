# Bilingüe ES/EN (idioma + mercado) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir mikmax.com en un sitio bilingüe español (default) + inglés, con idioma y mercado (moneda/precios vía Shopify Markets), preparado para convivir con contenido a medio traducir mediante fallback automático a español.

**Architecture:** Dos ejes **independientes**:
- **Idioma** (`es`/`en`): `next-intl` con segmento de ruta `[locale]` y `localePrefix: 'as-needed'` (español sin prefijo, inglés bajo `/en`). Define UI, contenido de Sanity (field-level i18n con `coalesce($lang, es)`) y `@inContext(language:)` de Shopify.
- **Market/moneda** (país → moneda): NO depende del idioma. Se determina por geolocalización por IP al entrar y por la elección del usuario en el footer (entre las monedas ofrecidas en `settings.footer.regions`). Persiste en cookie `mikmax_market` y alimenta `@inContext(country:)` de Shopify (precios/moneda por mercado) y el formato de importes.

Localización Sanity a nivel de campo con tipos `localeString`/`localeText`/`localeBlock` resueltos en GROQ con fallback automático. SEO con `hreflang` y canónicas por locale (de idioma; el market no genera URLs distintas).

**Tech Stack:** Next.js 15 App Router, next-intl v4, Sanity v3 (field-level i18n), Shopify Storefront API 2025-10 (`@inContext`), SCSS, TypeScript.

**Restricción transversal (periodo de transición):** En cada fase, todo dato traducible DEBE caer a español cuando el inglés no existe. Ninguna pantalla puede quedar vacía mientras el cliente sube traducciones. Esto se valida explícitamente en las tareas marcadas con 🔁.

**Verificación:** El proyecto **no tiene framework de tests** (no hay script `test`). La verificación de cada tarea es: `npm run typecheck`, `npm run lint`, `npm run build` y comprobación manual en navegador en `es` y `en`. Donde un paso dice "Verifica", ejecuta el comando indicado y confirma la salida esperada antes de continuar.

---

## Decisiones cerradas (con el cliente / dueño del proyecto)

1. **Idiomas:** `es` (default, sin prefijo de URL), `en` (prefijo `/en`).
2. **Alcance:** idioma + mercado (moneda/precios por región vía Shopify Markets). **Idioma y market son ejes independientes** — un usuario puede estar en `en` con moneda `EUR`, o en `es` con `USD`.
3. **Market/moneda:** determinado por (a) geolocalización por IP al entrar (default) y (b) selección del usuario en el footer entre las regiones ofrecidas. NO se deriva del idioma. Persiste en cookie `mikmax_market`. Las regiones ofrecidas y la default vienen de `settings.footer.regions[]` (`code` = CountryCode ISO de Shopify, `currency`, `label`, `isDefault`).
4. **Productos:** traducción vía Shopify Translate & Adapt + `@inContext(language, country)`.
5. **Fallback:** a nivel de campo con `coalesce`. Un solo documento Sanity por entidad; el inglés que falte cae a español.
6. **URL:** prefijo de ruta solo por idioma (`/en/...`), español canónico sin prefijo. El market NO genera URLs distintas (vive en cookie), así que no afecta a SEO/canónicas.

## Prerrequisitos externos (NO son tareas de código — bloquean Fase 4 y 6)

- [ ] **Cliente/plataforma:** Activar **Shopify Markets** con una región/idioma `EN` y la moneda objetivo. Instalar/activar **Translate & Adapt** (o app equivalente) y publicar al menos las traducciones de catálogo de prueba.
- [ ] **Cliente/plataforma:** Confirmar el `country` (ISO, p.ej. `US` o `GB`) que define la moneda del mercado EN, y la moneda del mercado ES (`ES` → `EUR`).
- [ ] **Plataforma:** En Sanity, decidir si se instala `@sanity/document-internationalization` (NO se usa en este plan; usamos field-level) — dejar constancia de que se descarta.

> Las Fases 1–3 y 5 se pueden completar sin tocar Shopify ni esperar al cliente. La Fase 4 (idioma/moneda de Shopify) y la verificación final de contenido (Fase 6) dependen de los prerrequisitos.

---

## File Structure

**Nuevos archivos:**
- `i18n/routing.ts` — config de locales + helpers de navegación (`Link`, `redirect`, `usePathname`, `useRouter`, `getPathname`).
- `i18n/request.ts` — carga de mensajes por request para next-intl (Server).
- `middleware.ts` — middleware de next-intl (detección/redirección de locale).
- `messages/es.json` — diccionario UI español.
- `messages/en.json` — diccionario UI inglés.
- `sanity/schemas/objects/i18n/localeString.ts` — tipo objeto `{es, en}` string.
- `sanity/schemas/objects/i18n/localeText.ts` — tipo objeto `{es, en}` text.
- `sanity/schemas/objects/i18n/localeBlock.ts` — tipo objeto `{es, en}` Portable Text.
- `sanity/queries/fragments/locale.ts` — helper `localeField(name, lang)` que emite `"name": coalesce(name[$lang], name.es)`.
- `lib/i18n.ts` — constantes de idioma (`LOCALES`, `DEFAULT_LOCALE`, `localeToShopifyLanguage(locale)`, `localeToIntl(locale)`). **Solo idioma — sin país.**
- `lib/markets.ts` — eje de market/moneda: `MARKET_COOKIE`, tipo `Market`, `resolveMarketCode(regions, {cookieValue, geoCountry})` (puro), geo headers soportados.
- `lib/markets.server.ts` — `getActiveMarket()`: lee cookie (`next/headers`) + header de geo + `regions` de Sanity y devuelve el `{code, currency}` activo con fallback a `isDefault`.
- `context/marketContext.tsx` — `MarketProvider` cliente: estado del market seleccionado, escribe la cookie y hace `router.refresh()` al cambiar.
- `components/Layout/Footer/MarketSelector.tsx` — selector de región/moneda en el footer (lee `regions` de Sanity).

**Archivos modificados (principales):**
- `next.config.js` — plugin `next-intl`.
- `app/(frontend)/layout.tsx` → se mueve a `app/(frontend)/[locale]/layout.tsx` (html lang dinámico + `NextIntlClientProvider`).
- Todas las `page.tsx` bajo `app/(frontend)/` → reubicadas bajo `[locale]/` y reciben `params.locale`.
- `sanity/queries/**` — todas las funciones `get*` aceptan `lang` y lo pasan como `$lang` a GROQ; `next.tags` incluyen el idioma donde aplique.
- `sanity/schemas/**` — campos de texto editorial migrados a `localeString`/`localeText`/`localeBlock`.
- `lib/shopify.js` — `shopifyData` acepta contexto `{language, country}`; queries usan `@inContext`.
- `app/api/revalidate/route.ts` — sin cambios de tags por idioma (field-level mantiene un solo doc); se documenta por qué.
- ~15 componentes con strings hardcodeados → `useTranslations` / `getTranslations`.
- `utils/seoHelper.ts` — metadata localizada + `hreflang`.
- `app/sitemap.ts` (crear si no existe) — entradas por locale.

---

## FASE 1 — Fundación next-intl (routing + layout)

Objetivo: el sitio sirve `es` y `en` con un `[locale]` segment, sin traducir todavía nada. Al final de la fase, `/` y `/en/` renderizan la home (en español ambas, de momento).

### Task 1.1: Instalar next-intl

**Files:**
- Modify: `package.json` (vía npm)

- [ ] **Step 1: Instalar**

```bash
npm install next-intl@^4
```

- [ ] **Step 2: Verifica**

Run: `node -e "console.log(require('next-intl/package.json').version)"`
Expected: imprime una versión `4.x`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(i18n): add next-intl dependency"
```

### Task 1.2: Constantes de i18n compartidas

**Files:**
- Create: `lib/i18n.ts`

- [ ] **Step 1: Crear `lib/i18n.ts`**

```ts
// lib/i18n.ts
// Fuente única de verdad para locales y su mapeo a Shopify/Intl.

export const LOCALES = ['es', 'en'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'es'

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value)
}

// Idioma Shopify @inContext (LanguageCode). SOLO idioma — el country/moneda
// es un eje independiente que vive en lib/markets.ts.
const SHOPIFY_LANGUAGE: Record<Locale, string> = {
  es: 'ES',
  en: 'EN',
}
export function localeToShopifyLanguage(locale: Locale): string {
  return SHOPIFY_LANGUAGE[locale]
}

// Locale BCP-47 para Intl.NumberFormat (convención de formato de importes).
const INTL_LOCALE: Record<Locale, string> = {
  es: 'es-ES',
  en: 'en-US',
}
export function localeToIntl(locale: Locale): string {
  return INTL_LOCALE[locale]
}
```

- [ ] **Step 2: Verifica**

Run: `npx tsc --noEmit lib/i18n.ts`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/i18n.ts
git commit -m "feat(i18n): shared locale constants and Shopify/Intl mappings"
```

### Task 1.3: Routing + navegación next-intl

**Files:**
- Create: `i18n/routing.ts`

- [ ] **Step 1: Crear `i18n/routing.ts`**

```ts
// i18n/routing.ts
import {defineRouting} from 'next-intl/routing'
import {createNavigation} from 'next-intl/navigation'
import {LOCALES, DEFAULT_LOCALE} from '@/lib/i18n'

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Español sin prefijo (/shop), inglés con prefijo (/en/shop).
  localePrefix: 'as-needed',
})

// Reemplazos drop-in de next/link y next/navigation que respetan el locale.
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing)
```

- [ ] **Step 2: Verifica**

Run: `npm run typecheck`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add i18n/routing.ts
git commit -m "feat(i18n): next-intl routing config and navigation helpers"
```

### Task 1.4: Mensajes por request

**Files:**
- Create: `i18n/request.ts`
- Create: `messages/es.json`
- Create: `messages/en.json`

- [ ] **Step 1: Crear diccionarios iniciales** (semilla mínima; se completan en Fase 2)

`messages/es.json`:
```json
{
  "common": {
    "loading": "Cargando..."
  }
}
```

`messages/en.json`:
```json
{
  "common": {
    "loading": "Loading..."
  }
}
```

- [ ] **Step 2: Crear `i18n/request.ts`**

```ts
// i18n/request.ts
import {getRequestConfig} from 'next-intl/server'
import {hasLocale} from 'next-intl'
import {routing} from './routing'

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
```

- [ ] **Step 3: Verifica**

Run: `npm run typecheck`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add i18n/request.ts messages/
git commit -m "feat(i18n): per-request message loading + seed dictionaries"
```

### Task 1.5: Plugin en next.config.js

**Files:**
- Modify: `next.config.js`

- [ ] **Step 1: Envolver la config con el plugin**

Reemplaza el final del archivo (`module.exports = nextConfig`) por:

```js
const path = require('path');
const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
      SHOPIFY_STORE_DOMAIN: process.env.SHOPIFY_STORE_DOMAIN,
      SHOPIFY_STOREFRONT_ACCESSTOKEN: process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN,
    },
    images: {
      minimumCacheTTL: 2592000,
      remotePatterns: [
        {protocol: "https", hostname: "cdn.sanity.io"},
        {protocol: "https", hostname: "cdn.shopify.com"},
      ],
    },
    sassOptions: {
      includePaths: [path.join(__dirname, 'styles')],
    },
    reactStrictMode: false,
    trailingSlash: true,
  };

module.exports = withNextIntl(nextConfig);
```

- [ ] **Step 2: Verifica**

Run: `npm run build` (puede fallar más adelante por rutas; aquí solo confirmamos que el plugin carga). Si falla, debe ser por ausencia de `middleware.ts`/`[locale]`, no por sintaxis del config.

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "feat(i18n): wire next-intl plugin into next.config.js"
```

### Task 1.6: Middleware

**Files:**
- Create: `middleware.ts`

> ⚠️ `trailingSlash: true` + next-intl: el middleware de next-intl gestiona redirecciones de locale; con trailing slash activo hay que verificar manualmente que `/en` → `/en/` y que `/shop` no pierde el slash. Si aparece bucle de redirección, ver Task 6.4.

- [ ] **Step 1: Crear `middleware.ts`**

```ts
// middleware.ts
import createMiddleware from 'next-intl/middleware'
import {routing} from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Excluye API, assets estáticos, el Studio (/admin) y archivos con extensión.
  matcher: ['/((?!api|admin|_next|_vercel|studio|.*\\..*).*)'],
}
```

- [ ] **Step 2: Verifica matcher** — confirma que `/admin` y `/api/revalidate` quedan fuera (el Studio NO debe localizarse).

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add middleware.ts
git commit -m "feat(i18n): locale middleware (excludes admin/api/studio)"
```

### Task 1.7: Reubicar rutas bajo `[locale]` y layout localizado

**Files:**
- Move: todo el contenido de `app/(frontend)/` (excepto `globals.css` si está fuera) bajo `app/(frontend)/[locale]/`
- Modify: el layout para `html lang` dinámico + provider

> Estructura final:
> ```
> app/(frontend)/[locale]/layout.tsx
> app/(frontend)/[locale]/page.tsx            (home)
> app/(frontend)/[locale]/shop/...
> app/(frontend)/[locale]/products/[handle]/...
> app/(frontend)/[locale]/legal/...
> app/(frontend)/[locale]/looks/...
> app/(frontend)/[locale]/sets/...
> app/(frontend)/[locale]/search/...
> app/(frontend)/[locale]/[...slug]/...
> app/(frontend)/[locale]/not-found.tsx
> ```

- [ ] **Step 1: Mover archivos**

```bash
cd "app/(frontend)"
mkdir -p '[locale]'
git mv page.tsx '[locale]/page.tsx' 2>/dev/null || true
for d in shop products legal looks sets search not-found.tsx '[...slug]'; do
  [ -e "$d" ] && git mv "$d" "[locale]/$d"
done
git mv layout.tsx '[locale]/layout.tsx'
cd ../../
```

(Si `globals.css`/`styles` se importaban con rutas relativas `../`, habrá que ajustar a `../../` en el layout movido — ver Step 2.)

- [ ] **Step 2: Reescribir `app/(frontend)/[locale]/layout.tsx`**

```tsx
import '../../globals.css'
import type {Viewport} from 'next'
import {buildDefaultMetadata} from '@/utils/seoHelper'
import '../../../styles/main.scss'
import React, {Suspense} from 'react'
import {notFound} from 'next/navigation'
import {NextIntlClientProvider, hasLocale} from 'next-intl'
import {setRequestLocale} from 'next-intl/server'
import {routing} from '@/i18n/routing'
import type {Locale} from '@/lib/i18n'
import ShopProvider from '../../../context/shopContext'
import Analytics from '@/components/Common/Analytics/google'
import ConsentGate from '@/components/Common/Analytics/consentGate'
import FacebookPixel from '@/components/Common/Analytics/facebook'
import Hotjar from '@/components/Common/Analytics/hotjar'
import PinterestTag from '@/components/Common/Analytics/pinterest'
import AnalyticsRouteTracker from '@/components/Common/Analytics/AnalyticsRouteTracker'
import CookieConsent from '@/components/Common/CookieConsent/CookieConsent'
import {Header, AnnouncementBanner} from '@/components/Layout'
import FooterGate from '@/components/Layout/Footer/FooterGate'
import CartDrawer from '@/components/Layout/CartDrawer/CartDrawer'
import NewsletterPopup from '@/components/Layout/NewsletterPopup/NewsletterPopup'
import {getFooter} from '@/sanity/queries/common/footer'
import {getBanner} from '@/sanity/queries/common/banner'
import {getNewsletterPopup} from '@/sanity/queries/common/newsletterPopup'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}))
}

export async function generateMetadata({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params
  return buildDefaultMetadata(locale as Locale)
}

export const viewport: Viewport = {
  themeColor: 'transparent',
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{locale: string}>
}) {
  const {locale} = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  const lang = locale as Locale
  const [footerData, bannerData, newsletterPopupData] = await Promise.all([
    getFooter(lang),
    getBanner(lang),
    getNewsletterPopup(lang),
  ])

  return (
    <html lang={locale}>
      <body>
        <Suspense fallback={<div className="loader">Loading...</div>}>
          <NextIntlClientProvider>
            <ShopProvider>
              <AnnouncementBanner data={bannerData} />
              <Header />
              {children}
              <FooterGate data={footerData?.footer} />
              <CartDrawer />
              <CookieConsent />
              <NewsletterPopup data={newsletterPopupData} />
              {process.env.NODE_ENV === 'production' ? (
                <>
                  <Analytics />
                  <AnalyticsRouteTracker />
                  <ConsentGate category="analytics">
                    <Hotjar />
                  </ConsentGate>
                  <ConsentGate category="marketing">
                    <FacebookPixel />
                    <PinterestTag />
                  </ConsentGate>
                </>
              ) : null}
            </ShopProvider>
          </NextIntlClientProvider>
        </Suspense>
      </body>
    </html>
  )
}
```

> Nota: las firmas `getFooter(lang)`, `getBanner(lang)`, `getNewsletterPopup(lang)` y `buildDefaultMetadata(locale)` se implementan en Fases 2/3/5. Hasta entonces, esos `get*` ignoran el argumento (parámetro opcional), así que el layout compila igual.

- [ ] **Step 3: Verifica import paths** — Confirma que `../../globals.css` y `../../../styles/main.scss` resuelven desde la nueva ubicación. Ajusta el número de `../` si la estructura difiere.

Run: `npm run typecheck`
Expected: sin errores de módulo no encontrado.

- [ ] **Step 4: Añadir `setRequestLocale` en cada page server** — En cada `page.tsx` reubicada que sea Server Component, lee `params.locale` y llama `setRequestLocale(locale)` al inicio (requisito de next-intl para renderizado estático). Patrón:

```tsx
import {setRequestLocale} from 'next-intl/server'

export default async function Page({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params
  setRequestLocale(locale)
  // ...resto igual
}
```

Aplica a: `[locale]/page.tsx`, `[locale]/shop/page.tsx`, `[locale]/shop/[handle]/page.tsx`, `[locale]/products/[handle]/page.tsx`, `[locale]/legal/page.tsx`, `[locale]/legal/[section]/page.tsx`, `[locale]/looks/page.tsx`, `[locale]/looks/[slug]/page.tsx`, `[locale]/sets/page.tsx`, `[locale]/sets/[slug]/page.tsx`, `[locale]/search/page.tsx`, `[locale]/[...slug]/page.tsx`.

- [ ] **Step 5: Verifica build**

Run: `npm run build`
Expected: build OK; rutas generadas muestran variantes con y sin `/en`.

- [ ] **Step 6: Verifica manual**

Run: `npm run dev` y abre `http://localhost:3000/` y `http://localhost:3000/en/`.
Expected: ambas cargan la home (en español de momento; aún sin traducir). Sin bucles de redirección.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(i18n): move frontend routes under [locale] + localized root layout"
```

### Task 1.8: Migrar enlaces internos a `Link` localizado 🔁

**Files:**
- Modify: los 25 archivos que importan `next/link` y los que usan `useRouter`/`usePathname` de `next/navigation` para navegación interna.

> Regla: enlaces y navegación **internos** usan los helpers de `@/i18n/routing` (preservan el locale activo). Enlaces externos siguen con `<a>`. NO toques `next/navigation` cuando solo se use para leer `searchParams` o `notFound()`.

- [ ] **Step 1: Sustituir imports de `next/link`**

Para cada archivo: cambia
```tsx
import Link from 'next/link'
```
por
```tsx
import {Link} from '@/i18n/routing'
```
El uso (`<Link href="/shop">`) no cambia: el helper añade el prefijo de locale automáticamente.

- [ ] **Step 2: Sustituir `useRouter`/`usePathname` de navegación**

En componentes que navegan programáticamente (`router.push('/shop')`), cambia:
```tsx
import {useRouter, usePathname} from 'next/navigation'
```
por:
```tsx
import {useRouter, usePathname} from '@/i18n/routing'
```
Archivos candidatos (verificar uso real antes de tocar): `components/Layout/MobileMenu/MobileMenu.tsx`, `components/Layout/Header/SearchOverlay.tsx`, `components/Layout/Header/HeaderClient.tsx`, `components/Shop/ShopToolbar/FilterTrigger.tsx`, `components/Shop/FilterDrawer/FilterDrawer.tsx`, `components/Product/ProductDetail.tsx`, `components/Legal/LegalSidebar.tsx`, `components/Layout/Footer/FooterGate.tsx`.

> ⚠️ `AnalyticsRouteTracker.tsx` usa `usePathname` para tracking → **déjalo en `next/navigation`** (quiere la ruta real con prefijo). No migrar.

- [ ] **Step 3: Verifica**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 4: Verifica manual** — En `/en/`, navega por menú, footer, fichas de producto y buscador. Confirma que todos los enlaces mantienen el prefijo `/en/` y ninguno salta a español.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(i18n): use locale-aware Link/router for internal navigation"
```

### Task 1.9: Capa de market/moneda (geo + cookie, independiente del idioma)

**Files:**
- Create: `lib/markets.ts`
- Create: `lib/markets.server.ts`

> El market es independiente del idioma. Prioridad de resolución: **(1)** cookie `mikmax_market` (elección explícita del usuario), **(2)** geolocalización por IP (header de plataforma) si el país está entre las regiones ofrecidas, **(3)** región `isDefault` de `settings.footer.regions`.
>
> **Hosting: Vercel.** El geo-IP llega en el header `x-vercel-ip-country` (ISO 3166-1 alpha-2), presente automáticamente en todas las requests de producción. En `npm run dev` local NO existe, así que en desarrollo el market caerá a la cookie o a la región `isDefault` — comportamiento esperado. Mantengo `cf-ipcountry` como segundo fallback por si en algún momento se mete Cloudflare delante.

- [ ] **Step 1: Crear `lib/markets.ts`** (lógica pura, sin dependencias de servidor)

```ts
// lib/markets.ts
export const MARKET_COOKIE = 'mikmax_market'

// Headers de geo-IP por orden de preferencia. Vercel inyecta x-vercel-ip-country
// en producción; cf-ipcountry queda como fallback si se antepone Cloudflare.
export const GEO_HEADERS = ['x-vercel-ip-country', 'cf-ipcountry'] as const

export type Region = {
  code: string // CountryCode ISO (Shopify @inContext country): 'ES', 'US', 'GB'...
  label: string
  currency: string
  isDefault?: boolean
}

export type Market = {code: string; currency: string}

// Resuelve el market activo a partir de las regiones ofrecidas + señales.
export function resolveMarket(
  regions: Region[],
  signals: {cookieValue?: string | null; geoCountry?: string | null},
): Market {
  const offered = regions ?? []
  const byCode = (code?: string | null) =>
    code ? offered.find((r) => r.code.toUpperCase() === code.toUpperCase()) : undefined

  const chosen =
    byCode(signals.cookieValue) ??
    byCode(signals.geoCountry) ??
    offered.find((r) => r.isDefault) ??
    offered[0]

  // Fallback duro si Sanity aún no define regiones.
  if (!chosen) return {code: 'ES', currency: 'EUR'}
  return {code: chosen.code, currency: chosen.currency}
}
```

- [ ] **Step 2: Crear `lib/markets.server.ts`** (lee cookie + header de geo + regiones de Sanity)

```ts
// lib/markets.server.ts
import {cookies, headers} from 'next/headers'
import {MARKET_COOKIE, GEO_HEADERS, resolveMarket, type Market} from './markets'
import {getSettings} from '@/sanity/queries/common/settings'
import type {Locale} from './i18n'

export async function getActiveMarket(lang: Locale = 'es'): Promise<Market> {
  const [cookieStore, headerStore, settings] = await Promise.all([
    cookies(),
    headers(),
    getSettings(lang),
  ])
  const cookieValue = cookieStore.get(MARKET_COOKIE)?.value ?? null
  let geoCountry: string | null = null
  for (const h of GEO_HEADERS) {
    const v = headerStore.get(h)
    if (v) {
      geoCountry = v
      break
    }
  }
  const regions = settings.footer?.regions ?? []
  return resolveMarket(regions, {cookieValue, geoCountry})
}
```

> Nota: `regions` ya existe en el schema de `settings.footer` y en la query `getSettings` (campos `code`, `label`, `currency`, `isDefault`). No requiere cambios de schema.

- [ ] **Step 3: Verifica**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/markets.ts lib/markets.server.ts
git commit -m "feat(market): geo+cookie market resolution independent of language"
```

### Task 1.10: MarketProvider y montaje en el layout

**Files:**
- Create: `context/marketContext.tsx`
- Modify: `app/(frontend)/[locale]/layout.tsx`

- [ ] **Step 1: Crear `context/marketContext.tsx`**

```tsx
'use client'
import {createContext, useContext, useCallback} from 'react'
import {setCookie} from 'cookies-next'
import {useRouter} from '@/i18n/routing'
import {MARKET_COOKIE, type Market, type Region} from '@/lib/markets'

type MarketContextValue = {
  market: Market
  regions: Region[]
  setMarket: (code: string) => void
}

const MarketContext = createContext<MarketContextValue | null>(null)

export function MarketProvider({
  market,
  regions,
  children,
}: {
  market: Market
  regions: Region[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const setMarket = useCallback(
    (code: string) => {
      setCookie(MARKET_COOKIE, code, {maxAge: 60 * 60 * 24 * 365, path: '/'})
      // Refresca los Server Components para re-fetch de Shopify con el nuevo país.
      router.refresh()
    },
    [router],
  )
  return (
    <MarketContext.Provider value={{market, regions, setMarket}}>
      {children}
    </MarketContext.Provider>
  )
}

export function useMarket() {
  const ctx = useContext(MarketContext)
  if (!ctx) throw new Error('useMarket must be used within MarketProvider')
  return ctx
}
```

- [ ] **Step 2: Montar el provider en el layout** — En `app/(frontend)/[locale]/layout.tsx`, resuelve el market en servidor y envuelve los hijos. Añade a los imports y al `Promise.all` existente:

```tsx
import {getActiveMarket} from '@/lib/markets.server'
import {MarketProvider} from '../../../context/marketContext'
// ...
  const lang = locale as Locale
  const [footerData, bannerData, newsletterPopupData, market] = await Promise.all([
    getFooter(lang),
    getBanner(lang),
    getNewsletterPopup(lang),
    getActiveMarket(lang),
  ])
  const regions = footerData?.footer?.regions ?? []
```

Y envuelve dentro de `ShopProvider`:

```tsx
<ShopProvider>
  <MarketProvider market={market} regions={regions}>
    {/* ...AnnouncementBanner, Header, children, etc... */}
  </MarketProvider>
</ShopProvider>
```

- [ ] **Step 3: Verifica**

Run: `npm run build`
Expected: OK.

- [ ] **Step 4: Verifica manual** — Con la cookie `mikmax_market` ausente, la región resuelta debe ser la `isDefault` de Sanity (o geo si el hosting lo provee).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(market): MarketProvider mounted in localized layout"
```

---

## FASE 2 — Diccionarios UI + extracción de strings

Objetivo: cero strings hardcodeados visibles. Toda la UI lee de `messages/*.json`. Fallback: si una clave falta en `en.json`, next-intl emite warning pero NO rompe; aun así completamos ambos diccionarios.

### Task 2.1: Poblar diccionarios con todas las claves de UI

**Files:**
- Modify: `messages/es.json`, `messages/en.json`

- [ ] **Step 1: Definir el árbol de claves completo**

Inventario de strings detectado (agrupado por namespace). Escribe AMBOS archivos con estas claves. Español = texto actual; inglés = traducción.

`messages/es.json`:
```json
{
  "common": {
    "loading": "Cargando...",
    "close": "Cerrar"
  },
  "cart": {
    "title": "Carrito",
    "closeCart": "Cerrar carrito",
    "empty": "Tu carrito está vacío.",
    "viewItems": "Ver artículos",
    "checkout": "Ir a pagar",
    "decreaseQuantity": "Disminuir cantidad",
    "increaseQuantity": "Aumentar cantidad",
    "removeItem": "Eliminar artículo"
  },
  "product": {
    "tabDescription": "Descripción",
    "tabMaterial": "Propiedades del material",
    "tabWashing": "Recomendaciones de lavado",
    "tabUsage": "Uso recomendado",
    "noInfo": "Aún no hay información disponible.",
    "closeInfo": "Cerrar información",
    "productInfo": "Información del producto"
  },
  "nav": {
    "mainMenu": "Menú principal",
    "closeMenu": "Cerrar menú",
    "search": "Buscar",
    "mobileMenu": "Menú móvil",
    "openMenu": "Abrir menú",
    "searchProducts": "Buscar productos",
    "closeBanner": "Cerrar banner"
  },
  "newsletter": {
    "heading": "Mantén el contacto",
    "subtitle": "Suscríbete a nuestra newsletter para recibir novedades."
  },
  "search": {
    "metaTitle": "Buscar | Mikmax"
  }
}
```

`messages/en.json`:
```json
{
  "common": {
    "loading": "Loading...",
    "close": "Close"
  },
  "cart": {
    "title": "Cart",
    "closeCart": "Close cart",
    "empty": "Your cart is empty.",
    "viewItems": "View items",
    "checkout": "Go to checkout",
    "decreaseQuantity": "Decrease quantity",
    "increaseQuantity": "Increase quantity",
    "removeItem": "Remove item"
  },
  "product": {
    "tabDescription": "Description",
    "tabMaterial": "Material properties",
    "tabWashing": "Washing recommendations",
    "tabUsage": "Recommended use",
    "noInfo": "No information available yet.",
    "closeInfo": "Close information",
    "productInfo": "Product information"
  },
  "nav": {
    "mainMenu": "Main menu",
    "closeMenu": "Close menu",
    "search": "Search",
    "mobileMenu": "Mobile menu",
    "openMenu": "Open menu",
    "searchProducts": "Search products",
    "closeBanner": "Close banner"
  },
  "newsletter": {
    "heading": "Keep in touch",
    "subtitle": "Subscribe to our newsletter to get the latest news."
  },
  "search": {
    "metaTitle": "Search | Mikmax"
  }
}
```

- [ ] **Step 2: Verifica** que ambos JSON tienen exactamente las mismas claves.

Run: `node -e "const a=Object.keys(require('./messages/es.json')),b=Object.keys(require('./messages/en.json'));console.log(JSON.stringify(a)===JSON.stringify(b)?'OK':'MISMATCH', a, b)"`
Expected: `OK`.

- [ ] **Step 3: Commit**

```bash
git add messages/
git commit -m "feat(i18n): complete UI dictionaries (es/en)"
```

### Task 2.2: Sustituir strings en componentes Client

**Files:**
- Modify: `components/Layout/CartDrawer/CartDrawer.tsx`
- Modify: `components/Product/shared/ProductInfoPanel.tsx`
- Modify: `components/Product/Desktop/DesktopToolbar.tsx`
- Modify: `components/Product/Mobile/MobileToolbar.tsx`
- Modify: `components/Layout/MobileMenu/MobileMenu.tsx`
- Modify: `components/Layout/Header/SearchOverlay.tsx`
- Modify: `components/Layout/Header/HeaderClient.tsx`
- Modify: `components/Layout/AnnouncementBanner/AnnouncementBanner.tsx`
- Modify: `components/Layout/Footer/NewsletterForm.tsx`

> Patrón para Client Components (`'use client'`):
> ```tsx
> import {useTranslations} from 'next-intl'
> // dentro del componente:
> const t = useTranslations('cart')
> // uso: {t('title')}, aria-label={t('closeCart')}
> ```

- [ ] **Step 1: Migrar `CartDrawer.tsx`** — Añade `const t = useTranslations('cart')`. Sustituye las cadenas literales por `t('title')`, `t('closeCart')`, `t('empty')`, `t('viewItems')`, `t('checkout')`, `t('decreaseQuantity')`, `t('increaseQuantity')`, `t('removeItem')`. (El formato de moneda se trata en Fase 4 — no tocar `Intl.NumberFormat` aquí.)

- [ ] **Step 2: Migrar `ProductInfoPanel.tsx`** — `const t = useTranslations('product')`. Tabs → `t('tabDescription')`, `t('tabMaterial')`, `t('tabWashing')`, `t('tabUsage')`; estados → `t('noInfo')`, `t('closeInfo')`.

- [ ] **Step 3: Migrar `DesktopToolbar.tsx` y `MobileToolbar.tsx`** — `const t = useTranslations('product')`. `t('closeInfo')`, `t('productInfo')`.

- [ ] **Step 4: Migrar menú/header/banner** — En `MobileMenu.tsx`, `SearchOverlay.tsx`, `HeaderClient.tsx`, `AnnouncementBanner.tsx`: `const t = useTranslations('nav')`. Sustituye aria-labels y textos por las claves `nav.*` correspondientes.

- [ ] **Step 5: Migrar `NewsletterForm.tsx`** — Los defaults hardcodeados pasan a `useTranslations('newsletter')` (`t('heading')`, `t('subtitle')`) cuando no llegue valor desde Sanity. Si el prop de Sanity existe, ese gana (el contenido de Sanity ya estará localizado tras Fase 3).

- [ ] **Step 6: Verifica**

Run: `npm run build`
Expected: build OK, sin warnings de `MISSING_MESSAGE`.

- [ ] **Step 7: Verifica manual** — En `/` y `/en/`: abre el carrito, el menú móvil, el buscador, la ficha de producto. Confirma que todos los textos cambian de idioma.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(i18n): translate client component UI strings"
```

### Task 2.3: Strings en Server Components / metadata

**Files:**
- Modify: `app/(frontend)/[locale]/search/page.tsx`

> Patrón para Server Components:
> ```tsx
> import {getTranslations} from 'next-intl/server'
> const t = await getTranslations({locale, namespace: 'search'})
> ```

- [ ] **Step 1: Migrar el título de `search/page.tsx`**

```tsx
export async function generateMetadata({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params
  const t = await getTranslations({locale, namespace: 'search'})
  return {title: t('metaTitle')}
}
```

- [ ] **Step 2: Verifica**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(i18n): localize server-rendered metadata strings"
```

---

## FASE 3 — Localización de contenido Sanity (field-level + fallback)

Objetivo: los campos editoriales de Sanity guardan `{es, en}` y las queries devuelven el idioma activo con fallback a `es`. El cliente puede subir inglés gradualmente sin romper nada.

### Task 3.1: Tipos objeto de localización

**Files:**
- Create: `sanity/schemas/objects/i18n/localeString.ts`
- Create: `sanity/schemas/objects/i18n/localeText.ts`
- Create: `sanity/schemas/objects/i18n/localeBlock.ts`
- Modify: `sanity/schemas/index.ts` (registrar los 3 tipos)

- [ ] **Step 1: Crear `localeString.ts`**

```ts
// sanity/schemas/objects/i18n/localeString.ts
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'localeString',
  title: 'Texto localizado',
  type: 'object',
  fields: [
    defineField({name: 'es', title: 'Español', type: 'string'}),
    defineField({name: 'en', title: 'English', type: 'string'}),
  ],
  options: {collapsible: true, collapsed: false},
})
```

- [ ] **Step 2: Crear `localeText.ts`** (igual pero `type: 'text'`)

```ts
// sanity/schemas/objects/i18n/localeText.ts
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'localeText',
  title: 'Texto largo localizado',
  type: 'object',
  fields: [
    defineField({name: 'es', title: 'Español', type: 'text', rows: 4}),
    defineField({name: 'en', title: 'English', type: 'text', rows: 4}),
  ],
  options: {collapsible: true, collapsed: false},
})
```

- [ ] **Step 3: Crear `localeBlock.ts`** (Portable Text por idioma; usa el tipo `body` existente)

```ts
// sanity/schemas/objects/i18n/localeBlock.ts
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'localeBlock',
  title: 'Contenido enriquecido localizado',
  type: 'object',
  fields: [
    defineField({name: 'es', title: 'Español', type: 'body'}),
    defineField({name: 'en', title: 'English', type: 'body'}),
  ],
  options: {collapsible: true, collapsed: false},
})
```

- [ ] **Step 4: Registrar en `sanity/schemas/index.ts`** — Importa los 3 y añádelos al array de tipos exportado (junto al resto de objects).

- [ ] **Step 5: Verifica** — Arranca el Studio (`npm run dev` → `/admin`). Confirma que no hay errores de schema en consola.

- [ ] **Step 6: Commit**

```bash
git add sanity/schemas/objects/i18n/ sanity/schemas/index.ts
git commit -m "feat(sanity): localeString/localeText/localeBlock i18n object types"
```

### Task 3.2: Helper GROQ de resolución con fallback

**Files:**
- Create: `sanity/queries/fragments/locale.ts`

- [ ] **Step 1: Crear el helper**

```ts
// sanity/queries/fragments/locale.ts
// Emite una proyección GROQ que devuelve el campo en el idioma activo,
// cayendo a español si el idioma activo no tiene valor. Requiere $lang
// como parámetro de la query.
//
// localeField('title')  =>  "title": coalesce(title[$lang], title.es)

export function localeField(field: string, alias = field): string {
  return `"${alias}": coalesce(${field}[$lang], ${field}.es)`
}

// Para Portable Text localizado (localeBlock): selecciona el array correcto.
export function localeBlockField(field: string, alias = field): string {
  return `"${alias}": coalesce(${field}[$lang], ${field}.es)`
}
```

- [ ] **Step 2: Verifica**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add sanity/queries/fragments/locale.ts
git commit -m "feat(sanity): GROQ locale field helper with es fallback"
```

### Task 3.3: Migrar schemas editoriales a tipos localizados 🔁

**Files (campos de texto editorial a migrar — un commit por documento):**
- Modify: `sanity/schemas/documents/page.ts` (`title`, `body`→localeBlock)
- Modify: `sanity/schemas/documents/product.tsx` (campos editoriales: descripción, propiedades material, recomendaciones lavado, uso recomendado)
- Modify: `sanity/schemas/objects/global/footer.ts` (titles de columnas, newsletter)
- Modify: `sanity/schemas/objects/global/announcementBanner.ts` (`text`)
- Modify: `sanity/schemas/objects/global/newsletterPopup.ts` (`heading`, `legalText`)
- Modify: `sanity/schemas/objects/seo/*.tsx` (`title`, `description`)
- Modify: `sanity/schemas/singletons/legal.ts`, `sanity/schemas/singletons/home.ts` (textos editoriales libres)
- Modify: bloques con texto en `sanity/schemas/objects/blocks/*` y `objects/module/*` (richText, callout, callToAction, accordion, etc.)

> ⚠️ **Migración de datos existentes:** cambiar `type: 'string'` → `type: 'localeString'` cambia la forma del dato (de `"texto"` a `{es: "texto"}`). El contenido español YA existente quedará como string plano y dejará de leerse hasta migrarlo. Antes de aplicar en producción, consulta la skill **sanity-schema-builder** para el patrón de migración (script que envuelve `valor` → `{es: valor}`). En cada campo migrado, programa el script de migración correspondiente.

> Por la restricción de transición: NO se requiere rellenar `en` para que el sitio funcione — el `coalesce` de la query cae a `es`. Solo es obligatorio que el `es` esté correctamente migrado a `{es: ...}`.

- [ ] **Step 1: `page.ts`** — Cambia `title` de `string` a `localeString`. Cambia `body` de `body` a `localeBlock`. Conserva `slug` SIN localizar (el slug se mantiene único; la URL traducida es responsabilidad del routing, no del slug — decisión documentada para evitar duplicar handles de Shopify).

```ts
// title
defineField({
  name: 'title',
  title: 'Title',
  type: 'localeString',
  validation: (Rule) => Rule.required(),
  group: 'editorial',
}),
// body
defineField({
  name: 'body',
  title: 'Body',
  type: 'localeBlock',
  group: 'editorial',
}),
```

- [ ] **Step 2: Escribir script de migración para `page`** — Crea `scripts/migrate-page-i18n.ts` siguiendo el patrón de sanity-schema-builder: para cada `page`, si `title` es string, set `title = {es: title}`; idem `body`. Documenta cómo ejecutarlo (`npx sanity exec scripts/migrate-page-i18n.ts --with-user-token`).

- [ ] **Step 3: Repetir Steps 1–2 por cada documento/objeto de la lista de Files**, un commit por documento, cada uno con su script de migración. Para los campos de SEO (`seo.title`, `seo.description`) usa `localeString`/`localeText`.

- [ ] **Step 4: Verifica Studio** — Cada campo migrado muestra dos subcampos (Español / English) sin error.

- [ ] **Step 5: Commit por documento**

```bash
git add sanity/schemas/documents/page.ts scripts/migrate-page-i18n.ts
git commit -m "feat(sanity): localize page title/body + migration script"
```

### Task 3.4: Propagar `lang` por toda la capa de queries 🔁

**Files:**
- Modify: `sanity/queries/queries/page.ts`, `home.ts`, `legal.ts`, `look.ts`, `set.ts`, `shop.ts`, `product.ts`
- Modify: `sanity/queries/common/settings.ts`, `footer.ts`, `banner.ts`, `newsletterPopup.ts`, `header.ts`, `defaultSEO.ts`
- Modify: `sanity/queries/fragments/seo.ts`, `pageBuilder.ts`, `body.ts`, `cards.ts` (proyecciones que tocan texto)

> Patrón: cada función `get*` recibe `lang: Locale` (con default `'es'`), pasa `{...vars, lang}` como variables a `client.fetch`, y usa `localeField()` en la proyección. El parámetro `$lang` debe estar declarado implícitamente al pasarlo en el objeto de variables.

- [ ] **Step 1: Migrar `getPage`** (`sanity/queries/queries/page.ts`)

```ts
import {groq} from 'next-sanity'
import {client} from '..'
import {seo} from '../fragments/seo'
import {pageBuilderProjection} from '../fragments/pageBuilder'
import {localeField, localeBlockField} from '../fragments/locale'
import type {Locale} from '@/lib/i18n'
import type {PageBuilderBlock} from '@/sanity/types'

export type PageData = {
  _id: string
  title: string
  slug: string
  pageBuilder?: PageBuilderBlock[]
  body?: unknown
  seo?: {title?: string; description?: string; image?: unknown}
}

export async function getPageSlugs(): Promise<string[]> {
  const slugs = await client.fetch<string[]>(
    groq`*[_type == "page" && defined(slug.current)].slug.current`,
    {},
    {next: {tags: ['page'], revalidate: 3600}},
  )
  return slugs ?? []
}

export async function getPage(slug: string, lang: Locale = 'es'): Promise<PageData | null> {
  const result = await client.fetch<PageData | null>(
    groq`*[_type == "page" && slug.current == $slug][0]{
      _id,
      ${localeField('title')},
      "slug": slug.current,
      ${localeBlockField('body')},
      pageBuilder[]{
        _key,
        _type,
        ${pageBuilderProjection}
      },
      seo{
        ${seo}
      }
    }`,
    {slug, lang},
    {next: {tags: ['page', 'product', 'look', `page:${slug}`], revalidate: 3600}},
  )
  return result ?? null
}
```

> ⚠️ `pageBuilderProjection` y `seo` deben actualizarse en Step 3 para usar `localeField` internamente; al recibir `$lang` desde la query padre, lo heredan automáticamente.

- [ ] **Step 2: Migrar `getSettings`/`getFooter`/`getBanner`/`getNewsletterPopup`** — Añade `lang` a las firmas. En `settings.ts`, envuelve los campos de texto (`banner.text`, `footer.columns[].title`, `newsletterPopup.heading`, `newsletterPopup.legalText`, `seo.*`) con `localeField`/`localeBlockField` y pasa `{lang}` en variables. `getFooter(lang)` reenvía a `getSettings(lang)`.

```ts
// footer.ts
import type {FooterData} from '@/sanity/types'
import type {Locale} from '@/lib/i18n'
import {getSettings} from './settings'

export async function getFooter(lang: Locale = 'es'): Promise<FooterData> {
  const settings = await getSettings(lang)
  return {footer: settings.footer}
}
```

- [ ] **Step 3: Migrar fragments** (`seo.ts`, `pageBuilder.ts`, `body.ts`, `cards.ts`) — Sustituye proyecciones de texto plano por `localeField(...)`. Como son fragmentos interpolados en queries que ya pasan `$lang`, no necesitan firma propia.

- [ ] **Step 4: Actualizar todas las llamadas en `page.tsx`** — Cada Server Component pasa `locale` a su query: `getPage(slug, locale as Locale)`, `getHome(locale)`, etc.

- [ ] **Step 5: Verifica**

Run: `npm run build`
Expected: OK.

- [ ] **Step 6: Verifica manual de fallback** — En el Studio, deja una `page` con `title.en` vacío pero `title.es` lleno. Abre `/en/<slug>/`. Debe mostrar el título en español (fallback), no vacío.

- [ ] **Step 7: Commit** (uno por archivo de query)

```bash
git add sanity/queries/
git commit -m "feat(sanity): thread $lang through GROQ queries with es fallback"
```

### Task 3.5: Decisión de revalidación por idioma

**Files:**
- Modify: `app/api/revalidate/route.ts` (solo comentario documental)

- [ ] **Step 1: Documentar** — Como usamos field-level i18n (un único documento por entidad), publicar en Sanity invalida el mismo tag sin importar el idioma. NO se necesitan tags por locale. Añade un comentario al inicio del handler:

```ts
// i18n: usamos localización a nivel de campo (un documento por entidad),
// por lo que los tags de revalidación NO se desdoblan por idioma. Publicar
// cualquier idioma de un documento invalida su tag base único.
```

- [ ] **Step 2: Commit**

```bash
git add app/api/revalidate/route.ts
git commit -m "docs(revalidate): note field-level i18n needs no per-locale tags"
```

---

## FASE 4 — Shopify Markets (idioma + moneda) ⛔ requiere prerrequisitos de plataforma

Objetivo: títulos/descripciones de producto traducidos y precios en la moneda del mercado, según el locale activo.

### Task 4.1: Contexto en el cliente base de Shopify

**Files:**
- Modify: `lib/shopify.js`

- [ ] **Step 1: Permitir `@inContext` en `shopifyData`** — Añade un parámetro de contexto opcional. Las queries que quieran traducción/moneda lo declaran con la directiva `@inContext(language: $language, country: $country)` y pasan `language`/`country` como variables.

```js
// lib/shopify.js — patrón
export async function shopifyData(query, variables = {}) {
  // ...fetch existente, pasando { query, variables } al endpoint...
}
```

Para cada query localizable, define la operación con contexto:

```js
export async function getProductByHandle(handle, {language = 'ES', country = 'ES'} = {}) {
  const query = `
    query Product($handle: String!, $language: LanguageCode!, $country: CountryCode!)
    @inContext(language: $language, country: $country) {
      product(handle: $handle) {
        title
        descriptionHtml
        priceRange { minVariantPrice { amount currencyCode } }
        # ...resto de campos
      }
    }
  `
  return shopifyData(query, {handle, language, country})
}
```

- [ ] **Step 2: Verifica tipos GraphQL** — `LanguageCode!` y `CountryCode!` son enums del Storefront API. El `language` sale de `localeToShopifyLanguage(locale)` y el `country` del market activo (`getActiveMarket().code`) — ejes independientes (ver Task 4.2).

- [ ] **Step 3: Verifica**

Run: `npm run typecheck && npm run lint`
Expected: OK.

- [ ] **Step 4: Commit**

```bash
git add lib/shopify.js
git commit -m "feat(shopify): @inContext language+country on catalog queries"
```

### Task 4.2: Pasar contexto desde las páginas de producto/colección 🔁

**Files:**
- Modify: `app/(frontend)/[locale]/products/[handle]/page.tsx`
- Modify: `app/(frontend)/[locale]/shop/page.tsx`, `shop/[handle]/page.tsx`
- Modify: cualquier Server Component que llame funciones de catálogo de `lib/shopify.js`

- [ ] **Step 1: Combinar idioma (locale) + país (market)** — El `language` viene del locale; el `country` viene del market activo (cookie/geo), NO del locale.

```tsx
import {localeToShopifyLanguage, type Locale} from '@/lib/i18n'
import {getActiveMarket} from '@/lib/markets.server'
// ...
const {locale} = await params
const lang = locale as Locale
const market = await getActiveMarket(lang)
const ctx = {language: localeToShopifyLanguage(lang), country: market.code}
const product = await getProductByHandle(handle, ctx)
```

> Fallback de traducción: si Shopify no tiene traducción `EN` para un producto, el Storefront API devuelve el texto en el idioma por defecto de la tienda automáticamente — no hay que gestionarlo en código.
> Independencia: el mismo producto en `/en/...` puede mostrarse con moneda `EUR` (market ES) o `USD` (market US) según la cookie/geo, sin cambiar de URL.

- [ ] **Step 2: Verifica**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Verifica manual** (requiere Translate & Adapt activo) — Abre `/en/products/<handle>/`. Título/descripción en inglés si existe traducción; en idioma por defecto si no.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(shopify): pass locale market context to product/collection pages"
```

### Task 4.3: Formato de moneda por locale

**Files:**
- Modify: `components/Layout/CartDrawer/CartDrawer.tsx`
- Modify: cualquier componente que formatee precios con `Intl.NumberFormat('es-ES', ...)`

- [ ] **Step 1: Convención de formato del locale + moneda real de Shopify** — El **locale de idioma** define la convención de formato (separadores, posición del símbolo) vía `Intl`; la **moneda** viene de Shopify (`currencyCode`), que ya refleja el market activo gracias a `@inContext(country:)`. Reemplaza el `'es-ES'` hardcodeado:

```tsx
import {useLocale} from 'next-intl'
import {localeToIntl, type Locale} from '@/lib/i18n'
// ...
const locale = useLocale() as Locale
const formatter = new Intl.NumberFormat(localeToIntl(locale), {
  style: 'currency',
  currency: currencyCode, // del line item / Shopify — refleja el market, NO hardcodear EUR
})
```

> ⚠️ La moneda DEBE venir de Shopify (`money.currencyCode`), no de una constante ni del locale de idioma: el market (cookie/geo) es quien decide la moneda. El locale solo decide cómo se *formatea* el número.

- [ ] **Step 2: Verifica**

Run: `npm run build`
Expected: OK.

- [ ] **Step 3: Verifica manual** — Carrito en `/` muestra `€`/`es-ES`; en `/en/` muestra la moneda del mercado EN con formato `en-US`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(i18n): locale-aware currency formatting from Shopify currencyCode"
```

---

## FASE 5 — SEO bilingüe (hreflang, canónicas, sitemap)

Objetivo: Google indexa ambas versiones correctamente con `hreflang` y canónicas por locale.

### Task 5.1: Metadata localizada en `seoHelper`

**Files:**
- Modify: `utils/seoHelper.ts`

- [ ] **Step 1: `buildDefaultMetadata` acepta locale + emite alternates**

```ts
import type {Metadata} from 'next'
import {LOCALES, DEFAULT_LOCALE, type Locale} from '@/lib/i18n'

export const BASE_URL = new URL('https://www.mikmax.com')
export const buildUrl = (path = '/') => new URL(path, BASE_URL).toString()

export const siteTitle = 'Mikmax'
const SITE_DESCRIPTION: Record<Locale, string> = {
  es: 'Textiles del hogar de alta calidad en lino, seda y algodón orgánico. Descubre Mikmax, diseño y confort para tu hogar o hotel.',
  en: 'High-quality home textiles in linen, silk and organic cotton. Discover Mikmax — design and comfort for your home or hotel.',
}

// Construye la URL con prefijo de locale (es sin prefijo).
function localizedPath(path: string, locale: Locale): string {
  const clean = path.startsWith('/') ? path : `/${path}`
  return locale === DEFAULT_LOCALE ? clean : `/${locale}${clean}`
}

function buildAlternates(path = '/', locale: Locale) {
  const languages: Record<string, string> = {}
  for (const l of LOCALES) languages[l] = buildUrl(localizedPath(path, l))
  return {
    canonical: buildUrl(localizedPath(path, locale)),
    languages: {...languages, 'x-default': buildUrl(localizedPath(path, DEFAULT_LOCALE))},
  }
}

export function buildDefaultMetadata(locale: Locale = DEFAULT_LOCALE, path = '/'): Metadata {
  const description = SITE_DESCRIPTION[locale]
  return {
    title: siteTitle,
    description,
    metadataBase: BASE_URL,
    openGraph: {
      title: siteTitle,
      description,
      url: buildUrl(localizedPath(path, locale)),
      siteName: siteTitle,
      locale: locale === 'es' ? 'es_ES' : 'en_US',
      type: 'website',
      images: [{url: BASE_IMAGE_URL, width: BASE_IMAGE_WIDTH, height: BASE_IMAGE_HEIGHT}],
    },
    twitter: {card: 'summary_large_image', title: siteTitle, description, images: [BASE_IMAGE_URL]},
    robots: {index: true, follow: true, googleBot: {index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1}},
    alternates: buildAlternates(path, locale),
    icons: getFavicons(),
  }
}
```

(Conserva `BASE_IMAGE_URL`, `getFavicons`, etc. tal cual; solo se añade lo de arriba.)

- [ ] **Step 2: Verifica**

Run: `npm run typecheck`
Expected: OK.

- [ ] **Step 3: Commit**

```bash
git add utils/seoHelper.ts
git commit -m "feat(seo): locale-aware metadata + hreflang alternates"
```

### Task 5.2: `generateMetadata` por página pasa locale + path

**Files:**
- Modify: cada `page.tsx` con `generateMetadata` bajo `[locale]/`

- [ ] **Step 1: Propagar locale a la metadata de cada ruta** — En cada `generateMetadata`, lee `locale` de params y pásalo a `buildDefaultMetadata(locale, '<path-de-esta-ruta>')` o al helper SEO específico de la página, incluyendo el `path` para que la canónica/hreflang sean correctos.

- [ ] **Step 2: Verifica manual** — `curl -s http://localhost:3000/en/ | grep hreflang` muestra las alternativas `es`, `en`, `x-default`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(seo): per-route localized canonical + hreflang"
```

### Task 5.3: Sitemap por locale

**Files:**
- Create o Modify: `app/sitemap.ts`

- [ ] **Step 1: Generar entradas por locale** — Para cada URL pública (home, páginas, productos, colecciones, looks, sets, legales) emite una entrada por locale con `alternates.languages`. Reutiliza `localizedPath` de `seoHelper`.

```ts
import type {MetadataRoute} from 'next'
import {LOCALES} from '@/lib/i18n'
import {buildUrl} from '@/utils/seoHelper'
// ...obtener slugs de Sanity/Shopify igual que hoy...

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // por cada path público y cada locale, una entrada con alternates
  // (implementar recogida de paths reutilizando getPageSlugs, etc.)
}
```

- [ ] **Step 2: Verifica**

Run: `npm run build` y abre `/sitemap.xml`.
Expected: URLs con y sin `/en`, con `xhtml:link rel="alternate"`.

- [ ] **Step 3: Commit**

```bash
git add app/sitemap.ts
git commit -m "feat(seo): bilingual sitemap with hreflang alternates"
```

### Task 5.4: Selector de idioma en el header

**Files:**
- Modify: `components/Layout/Header/HeaderClient.tsx` (o donde viva la barra de navegación)
- Modify: `messages/es.json`, `messages/en.json` (claves `nav.language*`)

- [ ] **Step 1: Añadir toggle ES/EN** — Usa `usePathname`/`useRouter` de `@/i18n/routing` para cambiar de locale conservando la ruta actual:

```tsx
import {useLocale} from 'next-intl'
import {usePathname, useRouter} from '@/i18n/routing'
// ...
const pathname = usePathname()
const router = useRouter()
const locale = useLocale()
const switchTo = (next: 'es' | 'en') => router.replace(pathname, {locale: next})
```

- [ ] **Step 2: Verifica manual** — En `/products/<x>/`, pulsar EN lleva a `/en/products/<x>/` (misma ruta, otro idioma), y viceversa.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(i18n): language switcher preserving current route"
```

### Task 5.5: Selector de moneda/región en el footer

**Files:**
- Create: `components/Layout/Footer/MarketSelector.tsx`
- Modify: el componente de footer que renderiza las columnas (montar el selector)

> Independiente del selector de idioma: cambiar la moneda NO cambia la URL ni el idioma; escribe la cookie y refresca los Server Components.

- [ ] **Step 1: Crear `MarketSelector.tsx`**

```tsx
'use client'
import {useMarket} from '@/context/marketContext'

export default function MarketSelector() {
  const {market, regions, setMarket} = useMarket()
  if (!regions.length) return null
  return (
    <label className="market-selector">
      <select
        value={market.code}
        onChange={(e) => setMarket(e.target.value)}
        aria-label="Región y moneda"
      >
        {regions.map((r) => (
          <option key={r.code} value={r.code}>
            {r.label} ({r.currency})
          </option>
        ))}
      </select>
    </label>
  )
}
```

- [ ] **Step 2: Montar en el footer** — Inserta `<MarketSelector />` donde el diseño contemple el selector de país/moneda. (Texto del `aria-label` → mover a `messages` namespace `nav` si se prefiere localizarlo.)

- [ ] **Step 3: Verifica**

Run: `npm run build`
Expected: OK.

- [ ] **Step 4: Verifica manual** — Cambiar de moneda en el footer: los precios de la página se recargan en la nueva moneda (vía `router.refresh()`), sin cambiar de idioma ni de URL. La cookie `mikmax_market` persiste al recargar.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(market): footer currency/region selector"
```

---

## FASE 6 — QA, edge cases y cierre

### Task 6.1: `not-found` y `error` localizados

**Files:**
- Modify: `app/(frontend)/[locale]/not-found.tsx`

- [ ] **Step 1** — Asegura que `not-found.tsx` usa `useTranslations`/`getTranslations` para sus textos y que existe bajo `[locale]`. Añade claves `notFound.*` a ambos diccionarios.
- [ ] **Step 2: Verifica** `npm run build`.
- [ ] **Step 3: Commit** `git commit -am "feat(i18n): localized not-found page"`

### Task 6.2: Revisar `<html lang>` y analytics

- [ ] **Step 1** — Confirma que `AnalyticsRouteTracker` (que quedó en `next/navigation`) reporta rutas con prefijo `/en` correctamente y no rompe.
- [ ] **Step 2: Verifica manual** en `/en/` con NODE_ENV=production local.

### Task 6.3: Barrido final de strings hardcodeados

- [ ] **Step 1: Buscar residuos**

Run:
```bash
grep -rnE ">[^<>{]*[áéíóúñ¿¡][^<>{]*<" components app/'(frontend)' --include=*.tsx | grep -v messages
```
Expected: revisar cada match; mover a diccionario cualquier texto visible que quede.

- [ ] **Step 2: Commit** de lo que aparezca.

### Task 6.4: Verificación de `trailingSlash` + middleware

- [ ] **Step 1: Probar rutas límite** — `/`, `/en`, `/en/`, `/shop`, `/shop/`, `/en/shop/`, `/products/<h>/`, `/en/products/<h>/`. Confirma 200 sin bucles de redirección.
- [ ] **Step 2** — Si hay bucle (`ERR_TOO_MANY_REDIRECTS`), revisa la interacción `trailingSlash`/`localePrefix`; documenta el ajuste aplicado.

### Task 6.5: Build de producción + smoke test bilingüe completo

- [ ] **Step 1: Build limpio**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: los tres OK.

- [ ] **Step 2: Smoke test** — Recorre en `es` y `en`: home, shop (con filtros), ficha de producto (añadir al carrito, ver moneda), carrito, checkout link, looks, sets, una página legal, una página `[...slug]`, buscador, popup newsletter, banner. Confirma textos, fallback de contenido sin traducir, y moneda.
- [ ] **Step 2b: Ortogonalidad idioma×market** — Prueba las 4 combinaciones cambiando idioma (selector) y moneda (footer) por separado: `es`+moneda A, `es`+moneda B, `en`+moneda A, `en`+moneda B. Confirma que cambiar de idioma NO altera la moneda y viceversa, y que ambas elecciones persisten al recargar.

- [ ] **Step 3: Commit final / merge**

```bash
git add -A
git commit -m "chore(i18n): final QA pass for bilingual ES/EN"
```

---

## Self-Review (cobertura del spec)

| Requisito | Tarea(s) |
|---|---|
| Idioma ES (default) + EN | 1.2, 1.3, 1.7 |
| URL con prefijo /en, ES sin prefijo | 1.3 (`localePrefix: 'as-needed'`) |
| Strings UI traducidos | 2.1, 2.2, 2.3, 6.3 |
| Contenido Sanity traducible | 3.1, 3.3 |
| Fallback automático a ES (transición) | 3.2 (`coalesce`), 3.4 Step 6, 4.2 Step 1 |
| Productos Shopify traducidos | 4.1, 4.2 |
| Market/moneda independiente del idioma | 1.9, 1.10, 4.2, 4.3, 5.5 |
| Market por geo-IP al entrar | 1.9 (`getActiveMarket` + headers de geo) |
| Market por elección en el footer | 1.10 (cookie + provider), 5.5 (selector) |
| Regiones/monedas ofrecidas desde Sanity | 1.9 (`settings.footer.regions`), 5.5 |
| Revalidación correcta | 3.5 |
| SEO hreflang/canónica/sitemap | 5.1, 5.2, 5.3 |
| Selector de idioma | 5.4 |
| No romper /admin (Studio) | 1.6 (matcher excluye admin/studio) |
| trailingSlash compatible | 1.6 nota, 6.4 |

**Notas de riesgo conocidas:**
- La migración de datos de Sanity (3.3) cambia la forma del dato — requiere scripts de migración y, en producción, ventana de despliegue coordinada con el cliente. Es el punto más delicado.
- Las Fases 4 y la verificación de contenido de 6 dependen de que el cliente active Shopify Markets/Translate y suba traducciones; el código queda listo antes y degrada con fallback mientras tanto.
- **Geo-IP en Vercel** (Task 1.9): el header `x-vercel-ip-country` está disponible en producción sin configuración. En desarrollo local no existe, por lo que el market cae a cookie/`isDefault` — esperado; probar el geo real en un preview deployment de Vercel, no en `npm run dev`.
- **Idioma y market son ortogonales**: probar en QA las 4 combinaciones (es/EUR, es/USD, en/EUR, en/USD) para confirmar que ningún eje arrastra al otro.

---

## Execution Handoff

Plan completo y guardado en `docs/superpowers/plans/2026-06-09-bilingue-es-en.md`. Cuando lo abordéis en unos días, hay dos opciones de ejecución:

1. **Subagent-Driven (recomendada)** — un subagente fresco por tarea, revisión entre tareas, iteración rápida.
2. **Inline Execution** — ejecución en esta sesión con checkpoints de revisión por fase.

Lo razonable aquí, dado que toca producción y la migración de datos de Sanity es delicada, es ir **fase por fase**, validando en navegador entre fases y dejando la Fase 4 para cuando el cliente tenga Shopify Markets activo.
