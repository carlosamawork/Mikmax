# Capa de eventos de analytics del storefront — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emitir desde el storefront Next.js los eventos de ecommerce del embudo (page_view, view_item, add_to_cart, begin_checkout) hacia GA4 y Meta Pixel, con Consent Mode v2, para que las integraciones (GA4, Meta, Google Ads) funcionen en el stack headless.

**Architecture:** Un módulo `lib/analytics/` con un `track`/helpers que reparten a `window.gtag` (GA4) y `window.fbq` (Meta), con `event_id` por evento y no-op seguro sin consentimiento. `google.tsx` carga gtag con Consent Mode v2 (default denegado) y `useConsent` lo actualiza al aceptar. Un `AnalyticsRouteTracker` dispara page_view en navegación SPA. Los eventos se instrumentan en los puntos existentes (PDP, LookDetail, shopContext, CartDrawer). `purchase` NO se emite (lo capta Shopify).

**Tech Stack:** Next.js 15 App Router (client components + context), GA4 (gtag), Meta Pixel (fbq), TypeScript estricto. **El repo NO tiene runner de tests**; verificación por tarea = `npm run typecheck` (+ `npm run lint`). Verificación funcional de eventos = manual con GA4 DebugView + Meta Pixel Helper (Task 7).

**Referencia:** spec `docs/superpowers/specs/2026-06-09-storefront-analytics-events-design.md`.

**Commits:** español; commit por tarea (ya autorizado para esta ejecución).

**Nota de moneda:** `view_item` usa la moneda real (`view.currency`). `add_to_cart`/`begin_checkout` se disparan en contexto de carrito (los items del carrito no guardan moneda) → usan `getStoreCurrency()` = `NEXT_PUBLIC_CURRENCY || 'EUR'`.

---

## Estructura de archivos

**Nuevos**
- `lib/analytics/types.ts` — `AnalyticsItem`.
- `lib/analytics/item.ts` — `getStoreCurrency`, `itemsValue`, `toGa4Item`, `toMetaContents`.
- `lib/analytics/track.ts` — helpers `trackPageView/ViewItem/AddToCart/BeginCheckout` + `event_id` + no-op.
- `lib/analytics/consent.ts` — `applyConsentToGtag`.
- `components/Common/Analytics/AnalyticsRouteTracker.tsx` — page_view SPA.

**Modificados**
- `components/Common/Analytics/google.tsx` — Consent Mode v2 default.
- `hooks/useConsent.tsx` — aplicar consent a gtag en `updateConsent`.
- `app/(frontend)/layout.tsx` — descomentar/reestructurar analytics + montar route tracker + CookieConsent.
- `components/Product/ProductDetail.tsx` — `view_item`.
- `components/Look/LookDetail.tsx` — `view_item` (set/look).
- `context/shopContext.js` — `add_to_cart` (`addToCart`, `addLookToCart`).
- `components/Layout/CartDrawer/CartDrawer.tsx` — `begin_checkout`.

---

## Task 1: Núcleo `lib/analytics/`

**Files:**
- Create: `lib/analytics/types.ts`, `lib/analytics/item.ts`, `lib/analytics/track.ts`, `lib/analytics/consent.ts`

- [ ] **Step 1: `lib/analytics/types.ts`**

```ts
export type AnalyticsItem = {
  id: string // variant GID o product handle/id
  name: string
  price: number
  quantity: number
  variant?: string // etiqueta talla/color
  currency: string
}
```

- [ ] **Step 2: `lib/analytics/item.ts`**

```ts
import type {AnalyticsItem} from './types'

export function getStoreCurrency(): string {
  return process.env.NEXT_PUBLIC_CURRENCY || 'EUR'
}

export function itemsValue(items: AnalyticsItem[]): number {
  return items.reduce((sum, it) => sum + it.price * it.quantity, 0)
}

export function toGa4Item(it: AnalyticsItem) {
  return {
    item_id: it.id,
    item_name: it.name,
    price: it.price,
    quantity: it.quantity,
    ...(it.variant ? {item_variant: it.variant} : {}),
  }
}

export function toMetaContents(items: AnalyticsItem[]) {
  return items.map((it) => ({id: it.id, quantity: it.quantity}))
}
```

- [ ] **Step 3: `lib/analytics/track.ts`**

```ts
import type {AnalyticsItem} from './types'
import {itemsValue, toGa4Item, toMetaContents, getStoreCurrency} from './item'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

let counter = 0
function newEventId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  counter += 1
  return `${Date.now()}-${counter}`
}

function ga4(name: string, params: Record<string, unknown>) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('event', name, params)
}

function meta(name: string, params: Record<string, unknown>, eventId: string) {
  if (typeof window === 'undefined' || !window.fbq) return
  window.fbq('track', name, params, {eventID: eventId})
}

export function trackPageView(path: string, location: string) {
  ga4('page_view', {page_path: path, page_location: location})
  meta('PageView', {}, newEventId())
}

export function trackViewItem(item: AnalyticsItem) {
  ga4('view_item', {currency: item.currency, value: item.price, items: [toGa4Item(item)]})
  meta(
    'ViewContent',
    {
      content_type: 'product',
      content_ids: [item.id],
      content_name: item.name,
      value: item.price,
      currency: item.currency,
    },
    newEventId(),
  )
}

export function trackAddToCart(items: AnalyticsItem[]) {
  if (!items.length) return
  const currency = items[0].currency || getStoreCurrency()
  const value = itemsValue(items)
  ga4('add_to_cart', {currency, value, items: items.map(toGa4Item)})
  meta(
    'AddToCart',
    {
      content_type: 'product',
      content_ids: items.map((it) => it.id),
      contents: toMetaContents(items),
      value,
      currency,
    },
    newEventId(),
  )
}

export function trackBeginCheckout(items: AnalyticsItem[]) {
  if (!items.length) return
  const currency = items[0].currency || getStoreCurrency()
  const value = itemsValue(items)
  ga4('begin_checkout', {currency, value, items: items.map(toGa4Item)})
  meta(
    'InitiateCheckout',
    {
      content_type: 'product',
      content_ids: items.map((it) => it.id),
      contents: toMetaContents(items),
      value,
      currency,
      num_items: items.reduce((n, it) => n + it.quantity, 0),
    },
    newEventId(),
  )
}
```

- [ ] **Step 4: `lib/analytics/consent.ts`**

```ts
import type {ConsentPreferences} from '@/hooks/useConsent'

// Consent Mode v2: traduce las preferencias del usuario a gtag('consent','update').
export function applyConsentToGtag(prefs: ConsentPreferences) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag('consent', 'update', {
    analytics_storage: prefs.analytics ? 'granted' : 'denied',
    ad_storage: prefs.marketing ? 'granted' : 'denied',
    ad_user_data: prefs.marketing ? 'granted' : 'denied',
    ad_personalization: prefs.marketing ? 'granted' : 'denied',
  })
}
```

> `ConsentPreferences` ya se exporta en `hooks/useConsent.tsx` (`export type ConsentPreferences = {analytics: boolean; marketing: boolean}`). `window.gtag`/`window.fbq` se tipan vía el `declare global` de `track.ts`.

- [ ] **Step 5: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/analytics
git commit -m "feat(analytics): nucleo lib/analytics (track + item + consent)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Consent Mode v2 (gtag default + update)

**Files:**
- Modify: `components/Common/Analytics/google.tsx`
- Modify: `hooks/useConsent.tsx`

- [ ] **Step 1: `google.tsx` — añadir `consent` default antes de `config`**

Reemplazar el bloque del `<Script id="google-analytics">` por (añade el `gtag('consent','default',…)` justo después de definir `gtag` y antes de `gtag('js'…)`):

```tsx
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('consent', 'default', {
            ad_storage: 'denied',
            analytics_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_title: window.location.pathname,
            page_location: window.location.href
          });
        `}
      </Script>
```

(El resto del componente —el `<Script src=…gtag/js>` y el guard `if (!GA_ID) return null`— se mantiene igual. El `function gtag(){}` inline queda como global → accesible vía `window.gtag`.)

- [ ] **Step 2: `hooks/useConsent.tsx` — aplicar consent a gtag al actualizar**

Añadir el import y llamar a `applyConsentToGtag` dentro de `updateConsent`, y también sincronizar al cargar una preferencia ya guardada:

```tsx
import {applyConsentToGtag} from '@/lib/analytics/consent'
```

En el `useEffect` que lee la cookie, tras `setConsent(stored)` añadir `applyConsentToGtag(stored)`. Y en `updateConsent`:

```tsx
  const updateConsent = (prefs: ConsentPreferences) => {
    setCookie(cookieName, JSON.stringify(prefs), {maxAge: 60 * 60 * 24 * 60})
    setConsent(prefs)
    applyConsentToGtag(prefs)
  }
```

> Si `window.gtag` aún no existe cuando se ejecuta (p. ej. consent guardado antes de cargar gtag), `applyConsentToGtag` es no-op; gtag arranca con el default `denied` del Step 1 y se re-aplica en el siguiente `updateConsent`. Para el caso de consent ya guardado, el efecto se ejecuta tras montar; gtag (afterInteractive) puede no estar listo aún — aceptable: el default denegado es seguro y el usuario re-otorga al interactuar. (No introducir reintentos/polling.)

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Common/Analytics/google.tsx hooks/useConsent.tsx
git commit -m "feat(analytics): Consent Mode v2 (gtag default denied + update al aceptar)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: page_view SPA + reactivar bloque de analytics

**Files:**
- Create: `components/Common/Analytics/AnalyticsRouteTracker.tsx`
- Modify: `app/(frontend)/layout.tsx`

- [ ] **Step 1: `AnalyticsRouteTracker.tsx`**

```tsx
'use client'

import {useEffect, useRef} from 'react'
import {usePathname, useSearchParams} from 'next/navigation'
import {trackPageView} from '@/lib/analytics/track'

export default function AnalyticsRouteTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirst = useRef(true)

  useEffect(() => {
    // La carga inicial ya la cuentan gtag('config') y fbq('PageView').
    if (isFirst.current) {
      isFirst.current = false
      return
    }
    const qs = searchParams?.toString()
    const path = qs ? `${pathname}?${qs}` : pathname
    trackPageView(path, window.location.href)
  }, [pathname, searchParams])

  return null
}
```

- [ ] **Step 2: `app/(frontend)/layout.tsx` — descomentar/reestructurar**

1. Añadir el import: `import AnalyticsRouteTracker from '@/components/Common/Analytics/AnalyticsRouteTracker'`.
2. Reemplazar el bloque comentado (`{/* <CookieConsent /> … */}`) por este, dentro del `<ShopProvider>` (después de `<CartDrawer />`):

```tsx
            <CookieConsent />
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
```

> `Analytics` (gtag + Consent Mode) y `AnalyticsRouteTracker` van **fuera** del `ConsentGate` (gtag debe cargar siempre para Consent Mode; `track`/route tracker son no-op si los pixels no están). `AnalyticsRouteTracker` usa `useSearchParams`, que requiere un `Suspense` boundary; el layout ya envuelve todo en `<Suspense>`, así que queda cubierto. Mantener el guard `NODE_ENV === 'production'`.

- [ ] **Step 3: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Common/Analytics/AnalyticsRouteTracker.tsx "app/(frontend)/layout.tsx"
git commit -m "feat(analytics): page_view en navegacion SPA + reactivar pixels con consent

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `view_item` (PDP + set/look)

**Files:**
- Modify: `components/Product/ProductDetail.tsx`
- Modify: `components/Look/LookDetail.tsx`

- [ ] **Step 1: `ProductDetail.tsx` — disparar `view_item` al montar**

Añadir el import (junto a los otros): `import {trackViewItem} from '@/lib/analytics/track'`. Y un efecto (tras los hooks existentes; `useEffect` ya está importado):

```tsx
  useEffect(() => {
    trackViewItem({
      id: view.handle,
      name: view.title,
      price: view.minPrice,
      quantity: 1,
      currency: view.currency,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.handle])
```

> `ProductView` expone `handle`, `title`, `minPrice`, `currency` (confirmado en `types/product.ts`).

- [ ] **Step 2: `LookDetail.tsx` — disparar `view_item` (cubre set y look)**

Añadir `useEffect` al import de React (actualmente `import {useContext, useMemo, useState} from 'react'` → añadir `useEffect`). Añadir el import `import {trackViewItem} from '@/lib/analytics/track'`. Y el efecto:

```tsx
  useEffect(() => {
    trackViewItem({
      id: view.slug,
      name: view.title,
      price: view.minTotal,
      quantity: 1,
      currency: view.currency,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.slug])
```

> `LookView` expone `slug`, `title`, `minTotal`, `currency` (confirmado en `types/look.ts`). Como `LookDetail` lo usan tanto `/looks/[slug]` como `/sets/[slug]`, ambos emiten `view_item`.

- [ ] **Step 3: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Product/ProductDetail.tsx components/Look/LookDetail.tsx
git commit -m "feat(analytics): view_item en PDP y detalle de set/look

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: `add_to_cart` (shopContext)

**Files:**
- Modify: `context/shopContext.js`

- [ ] **Step 1: Imports**

En la cabecera de `context/shopContext.js`, añadir:

```js
import {trackAddToCart} from '@/lib/analytics/track'
import {getStoreCurrency} from '@/lib/analytics/item'
```

- [ ] **Step 2: `addToCart` — emitir tras añadir con éxito**

Dentro de `addToCart(newItem, quantity, productId, title, image)`, construir el item una vez al inicio del cuerpo:

```js
    const atcItem = {
      id: productId || newItem.store.gid,
      name: title || '',
      price: typeof newItem.price === 'number' ? newItem.price : 0,
      quantity,
      variant: [newItem.color, newItem.size].filter((x) => x && x !== 'Default').join(' / ') || undefined,
      currency: getStoreCurrency(),
    }
```

Y llamar `trackAddToCart([atcItem])` en cada rama de éxito, justo **después** del `saveToStorage(...)` correspondiente:
- en la rama `cart.length === 0`: tras `saveToStorage([synced], {id: apiCart.id, checkoutUrl: apiCart.checkoutUrl})`.
- en la rama `else` (carrito existente): tras `saveToStorage(updatedCart, meta)`.

(No emitir en los `return` de error.)

- [ ] **Step 3: `addLookToCart` — emitir el bundle tras éxito**

Dentro de `addLookToCart(lookLines, discountCode)`, tras el `saveToStorage(synced, meta)` de la rama de éxito, añadir:

```js
      trackAddToCart(
        lookLines.map((l) => ({
          id: l.productId || l.store.gid,
          name: l.title || '',
          price: typeof l.price === 'number' ? l.price : 0,
          quantity: l.quantity ?? 1,
          currency: getStoreCurrency(),
        })),
      )
```

- [ ] **Step 4: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 5: Commit**

```bash
git add context/shopContext.js
git commit -m "feat(analytics): add_to_cart en addToCart y addLookToCart

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `begin_checkout` (CartDrawer)

**Files:**
- Modify: `components/Layout/CartDrawer/CartDrawer.tsx`

- [ ] **Step 1: Import + emitir en `goCheckout`**

Añadir imports:

```tsx
import {trackBeginCheckout} from '@/lib/analytics/track'
import {getStoreCurrency} from '@/lib/analytics/item'
```

Reemplazar `goCheckout` por:

```tsx
  function goCheckout() {
    trackBeginCheckout(
      cart.map((it) => ({
        id: it.productId || it.store.gid,
        name: it.title || '',
        price: typeof it.price === 'number' ? it.price : 0,
        quantity: it.variantQuantity ?? 1,
        variant:
          [it.color, it.size].filter((x) => x && x !== 'Default').join(' / ') || undefined,
        currency: getStoreCurrency(),
      })),
    )
    if (ctx?.checkoutUrl) {
      window.location.href = ctx.checkoutUrl
    }
  }
```

> Los items del carrito llevan `productId`, `title`, `price`, `store.gid`, `variantQuantity`, `color`, `size` (puestos en `addToCart`/`addLookToCart`). `cart` ya está en scope en `CartDrawer`.

- [ ] **Step 2: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 3: Commit**

```bash
git add components/Layout/CartDrawer/CartDrawer.tsx
git commit -m "feat(analytics): begin_checkout al ir al checkout

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Verificación final y prueba funcional

**Files:** (ninguno de código)

- [ ] **Step 1: Lint + typecheck + build**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: los tres PASS. (Si el build falla por permisos en `.next` —artefactos root de builds previas—, `sudo rm -rf .next` y reintentar; no es fallo de código.)

- [ ] **Step 2: Prueba funcional de eventos**

Como los pixels solo cargan en `NODE_ENV=production` y con consentimiento, probar en un build de producción local (`npm run build && npm start`) con `NEXT_PUBLIC_GA_ID`/`NEXT_PUBLIC_FB_ID` de test en `.env.local`:
1. Aceptar cookies (marketing + analytics) en el banner.
2. **GA4 DebugView** (o la extensión *Google Tag Assistant*): navegar → `page_view`; abrir ficha de producto → `view_item`; añadir al carrito → `add_to_cart`; "Go to Checkout" → `begin_checkout`.
3. **Meta Pixel Helper** (extensión Chrome): comprobar `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, cada uno con su `eventID`.
4. Confirmar que **sin aceptar marketing** NO se disparan eventos de Meta (pixel no cargado) y que Google queda en modo consentimiento denegado (Consent Mode).
5. Confirmar que NO se emite `purchase` desde el storefront (ocurre en el checkout de Shopify).

- [ ] **Step 3: (Cliente) registrar `NEXT_PUBLIC_CURRENCY`**

Si la moneda de la tienda no es EUR, añadir `NEXT_PUBLIC_CURRENCY` en el entorno (Vercel) con el código ISO (p. ej. `USD`). Por defecto usa `EUR`.

---

## Notas de cierre

- **Fuera de alcance:** CAPI servidor del storefront (solo se deja `event_id` listo), eventos extendidos (list/search/wishlist/remove), conversión de Ads vía gtag propio (se importa desde GA4), y la config en paneles del cliente (GA4/Ads/GMC/Shopify channels/Meta domain verification/CAPI token).
- **Decisiones del spec:** Consent Mode v2 (Google) + gating de marketing (Meta); eventos núcleo; pixel de navegador con `event_id`; `purchase` solo en Shopify.
- **Moneda:** `view_item` usa la moneda real; `add_to_cart`/`begin_checkout` usan `getStoreCurrency()` (`NEXT_PUBLIC_CURRENCY || 'EUR'`).
