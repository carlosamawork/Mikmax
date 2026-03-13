# Template: Next.js + Sanity + Shopify

Base de proyecto para e-commerce/content con:

- Next.js (App Router)
- Sanity Studio embebido en `/admin`
- Shopify Storefront API (GraphQL)

## 1. Requisitos

- Node.js 20+
- npm 10+
- Proyecto en Sanity
- Store + Storefront Access Token en Shopify

## 2. Instalación

```bash
npm install
cp .env.example .env.local
```

Rellena las variables en `.env.local`.

## 3. Variables de entorno

- `NEXT_PUBLIC_SANITY_PROJECT_ID`
- `NEXT_PUBLIC_SANITY_DATASET`
- `NEXT_PUBLIC_SANITY_API_VERSION`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_STOREFRONT_ACCESSTOKEN`
- `SHOPIFY_API_VERSION`
- `NEXT_PUBLIC_CLIENT_ID` (prefijo para cookie de consentimiento)
- `NEXT_PUBLIC_GA_ID` (Google Analytics)
- `NEXT_PUBLIC_FB_ID` (Meta Pixel)
- `NEXT_PUBLIC_HOTJAR_ID` (Hotjar)
- `NEXT_PUBLIC_PINTEREST_ID` (Pinterest Tag)

## 4. Desarrollo

```bash
npm run dev
```

- Frontend: `http://localhost:3000`
- Sanity Studio: `http://localhost:3000/admin`

## 5. Estructura Sanity

La estructura de Desk está en:

- `sanity/desk/index.ts`

Incluye singletons, contenidos principales y fallback de tipos no mapeados para evitar duplicados en el panel raíz.

## 6. Componentes Lazy

Se añadieron componentes reutilizables:

- `components/Common/LazyImage`
- `components/Common/LazyVideo`

`LazyVideo` soporta `.m3u8` (HLS) con `hls.js` y fallback nativo cuando el navegador lo permite.

Ejemplo rápido:

```tsx
import {LazyImage, LazyVideo} from '@/components/Common'

<LazyImage src="https://cdn.sanity.io/..." alt="Producto" width={1200} height={800} />

<LazyVideo
  src="https://cdn.shopify.com/.../video.m3u8"
  poster="https://cdn.shopify.com/.../poster.jpg"
  autoPlay
  muted
  loop
/>
```

## 7. Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`

## 8. Cookies y Analytics

Incluye el bloque de consentimiento y gates por categoría como en `sanity_next`:

- `components/Common/CookieConsent/CookieConsent.tsx`
- `hooks/useConsent.tsx`
- `components/Common/Analytics/*`

Comportamiento:

- Banner de cookies tras 5s si no existe cookie.
- `required` siempre activo.
- `analytics` y `marketing` configurables por usuario.
- En producción (`NODE_ENV=production`) se cargan scripts sólo si hay consentimiento:
  - analytics: Google Analytics + Hotjar
  - marketing: Facebook Pixel + Pinterest Tag
