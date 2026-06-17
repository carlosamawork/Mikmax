# B2B Fase 3A — Nudge de tramos en el carrito (designer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En el carrito, un cliente designer ve cuánto le falta para el siguiente tramo de descuento ("Añade 250 € más para alcanzar el 20%"). Solo presentación.

**Architecture:** Una server action devuelve `{isDesigner, designerTiers}` para la sesión; el ShopProvider lo hidrata junto a `cartCost`; el CartDrawer calcula el nudge con una función pura desde `cartCost.subtotal`.

**Tech Stack:** Next.js 15 (server actions) · React context · Vitest.

**Spec:** `docs/superpowers/specs/2026-06-17-mikmax-b2b-fase3-design.md`
**Depende de:** Fase 2 (cart actions, `cartCost`, CartDrawer) ya en `staging`.

---

## File structure
```
lib/b2b/cartCost.ts          MOD   + nextTierNudge (pura, client-safe)
app/(frontend)/cart/actions.ts  MOD   + getB2bCartContext server action
context/shopContext.js       MOD   estado b2bCartContext + hidratación + expose
components/Layout/CartDrawer/CartDrawer.tsx       MOD  render del nudge
components/Layout/CartDrawer/CartDrawer.module.scss  MOD  estilo del nudge
__tests__/b2b/nextTierNudge.test.ts   NUEVO
```

---

## Task 1: `nextTierNudge` — función pura (TDD)

**Files:**
- Modify: `lib/b2b/cartCost.ts`
- Test: `__tests__/b2b/nextTierNudge.test.ts`

> `lib/b2b/cartCost.ts` es client-safe (solo importa el tipo `CartCost`). El CartDrawer (client) lo importa. NO meter aquí nada server-only.

- [ ] **Step 1: Test que falla** — `__tests__/b2b/nextTierNudge.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {nextTierNudge} from '@/lib/b2b/cartCost'

const TIERS = [
  {minSubtotal: 0, percent: 15},
  {minSubtotal: 1000, percent: 20},
  {minSubtotal: 10000, percent: 30},
]

describe('nextTierNudge', () => {
  it('devuelve gap y percent del siguiente tramo', () => {
    expect(nextTierNudge(500, TIERS)).toEqual({gap: 500, percent: 20})
    expect(nextTierNudge(1500, TIERS)).toEqual({gap: 8500, percent: 30})
  })
  it('en el borde del tramo apunta al siguiente', () => {
    expect(nextTierNudge(1000, TIERS)).toEqual({gap: 9000, percent: 30})
  })
  it('en el tramo máximo devuelve null', () => {
    expect(nextTierNudge(10000, TIERS)).toBeNull()
    expect(nextTierNudge(50000, TIERS)).toBeNull()
  })
  it('sin tramos devuelve null', () => {
    expect(nextTierNudge(500, [])).toBeNull()
  })
})
```

- [ ] **Step 2: Ejecutar (falla)** — Run: `npx vitest run __tests__/b2b/nextTierNudge.test.ts` · Expected: FAIL.

- [ ] **Step 3: Implementar** — añadir al final de `lib/b2b/cartCost.ts`:
```ts
export interface DesignerTierLite {
  minSubtotal: number
  percent: number
}

// Siguiente tramo de descuento alcanzable, o null si ya está en el máximo.
export function nextTierNudge(
  subtotal: number,
  tiers: DesignerTierLite[],
): {gap: number; percent: number} | null {
  const sorted = [...tiers].sort((a, b) => a.minSubtotal - b.minSubtotal)
  const next = sorted.find((t) => t.minSubtotal > subtotal)
  if (!next) return null
  return {gap: next.minSubtotal - subtotal, percent: next.percent}
}
```

- [ ] **Step 4: Ejecutar (pasa)** — Run: `npx vitest run __tests__/b2b/nextTierNudge.test.ts` · Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/b2b/cartCost.ts __tests__/b2b/nextTierNudge.test.ts
git commit -m "feat(b2b): nextTierNudge pure helper"
```

---

## Task 2: `getB2bCartContext` server action

**Files:**
- Modify: `app/(frontend)/cart/actions.ts`

- [ ] **Step 1: Añadir la acción** — al final de `app/(frontend)/cart/actions.ts`:
```ts
import {getB2bPricingConfig} from '@/lib/b2b/pricing'

export interface B2bCartContext {
  isDesigner: boolean
  designerTiers: {minSubtotal: number; percent: number}[]
}

// Contexto B2B para el carrito: si la sesión es un designer validado, devuelve sus tramos
// (para el nudge "añade X € para el siguiente tramo"). Reseller / B2C -> isDesigner false.
export async function getB2bCartContext(): Promise<B2bCartContext> {
  const session = await getCurrentCustomer()
  const isDesigner =
    !!session &&
    isB2bApproved(session.customer) &&
    session.customer.b2bClientType?.value === 'designer'
  if (!isDesigner) return {isDesigner: false, designerTiers: []}
  const cfg = await getB2bPricingConfig()
  return {isDesigner: true, designerTiers: cfg?.designerTiers ?? []}
}
```
(`getCurrentCustomer`, `isB2bApproved` ya están importados en el archivo. Añade solo el import de `getB2bPricingConfig`.)

- [ ] **Step 2: typecheck** — Run: `npm run typecheck` · Expected: sin errores.

- [ ] **Step 3: Commit**
```bash
git add "app/(frontend)/cart/actions.ts"
git commit -m "feat(b2b): getB2bCartContext server action (designer tiers)"
```

---

## Task 3: Hidratar `b2bCartContext` en el contexto

**Files:**
- Modify: `context/shopContext.js`

> Lee el archivo. Ya tiene estado `cartCost`, lo hidrata en el mount con `getCartCost(savedMeta.id)` y en `refreshCartBuyer` con `syncCartBuyer`. Replica ese patrón para el contexto B2B.

- [ ] **Step 1: Importar la acción** — añadir al import existente desde `@/app/(frontend)/cart/actions`:
```js
import {syncCartBuyer, getCartCost, getB2bCartContext} from '@/app/(frontend)/cart/actions'
```

- [ ] **Step 2: Estado** — junto al `const [cartCost, setCartCost] = useState(null)`:
```js
  const [b2bCartContext, setB2bCartContext] = useState({isDesigner: false, designerTiers: []})
```

- [ ] **Step 3: Hidratar en mount** — en el `useEffect` de carga, junto a la llamada a `getCartCost`, añadir (no depende del cartId, es la sesión):
```js
      getB2bCartContext()
        .then(setB2bCartContext)
        .catch(() => {})
```

- [ ] **Step 4: Refrescar en login/logout** — dentro de `refreshCartBuyer`, junto al `syncCartBuyer(...)`, añadir:
```js
          getB2bCartContext().then(setB2bCartContext).catch(() => {})
```

- [ ] **Step 5: Exponer en el provider** — añadir `b2bCartContext,` al objeto `value={{...}}`.

- [ ] **Step 6: typecheck** — Run: `npm run typecheck` · Expected: sin errores.

- [ ] **Step 7: Commit**
```bash
git add context/shopContext.js
git commit -m "feat(b2b): expose designer cart context (isDesigner + tiers)"
```

---

## Task 4: Render del nudge en CartDrawer

**Files:**
- Modify: `components/Layout/CartDrawer/CartDrawer.tsx`
- Modify: `components/Layout/CartDrawer/CartDrawer.module.scss`

> El CartDrawer ya consume `CartContext` (`ctx`), ya tiene `ctx.cartCost` y el formateador `FMT`, y ya renderiza el bloque `.summary` con subtotal/descuento/total.

- [ ] **Step 1: Importar el helper + tipar el contexto** — añadir:
```tsx
import {nextTierNudge} from '@/lib/b2b/cartCost'
```
Y en el type del contexto que usa el componente (`CartCtx`), añadir el campo:
```tsx
  b2bCartContext?: {isDesigner: boolean; designerTiers: {minSubtotal: number; percent: number}[]}
```

- [ ] **Step 2: Render del nudge** — dentro del bloque `.summary` (donde está la línea de descuento), DESPUÉS de la fila de descuento y ANTES de la fila de total, añadir:
```tsx
{ctx?.b2bCartContext?.isDesigner && ctx?.cartCost && (() => {
  const nudge = nextTierNudge(ctx.cartCost.subtotal, ctx.b2bCartContext.designerTiers)
  const maxPercent = Math.max(0, ...ctx.b2bCartContext.designerTiers.map((t) => t.percent))
  return (
    <div className={`${s.summaryRow} ${s.nudge}`}>
      {nudge
        ? `Añade ${FMT.format(nudge.gap)} más para alcanzar el ${nudge.percent}%`
        : `Tienes el descuento profesional máximo (${maxPercent}%)`}
    </div>
  )
})()}
```

- [ ] **Step 2b: SCSS** — en `CartDrawer.module.scss`, dentro del selector `.summary` (anidado como el resto), añadir:
```scss
.nudge {
  font-size: 13px;
  color: #2b2b2b;
  opacity: 0.8;
  justify-content: flex-start;
}
```

- [ ] **Step 3: typecheck + prettier** — Run: `npm run typecheck` y `npx prettier --check components/Layout/CartDrawer/CartDrawer.tsx` · Expected: limpios.

- [ ] **Step 4: Verificación** — Run: `npx vitest run` · Expected: tests verdes (incl. el nuevo `nextTierNudge`). Smoke manual (con la Function viva): designer con subtotal 500 → ve "Añade 500 € más para alcanzar el 20%"; con 12.000 → "máximo (30%)"; reseller/B2C → sin nudge.

- [ ] **Step 5: Commit**
```bash
git add components/Layout/CartDrawer/CartDrawer.tsx components/Layout/CartDrawer/CartDrawer.module.scss
git commit -m "feat(b2b): designer next-tier nudge in cart drawer"
```

---

## Self-review (cobertura vs spec, sub-feature A)

| Requisito spec | Task |
|---|---|
| Server action `{isDesigner, designerTiers}` | 2 |
| Hidratar en mount + login/logout sin round-trip extra | 3 |
| Cálculo del siguiente tramo (`nextTierNudge`) | 1 |
| Render "Añade X € para el Y%" + tramo máximo | 4 |
| Solo designers (reseller/B2C sin nudge) | 2 (isDesigner), 4 (guard) |
| Degradar: sin tiers/config → sin nudge | 1 (null), 2 ([]) |
| Tests del helper | 1 |
