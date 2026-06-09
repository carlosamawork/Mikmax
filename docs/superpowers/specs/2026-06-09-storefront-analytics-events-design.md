# Capa de eventos de analytics del storefront (headless) — Diseño

- **Fecha:** 2026-06-09
- **Objetivo:** En un stack headless (storefront Next.js + checkout Shopify), emitir desde el storefront los eventos de ecommerce que las integraciones de Shopify NO ven (navegar/ver producto/añadir al carrito/iniciar checkout), enviándolos a **GA4** y **Meta Pixel**, respetando consentimiento (Consent Mode v2), para que Google Ads, Meta y GA4 funcionen correctamente.

---

## Decisiones acordadas (brainstorming)

1. **Consentimiento:** **Consent Mode v2** para Google (gtag carga siempre con defaults `denied`, se actualiza a `granted` al aceptar). Meta sigue **gateado** a consentimiento de *marketing*.
2. **Eventos: núcleo** — `page_view` (navegación SPA), `view_item` (producto/set/look), `add_to_cart`, `begin_checkout`. **`purchase` NO** se emite en el front (lo capta Shopify en el checkout) → sin doble conteo.
3. **Meta: solo pixel de navegador** ahora, con `event_id` por evento para dedup futuro con CAPI del checkout. CAPI servidor del storefront queda fuera de alcance.
4. **Proveedores de eventos:** GA4 + Meta. Pinterest/Hotjar permanecen a nivel de página (PageView/carga), no se instrumentan eventos de ecommerce.

---

## Estado actual del repo

- `components/Common/Analytics/`: `google.tsx` (gtag + config/pageview), `facebook.tsx` (pixel + PageView), `hotjar.tsx`, `pinterest.tsx`, `consentGate.tsx`.
- `hooks/useConsent.tsx`: cookie `${clientId}_localConsent_25` con `{analytics: boolean, marketing: boolean}`; `consent` es `null` hasta que el usuario decide; `updateConsent(prefs)` la escribe.
- `ConsentGate category="analytics"|"marketing"`: renderiza children solo si `consent[category]`.
- `app/(frontend)/layout.tsx`: **todo el bloque de analytics está COMENTADO**; además gateado a `NODE_ENV === 'production'`.
- Pixels actuales: solo `PageView`/`config`. **No hay eventos de ecommerce ni page_view en navegación SPA**.
- Puntos de anclaje existentes:
  - `context/shopContext.js` → `addToCart(newItem, quantity, productId, title, image)` y `addLookToCart(lookLines, discountCode)`.
  - `components/Layout/CartDrawer/CartDrawer.tsx` → `goCheckout()` (botón "Go to Checkout"; usa `ctx.checkoutUrl`, `cart`).
  - `components/Product/ProductDetail.tsx` (producto), `components/Look/LookDetail.tsx` (set y look).
  - `components/Common/CookieConsent/CookieConsent.tsx` (banner) + `ConsentGate`.

---

## Arquitectura

### Núcleo — `lib/analytics/`

```
lib/analytics/
  types.ts        → AnalyticsItem, eventos canónicos y payloads
  track.ts        → track(event, payload) + helpers tipados + gating + event_id
  item.ts         → toAnalyticsItem(...) y mapeos GA4 / Meta
  consent.ts      → applyConsentToGtag(prefs) (Consent Mode v2 update)
```

- **`track(event, payload)`** (cliente): mapea el evento canónico a:
  - **GA4**: `window.gtag('event', <ga4Name>, {currency, value, items})`.
  - **Meta**: `window.fbq('track', <metaName>, <metaParams>, {eventID})`.
  - Genera `eventId = crypto.randomUUID()` por evento (con fallback a `timestamp + contador` si `crypto.randomUUID` no está disponible). Es código de navegador.
  - **No-op seguro**: si `window.gtag`/`window.fbq` no existen (sin consentimiento / no cargado), no hace nada y no lanza.
- **Helpers**: `trackPageView(path)`, `trackViewItem(item)`, `trackAddToCart(item)`, `trackBeginCheckout(items, value, currency)`.
- **`toAnalyticsItem`**: construye un `AnalyticsItem` canónico `{id, name, price, quantity, variant?, currency}` desde producto/variante/línea de carrito; los mapeos a GA4 (`item_id/item_name/price/quantity/item_variant`) y Meta (`content_ids/content_name/contents`) viven en `item.ts`.

> Mapeo de nombres: `view_item`→`ViewContent`, `add_to_cart`→`AddToCart`, `begin_checkout`→`InitiateCheckout`, `page_view`→`PageView`.

### Consent Mode v2 — `components/Common/Analytics/google.tsx`

- Cargar gtag **siempre** (fuera del `ConsentGate`). Antes del `config`, emitir:
  ```js
  gtag('consent', 'default', {
    ad_storage: 'denied', analytics_storage: 'denied',
    ad_user_data: 'denied', ad_personalization: 'denied',
    wait_for_update: 500,
  })
  ```
- Al aceptar (en `useConsent.updateConsent`, o un efecto que observe `consent`), llamar `applyConsentToGtag(prefs)` → `gtag('consent','update', { analytics_storage: prefs.analytics?'granted':'denied', ad_storage/ad_user_data/ad_personalization: prefs.marketing?'granted':'denied' })`.
- Meta (`facebook.tsx`) y Pinterest permanecen dentro de `ConsentGate category="marketing"`; Hotjar dentro de `category="analytics"`.

### page_view SPA — `components/Common/Analytics/AnalyticsRouteTracker.tsx`

Client component montado en el layout: efecto con `usePathname()` + `useSearchParams()` que en cada cambio dispara `trackPageView(path)` (GA4 `page_view` con `page_path/page_location` + Meta `PageView`). Evita el doble disparo en la carga inicial (la config inicial de gtag ya cuenta la primera; el tracker dispara a partir del primer cambio, o se coordina para no duplicar — ver plan).

### Layout — `app/(frontend)/layout.tsx`

Descomentar y reestructurar el bloque (solo `NODE_ENV=production`):
- `<Analytics />` (gtag + Consent Mode) **fuera** del gate.
- `<AnalyticsRouteTracker />` fuera del gate (track() ya es no-op sin pixels).
- `ConsentGate category="analytics"`: `<Hotjar />`.
- `ConsentGate category="marketing"`: `<FacebookPixel />`, `<PinterestTag />`.
- `<CookieConsent />` visible (banner) para poder capturar el consentimiento.

### Instrumentación de eventos (núcleo)

| Evento | Archivo | Disparo |
|---|---|---|
| `page_view` | `AnalyticsRouteTracker.tsx` | cambio de ruta |
| `view_item` | `components/Product/ProductDetail.tsx`; `components/Look/LookDetail.tsx` | al montar, con el item visible (producto / set / look) |
| `add_to_cart` | `context/shopContext.js` (`addToCart`, `addLookToCart`) | tras añadir al carrito, con el/los item(s) |
| `begin_checkout` | `components/Layout/CartDrawer/CartDrawer.tsx` (`goCheckout`) | al pulsar "Go to Checkout", con el carrito + value |

> `shopContext.js` es JS (no TS); las llamadas a `track` desde ahí usarán los helpers exportados (sin tipos). El `view_item` de `LookDetail` cubre set y look (mismo componente).

---

## Datos / `value`

- `value` y `price` se toman del precio ya resuelto (Shopify Storefront), en la **moneda** de `priceRange`/variante (no hardcodear EUR; leer la moneda del dato). Confirmar con cliente si los precios **incluyen impuestos** (afecta a la exactitud del `value`, no al código).
- `add_to_cart`/`begin_checkout` usan cantidades reales del carrito.

## Env / IDs

- `NEXT_PUBLIC_GA_ID` debe ser **GA4** (`G-…`). `NEXT_PUBLIC_FB_ID` (pixel). `NEXT_PUBLIC_PINTEREST_ID`, `NEXT_PUBLIC_HOTJAR_ID` ya existen. La conversión de Ads se importa desde GA4 → sin id propio en el front.

---

## Lista de archivos

**Nuevos**
- `lib/analytics/types.ts`
- `lib/analytics/item.ts`
- `lib/analytics/track.ts`
- `lib/analytics/consent.ts`
- `components/Common/Analytics/AnalyticsRouteTracker.tsx`

**Modificados**
- `components/Common/Analytics/google.tsx` (Consent Mode v2 default)
- `hooks/useConsent.tsx` (al `updateConsent`, aplicar consent a gtag)
- `app/(frontend)/layout.tsx` (descomentar/reestructurar; montar route tracker)
- `context/shopContext.js` (`add_to_cart` en `addToCart`/`addLookToCart`)
- `components/Product/ProductDetail.tsx` (`view_item`)
- `components/Look/LookDetail.tsx` (`view_item` para set/look)
- `components/Layout/CartDrawer/CartDrawer.tsx` (`begin_checkout`)

**Reutilizados:** `facebook.tsx`, `hotjar.tsx`, `pinterest.tsx`, `consentGate.tsx`, `useConsent` (lectura).

---

## Supuestos a verificar en implementación

- Forma exacta de `newItem` en `addToCart` (handle, variante GID, precio, título, imagen) y de las líneas de `addLookToCart` para construir el `AnalyticsItem`.
- Props disponibles en `ProductDetail`/`LookDetail` para `view_item` (id, nombre, precio, moneda, variante).
- Forma de `cart` en `CartDrawer` para `begin_checkout` (items + cantidades + precios).
- Coordinar el `page_view` inicial (config de gtag) con el del route tracker para no duplicar.

## Fuera de alcance

- CAPI servidor del storefront (Meta) — solo se deja el `event_id` preparado.
- Eventos extendidos (`view_item_list`, `select_item`, `search`, `remove_from_cart`, `add_to_wishlist`).
- Conversión de Google Ads vía gtag propio (se hace importando desde GA4).
- Configuración en paneles del cliente (GA4/Ads/GMC/Shopify channels/Meta domain verification/CAPI token) — recogida en la lista de inputs del cliente, no es código.
- `purchase` en el front (lo emite Shopify).
