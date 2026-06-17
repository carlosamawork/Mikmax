# B2B Fase 2B — Precio B2B en la tienda (Next) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar el precio B2B en el storefront headless: reseller con −50% (config) en PDP/listados/búsqueda, y el descuento real (reseller y designer) en el carrito — leyéndolo del Storefront Cart API tras setear el `buyerIdentity` del cliente B2B.

**Architecture:** La Function (Plan A) es la fuente de verdad del dinero. En el Next: (1) un helper puro lee la config `b2b.pricing` (Admin API) y aplica el −50% del reseller a los precios mostrados en PDP/listados; (2) al login de un B2B se setea `buyerIdentity` en el carrito (server action) para que la Function aplique; (3) el carrito muestra subtotal/descuento/total leídos de `cart.cost`/`discountAllocations` de Shopify. El designer NUNCA se recalcula en frontend — se lee del carrito.

**Tech Stack:** Next.js 15 (server components, server actions) · Shopify Storefront Cart API · Admin GraphQL API · Vitest.

**Spec:** `docs/superpowers/specs/2026-06-17-mikmax-b2b-fase2-discount-display-design.md`
**Depende de:** Plan A (`...-fase2a-discount-engine-plan.md`) **desplegado** para los pasos de carrito (Tasks 3–5). Las Tasks 1, 6, 7 (config + display reseller en PDP/listados) son independientes de A.

> ⚠️ Convención del repo: Prettier sin punto y coma, comillas simples, sin bracket spacing. Mobile-first SCSS. Nunca `<img>`/`<video>` nativos.

---

## File structure

```
lib/b2b/pricing.ts            NUEVO  helper puro: parse config + reseller % + transforms
lib/shopify-admin.js          MOD    + getShopB2bPricing() (lee shop metafield b2b.pricing)
lib/shopify.js                MOD    CART_LINES_FRAGMENT + cost/discountAllocations; cartBuyerIdentityUpdate ya existe
app/(frontend)/cart/actions.ts MOD/NUEVO  syncCartBuyer(cartId) server action
context/shopContext.js        MOD    estado cartCost; llama syncCartBuyer en mount/login/logout; expone cartCost
components/Layout/CartDrawer/CartDrawer.tsx  MOD  muestra subtotal/descuento/total
components/Product/shared/PriceLabel.tsx     MOD  prop opcional `compareMin`/`compareMax` (tachado)
app/(frontend)/products/[handle]/page.tsx    MOD  aplica reseller al ProductView
app/(frontend)/shop/actions.ts               MOD  aplica reseller a las cards
app/(frontend)/search/actions.ts             MOD  aplica reseller a las cards
__tests__/b2b/pricingDisplay.test.ts         NUEVO tests del helper puro
```

---

## Task 1: Helper puro de pricing display (`lib/b2b/pricing.ts`) — TDD

**Files:**
- Create: `lib/b2b/pricing.ts`
- Test: `__tests__/b2b/pricingDisplay.test.ts`

- [ ] **Step 1: Test que falla** — `__tests__/b2b/pricingDisplay.test.ts`

```ts
import {describe, it, expect} from 'vitest'
import {parsePricingConfig, resellerPrice, applyResellerToCard} from '@/lib/b2b/pricing'

const CFG = {
  resellerPercent: 50,
  designerTiers: [
    {minSubtotal: 0, percent: 15},
    {minSubtotal: 1000, percent: 20},
    {minSubtotal: 10000, percent: 30},
  ],
}

describe('parsePricingConfig', () => {
  it('parsea JSON válido', () => {
    expect(parsePricingConfig(JSON.stringify(CFG))).toEqual(CFG)
  })
  it('null/ inválido / incompleto → null', () => {
    expect(parsePricingConfig(null)).toBeNull()
    expect(parsePricingConfig('nope')).toBeNull()
    expect(parsePricingConfig('{}')).toBeNull()
    expect(parsePricingConfig(JSON.stringify({resellerPercent: 50}))).toBeNull()
  })
})

describe('resellerPrice', () => {
  it('aplica el % y redondea a 2 decimales', () => {
    expect(resellerPrice(100, 50)).toBe(50)
    expect(resellerPrice(99.9, 50)).toBe(49.95)
    expect(resellerPrice(100, 0)).toBe(100)
  })
})

describe('applyResellerToCard', () => {
  it('percent 0 → card sin cambios', () => {
    const card = {minPrice: 100, maxPrice: 200, compareAtPrice: undefined}
    expect(applyResellerToCard(card, 0)).toEqual(card)
  })
  it('reseller → min/max descontados y compareAt = min original', () => {
    const out = applyResellerToCard({minPrice: 100, maxPrice: 200}, 50)
    expect(out.minPrice).toBe(50)
    expect(out.maxPrice).toBe(100)
    expect(out.compareAtPrice).toBe(100) // min original (tachado)
  })
  it('sin minPrice numérico → sin cambios', () => {
    const card = {minPrice: undefined as unknown as number}
    expect(applyResellerToCard(card, 50)).toEqual(card)
  })
})
```

- [ ] **Step 2: Ejecutar (falla)** — Run: `npx vitest run __tests__/b2b/pricingDisplay.test.ts` · Expected: FAIL (módulo no encontrado).

- [ ] **Step 3: Implementar `lib/b2b/pricing.ts`** (parte pura; las funciones server-only van en Task 2)

```ts
import {cache} from 'react'
import {getShopB2bPricing} from '@/lib/shopify-admin'
import {getCurrentCustomer} from '@/lib/auth/customer'

export interface DesignerTier {
  minSubtotal: number
  percent: number
}

export interface PricingConfig {
  resellerPercent: number
  designerTiers: DesignerTier[]
}

// Misma forma/validación que la Function (Plan A). Único punto de verdad de la config.
export function parsePricingConfig(json: string | null | undefined): PricingConfig | null {
  if (!json) return null
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (typeof o.resellerPercent !== 'number') return null
  if (!Array.isArray(o.designerTiers)) return null
  const tiers: DesignerTier[] = []
  for (const t of o.designerTiers) {
    if (typeof t?.minSubtotal !== 'number' || typeof t?.percent !== 'number') return null
    tiers.push({minSubtotal: t.minSubtotal, percent: t.percent})
  }
  return {resellerPercent: o.resellerPercent, designerTiers: tiers}
}

// Precio reseller redondeado a 2 decimales. percent 0 → sin cambios.
export function resellerPrice(amount: number, percent: number): number {
  if (!percent) return amount
  return Math.round(amount * (1 - percent / 100) * 100) / 100
}

type CardLike = {minPrice?: number; maxPrice?: number; compareAtPrice?: number}

// Aplica el % reseller a una card: min/max descontados, compareAt = min original (tachado).
export function applyResellerToCard<T extends CardLike>(card: T, percent: number): T {
  if (!percent || typeof card.minPrice !== 'number') return card
  return {
    ...card,
    compareAtPrice: card.minPrice,
    minPrice: resellerPrice(card.minPrice, percent),
    maxPrice: typeof card.maxPrice === 'number' ? resellerPrice(card.maxPrice, percent) : card.maxPrice,
  }
}

// --- server-only (implementado en Task 2) ---
export const getB2bPricingConfig = cache(async (): Promise<PricingConfig | null> => {
  const value = await getShopB2bPricing()
  return parsePricingConfig(value)
})

// % reseller a aplicar en ESTA request (0 si no es reseller validado o no hay config).
export const getResellerPercent = cache(async (): Promise<number> => {
  const session = await getCurrentCustomer()
  const c = session?.customer
  if (c?.b2bValidated?.value !== 'true') return 0
  if (c?.b2bClientType?.value !== 'reseller') return 0
  const cfg = await getB2bPricingConfig()
  return cfg ? cfg.resellerPercent : 0
})
```

- [ ] **Step 4: Ejecutar (pasa)** — Run: `npx vitest run __tests__/b2b/pricingDisplay.test.ts` · Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/b2b/pricing.ts __tests__/b2b/pricingDisplay.test.ts
git commit -m "feat(b2b): pure pricing display helpers (config parse + reseller transform)"
```

---

## Task 2: Lectura del metafield `b2b.pricing` de la tienda (`lib/shopify-admin.js`)

**Files:**
- Modify: `lib/shopify-admin.js` (añadir export al final, antes de cerrar archivo)

- [ ] **Step 1: Añadir `getShopB2bPricing`**

```js
// Lee el shop metafield b2b.pricing (json string) para el display B2B en el Next.
// Devuelve el string del value o null. NO parsea (lo hace parsePricingConfig).
export async function getShopB2bPricing() {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) return null
  const query = `{ shop { metafield(namespace: "b2b", key: "pricing") { value } } }`
  try {
    const json = await adminData(query)
    return json?.data?.shop?.metafield?.value ?? null
  } catch {
    return null
  }
}
```

- [ ] **Step 2: typecheck** — Run: `npm run typecheck` · Expected: sin errores nuevos. (`getB2bPricingConfig` de Task 1 ya resuelve este import.)

- [ ] **Step 3: Commit**

```bash
git add lib/shopify-admin.js
git commit -m "feat(b2b): read shop b2b.pricing metafield for storefront display"
```

---

## Task 3: Carrito — fragment con cost/descuento + server action `syncCartBuyer`

> Depende de Plan A desplegado para ver el descuento; sin A, devuelve subtotal == total (no rompe).

**Files:**
- Modify: `lib/shopify.js` (`CART_LINES_FRAGMENT`, ~líneas 58-75)
- Create: `app/(frontend)/cart/actions.ts`

- [ ] **Step 1: Ampliar `CART_LINES_FRAGMENT`** en `lib/shopify.js` — reemplazar el bloque actual por:

```js
const CART_LINES_FRAGMENT = `
  id
  checkoutUrl
  discountCodes { code applicable }
  cost {
    subtotalAmount { amount currencyCode }
    totalAmount { amount currencyCode }
  }
  discountAllocations {
    discountedAmount { amount currencyCode }
    ... on CartAutomaticDiscountAllocation { title }
    ... on CartCodeDiscountAllocation { code }
  }
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        merchandise {
          ... on ProductVariant {
            id
          }
        }
      }
    }
  }
`
```

- [ ] **Step 2: Crear `app/(frontend)/cart/actions.ts`**

```ts
'use server'

import {cartBuyerIdentityUpdate} from '@/lib/shopify'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {isB2bApproved} from '@/lib/b2b/isB2bApproved'

export interface CartCost {
  subtotal: number
  total: number
  discount: number
  discountTitle: string | null
  currency: string
}

function readCost(cart: any): CartCost | null {
  const c = cart?.cost
  if (!c?.subtotalAmount) return null
  const subtotal = Number(c.subtotalAmount.amount)
  const total = Number(c.totalAmount?.amount ?? c.subtotalAmount.amount)
  const alloc = Array.isArray(cart.discountAllocations) ? cart.discountAllocations[0] : null
  return {
    subtotal,
    total,
    discount: Math.max(0, subtotal - total),
    discountTitle: alloc?.title ?? alloc?.code ?? null,
    currency: c.subtotalAmount.currencyCode ?? 'EUR',
  }
}

// Sincroniza el buyerIdentity del carrito con la sesión:
//   B2B validado  → setea customerAccessToken (la Function aplica y el carrito refleja el descuento)
//   resto/logout  → limpia el buyerIdentity
// Devuelve el coste actualizado para que el cliente pinte subtotal/descuento/total.
export async function syncCartBuyer(cartId: string): Promise<{cost: CartCost | null}> {
  if (!cartId) return {cost: null}
  const session = await getCurrentCustomer()
  const buyerIdentity =
    session && isB2bApproved(session.customer)
      ? {customerAccessToken: session.token}
      : {customerAccessToken: null}
  const cart = await cartBuyerIdentityUpdate(cartId, buyerIdentity)
  return {cost: cart ? readCost(cart) : null}
}
```

- [ ] **Step 3: typecheck** — Run: `npm run typecheck` · Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/shopify.js "app/(frontend)/cart/actions.ts"
git commit -m "feat(b2b): cart cost/discount in fragment + syncCartBuyer server action"
```

---

## Task 4: Context — estado `cartCost` y llamadas a `syncCartBuyer`

**Files:**
- Modify: `context/shopContext.js`

- [ ] **Step 1: Importar la action y añadir estado** — al inicio del archivo, junto a los otros imports:

```js
import {syncCartBuyer} from '@/app/(frontend)/cart/actions'
```

Y dentro de `ShopProvider`, junto a los otros `useState` (tras `const [menuOpen, setMenuOpen] = useState(false)`):

```js
  const [cartCost, setCartCost] = useState(null)
```

- [ ] **Step 2: Sincronizar en mount** — dentro del `useEffect` de carga (tras `if (savedMeta?.checkoutUrl) setCheckoutUrl(savedMeta.checkoutUrl)`), añadir:

```js
      if (savedMeta?.id) {
        syncCartBuyer(savedMeta.id)
          .then((r) => setCartCost(r.cost))
          .catch(() => {})
      }
```

- [ ] **Step 3: Refrescar coste tras cada mutación** — al final de `addToCart`, `addLookToCart`, `updateCartItem` y `removeCartItem`, justo después del `saveToStorage(...)` de cada rama de éxito, añadir (usando el `cartId`/`currentCartId` de esa rama):

```js
        syncCartBuyer(meta.id).then((r) => setCartCost(r.cost)).catch(() => {})
```

> En `addToCart` primera rama el meta es `{id: apiCart.id, ...}`; usar `apiCart.id`. En las demás, `meta.id`.

- [ ] **Step 4: Exponer en el provider + helper de login/logout** — añadir al objeto `value`:

```js
        cartCost,
        refreshCartBuyer: () => {
          if (cartId) syncCartBuyer(cartId).then((r) => setCartCost(r.cost)).catch(() => {})
        },
```

- [ ] **Step 5: typecheck + build** — Run: `npm run typecheck` · Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add context/shopContext.js
git commit -m "feat(b2b): track cart cost + sync buyer identity on cart changes"
```

---

## Task 5: Disparar `refreshCartBuyer` al login y logout

**Files:**
- Modify: `components/Account/LoginForm/LoginForm.tsx` y `components/B2B/B2bLogin/B2bLogin.tsx` (tras `loginAction` ok)
- Modify: el componente/acción de logout (localizar con `grep -rn "clearCustomerSession\|logout" components/ app/`)

- [ ] **Step 1: En el handler de login** (en ambos forms), tras recibir `res.ok === true` y antes/después del `router.push`/refresh, llamar al context:

```tsx
// junto a los otros hooks del componente:
const ctx = useContext(CartContext)
// dentro del submit, tras login correcto:
ctx?.refreshCartBuyer?.()
```

(Importar `useContext` de react y `CartContext` de `@/context/shopContext` si no está.)

- [ ] **Step 2: En el logout**, tras limpiar la sesión, llamar igualmente `ctx?.refreshCartBuyer?.()` para limpiar el descuento del carrito.

- [ ] **Step 3: Verificar manualmente** (tras Plan A desplegado): login como reseller con un carrito existente → el carrito refleja el descuento; logout → desaparece.

- [ ] **Step 4: Commit**

```bash
git add components/Account/LoginForm/LoginForm.tsx components/B2B/B2bLogin/B2bLogin.tsx
git commit -m "feat(b2b): refresh cart buyer identity on login/logout"
```

---

## Task 6: CartDrawer — subtotal / descuento / total

**Files:**
- Modify: `components/Layout/CartDrawer/CartDrawer.tsx`
- Modify: `components/Layout/CartDrawer/CartDrawer.module.scss`

- [ ] **Step 1: Leer `cartCost` del context** — donde el componente ya consume `CartContext` (`const ctx = useContext(CartContext)`), usar `ctx?.cartCost`.

- [ ] **Step 2: Render del resumen** — en el `<footer>` (líneas ~171-183), encima de los botones, añadir el bloque de totales (mobile-first, anida según HTML):

```tsx
{ctx?.cartCost && (
  <div className={s.summary}>
    <div className={s.row}>
      <span>Subtotal</span>
      <span>{FMT.format(ctx.cartCost.subtotal)}</span>
    </div>
    {ctx.cartCost.discount > 0 && (
      <div className={`${s.row} ${s.discount}`}>
        <span>{ctx.cartCost.discountTitle ?? 'Descuento'}</span>
        <span>−{FMT.format(ctx.cartCost.discount)}</span>
      </div>
    )}
    <div className={`${s.row} ${s.total}`}>
      <span>Total</span>
      <span>{FMT.format(ctx.cartCost.total)}</span>
    </div>
  </div>
)}
```

- [ ] **Step 2b: SCSS** — en `CartDrawer.module.scss`, dentro del selector del footer (anidado como en el HTML):

```scss
.summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 0;

  .row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;

    &.discount {
      color: #2b2b2b;
    }

    &.total {
      font-weight: 700;
    }
  }
}
```

- [ ] **Step 3: Verificar** — Run: `npm run dev` (lo lanza el usuario). B2C: subtotal == total, sin línea de descuento. (Reseller/designer requieren Plan A — smoke en Task 9.)

- [ ] **Step 4: Commit**

```bash
git add components/Layout/CartDrawer/CartDrawer.tsx components/Layout/CartDrawer/CartDrawer.module.scss
git commit -m "feat(b2b): show subtotal/discount/total in cart drawer from Shopify cart cost"
```

---

## Task 7: Display reseller en listados (shop + búsqueda)

**Files:**
- Modify: `app/(frontend)/shop/actions.ts` (y/o `ShopArchive.tsx` — donde se construyen las cards server-side)
- Modify: `app/(frontend)/search/actions.ts`

> Las cards (`ProductCardData`) se construyen en estas server actions/loaders. Aplicamos el % reseller justo antes de devolverlas. `PriceDisplay` ya pinta `compareAt` tachado.

- [ ] **Step 1: shop** — en `app/(frontend)/shop/actions.ts`, importar y aplicar:

```ts
import {getResellerPercent, applyResellerToCard} from '@/lib/b2b/pricing'
```

Localizar la función que devuelve el array de `ProductCardData` (la que alimenta `ProductGrid`/infinite scroll). Antes del `return cards`, añadir:

```ts
  const percent = await getResellerPercent()
  const out = percent ? cards.map((c) => applyResellerToCard(c, percent)) : cards
  return out
```

(Sustituir `cards` por el nombre real de la variable que se devuelve.)

- [ ] **Step 2: search** — repetir el mismo patrón en `app/(frontend)/search/actions.ts` sobre el array de resultados de tipo `ProductCardData`.

- [ ] **Step 3: typecheck** — Run: `npm run typecheck` · Expected: sin errores.

- [ ] **Step 4: Verificar** — como reseller logueado, los listados muestran precio ×0,5 con el original tachado; B2C/designer ven precio normal.

- [ ] **Step 5: Commit**

```bash
git add "app/(frontend)/shop/actions.ts" "app/(frontend)/search/actions.ts"
git commit -m "feat(b2b): reseller -50% display in shop + search listings"
```

---

## Task 8: Display reseller en PDP (PriceLabel + ProductView)

**Files:**
- Modify: `components/Product/shared/PriceLabel.tsx`
- Modify: `app/(frontend)/products/[handle]/page.tsx`
- Modify: `types/product.ts` (ProductView: campos opcionales de comparación)

- [ ] **Step 1: Extender `PriceLabel`** para tachar el original — reemplazar el componente por:

```tsx
interface Props {
  min: number
  max?: number
  currency: string
  // Precio original (tachado) cuando hay descuento B2B aplicado al display.
  compareMin?: number
  compareMax?: number
}

const FMT = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export default function PriceLabel({min, max, currency, compareMin}: Props) {
  if (currency !== 'EUR') {
    return (
      <span>
        {min}
        {max && max !== min ? ` - ${max}` : ''} {currency}
      </span>
    )
  }
  const minStr = FMT.format(min)
  const priceStr = max === undefined || max === min ? minStr : `${minStr} - ${FMT.format(max)}`
  if (typeof compareMin === 'number' && compareMin > min) {
    return (
      <span>
        <s style={{opacity: 0.5, marginRight: 8}}>{FMT.format(compareMin)}</s>
        {priceStr}
      </span>
    )
  }
  return <span>{priceStr}</span>
}
```

- [ ] **Step 2: ProductView opcionales** — en `types/product.ts`, en el type `ProductView`, añadir:

```ts
  compareMinPrice?: number
  compareMaxPrice?: number
```

- [ ] **Step 3: Aplicar en la PDP** — en `app/(frontend)/products/[handle]/page.tsx`, tras construir el `view` (`buildProductView(...)`), añadir:

```ts
import {getResellerPercent, resellerPrice} from '@/lib/b2b/pricing'
// ...
const percent = await getResellerPercent()
const viewForDisplay = percent
  ? {
      ...view,
      compareMinPrice: view.minPrice,
      compareMaxPrice: view.maxPrice,
      minPrice: resellerPrice(view.minPrice, percent),
      maxPrice: resellerPrice(view.maxPrice, percent),
    }
  : view
```

Pasar `viewForDisplay` (en vez de `view`) a los componentes que lo consumen (`DesktopToolbar`, `MobileToolbar`, etc.).

- [ ] **Step 4: Pasar el original a los toolbars** — en `DesktopToolbar.tsx` y `MobileToolbar.tsx`, en el `<PriceLabel ...>` añadir `compareMin={view.compareMinPrice} compareMax={view.compareMaxPrice}`.

- [ ] **Step 5: typecheck** — Run: `npm run typecheck` · Expected: sin errores.

- [ ] **Step 6: Verificar** — como reseller, la PDP muestra el precio ×0,5 con el original tachado; designer/B2C precio normal.

- [ ] **Step 7: Commit**

```bash
git add components/Product/shared/PriceLabel.tsx types/product.ts "app/(frontend)/products/[handle]/page.tsx" components/Product/Desktop/DesktopToolbar.tsx components/Product/Mobile/MobileToolbar.tsx
git commit -m "feat(b2b): reseller -50% display on PDP with struck-through original"
```

---

## Task 9: Smoke end-to-end (requiere Plan A desplegado)

- [ ] **Step 1: Reseller** — login como cliente `b2b.client_type=reseller`, `b2b.validated=true`:
  - PDP/listados/búsqueda → precio ×0,5 con original tachado.
  - Carrito → subtotal, línea "Descuento mayorista 50%", total = subtotal/2.
  - Checkout → 50% (la Function).

- [ ] **Step 2: Designer** — login como `designer`:
  - PDP/listados → precio completo (sin tachar).
  - Carrito subtotal 500 → −15%; 5.000 → −20%; 50.000 → −30% (línea + total correctos).
  - Checkout → mismo tramo.

- [ ] **Step 3: B2C** — sin sesión / cliente normal: precios completos en todo; carrito subtotal == total, sin línea de descuento; checkout sin descuento.

- [ ] **Step 4: Cambio de config sin redeploy** — editar `b2b.pricing` en Admin (ej. resellerPercent 40); invalidar caché (recarga) → reseller ve 40% en tienda y checkout.

---

## Self-review (cobertura vs spec)

| Requisito spec (§) | Task |
|---|---|
| Config compartida `b2b.pricing` leída por el Next (§4.1) | 1, 2 |
| `resellerDisplayPrice` + detección de tipo B2B (§4.1) | 1 |
| Reseller −50% en PDP/listados (§4.2) | 7, 8 |
| Designer completo en PDP/listados (§4.2, §9) | 7, 8 (no se transforma designer) |
| buyerIdentity en carrito al login/logout (§4.3) | 3, 4, 5 |
| Carrito muestra descuento real desde `cart.cost`/`discountAllocations` (§4.4) | 3, 4, 6 |
| Degradar sin romper (config null, fallo buyerIdentity) (§6) | 1 (config null→0), 3 (token null) |
| Tests del helper puro (§7) | 1 |
| Smoke reseller/designer/B2C (§7) | 9 |

**Notas para el ejecutor:**
- Las Tasks 1, 2, 7, 8 (display reseller) no dependen de Plan A; pueden ejecutarse y verificarse antes. Las Tasks 3–6 muestran el descuento real del carrito y necesitan A desplegado para ver números (sin A, subtotal == total, no rompe).
- El designer NUNCA se transforma en frontend: en PDP/listados se ve precio completo (decisión de diseño §9); en el carrito el descuento llega del Storefront Cart API.
- Confirmar al ejecutar Task 7 el nombre real de la variable de cards en `shop/actions.ts`/`search/actions.ts` y en Task 8 los props que pasan los toolbars (leer el archivo antes de editar).
- Riesgo abierto (spec §10): que el descuento de Function aparezca en `cart.cost` del Storefront API con buyerIdentity seteado. Validar en Task 9 Step 1; si no apareciera, fallback = calcular el descuento en `syncCartBuyer`/CartDrawer espejando la lógica (designer incluido).
```
