# B2B Fase 2A — Motor de descuento (Shopify Function) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una Shopify Function (Order Discount) en una app custom que aplica el descuento B2B en checkout: reseller 50% y designer escalado por subtotal, leyendo los metafields `b2b.*` del cliente y la config desde un metafield `b2b.pricing` de la tienda.

**Architecture:** App Shopify (Shopify CLI) en un **repo nuevo separado** `mikmax-shopify-app`, con una extensión Function de tipo "Order discount" en JavaScript/TypeScript. La **lógica de precios es pura y testeable** (`pricing.ts`), y `run.ts` es un adaptador fino que mapea el input de la Function a esa lógica y construye el output. Un script de setup (Admin API) crea el descuento automático y el metafield de config.

**Tech Stack:** Shopify CLI · Shopify Functions (Order Discount API, JS) · Vitest · Admin GraphQL API.

**Spec:** `docs/superpowers/specs/2026-06-16-mikmax-b2b-fase2a-discount-engine-design.md`

> ⚠️ Este plan se ejecuta en un **repo nuevo** (`mikmax-shopify-app`), NO en el repo Next/Vercel. Requiere `shopify` CLI instalado y login en una cuenta con acceso a la tienda `mikmax-2026`.

---

## File structure (en el repo nuevo `mikmax-shopify-app`)

```
shopify.app.toml                          generado por la CLI (scopes, nombre)
package.json
extensions/b2b-discount/
  shopify.extension.toml                  config de la extensión (API version, target)
  src/
    pricing.ts                            LÓGICA PURA: parse config + decidir %
    pricing.test.ts                       tests unitarios (TDD)
    run.ts                                adaptador: input Function -> pricing -> output
    run.graphql                           input query (customer metafields + shop pricing + subtotal)
vitest.config.ts
scripts/
  setup.mjs                               Admin API: crea metafield b2b.pricing + descuento automático
```

---

## Task 0: Scaffold de la app + extensión (CLI, interactivo)

**Requisitos previos:** `shopify` CLI instalado (`npm i -g @shopify/cli@latest`), login (`shopify auth login`) con acceso a la tienda. Cuenta Partner o tienda con "custom apps" habilitado.

- [ ] **Step 1: Crear la app**

Run (en el directorio padre donde quieres el repo nuevo):
```bash
shopify app init --name mikmax-shopify-app
```
Elegir: plantilla **"Start with Remix"** o **"None"** (no necesitamos UI). Lenguaje JS/TS.
Expected: se crea la carpeta `mikmax-shopify-app/` con `shopify.app.toml` y `package.json`.

- [ ] **Step 2: Generar la extensión Function de descuento**

Run (dentro de `mikmax-shopify-app/`):
```bash
shopify app generate extension --type=order_discounts --name=b2b-discount --flavor=typescript
```
(Si la versión de la CLI usa otro identificador, elegir en el menú interactivo: **Function → Discounts → Order discount → TypeScript**.)
Expected: se crea `extensions/b2b-discount/` con `src/run.ts`, `src/run.graphql`, `shopify.extension.toml`.

- [ ] **Step 3: Commit del scaffold**

```bash
cd mikmax-shopify-app && git init && git add -A
git commit -m "chore: scaffold shopify app + b2b-discount order-discount function"
```

> A partir de aquí, todas las rutas son relativas a `mikmax-shopify-app/`.

---

## Task 1: Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar vitest**

Run: `npm install -D vitest`

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import {defineConfig} from 'vitest/config'

export default defineConfig({
  test: {include: ['extensions/**/*.test.ts']},
})
```

- [ ] **Step 3: Añadir script a `package.json`**

En `"scripts"`: `"test": "vitest run"`.

- [ ] **Step 4: Verificar**

Run: `npm test`
Expected: "No test files found" o equivalente, exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest"
```

---

## Task 2: Lógica de precios pura (`pricing.ts`) — TDD

**Files:**
- Create: `extensions/b2b-discount/src/pricing.ts`
- Test: `extensions/b2b-discount/src/pricing.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`extensions/b2b-discount/src/pricing.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {parsePricingConfig, tierPercent, computeDiscountPercent} from './pricing'

const CFG = {
  resellerPercent: 50,
  designerTiers: [
    {minSubtotal: 0, percent: 15},
    {minSubtotal: 1000, percent: 20},
    {minSubtotal: 10000, percent: 30},
  ],
}

describe('parsePricingConfig', () => {
  it('parsea un JSON válido', () => {
    expect(parsePricingConfig(JSON.stringify(CFG))).toEqual(CFG)
  })
  it('devuelve null si es null/inválido/malformado', () => {
    expect(parsePricingConfig(null)).toBeNull()
    expect(parsePricingConfig('not json')).toBeNull()
    expect(parsePricingConfig('{}')).toBeNull()
    expect(parsePricingConfig(JSON.stringify({resellerPercent: 50}))).toBeNull()
  })
})

describe('tierPercent', () => {
  it('elige el tramo con mayor minSubtotal <= subtotal', () => {
    expect(tierPercent(CFG.designerTiers, 500)).toBe(15)
    expect(tierPercent(CFG.designerTiers, 999)).toBe(15)
    expect(tierPercent(CFG.designerTiers, 1000)).toBe(20)
    expect(tierPercent(CFG.designerTiers, 9999)).toBe(20)
    expect(tierPercent(CFG.designerTiers, 10000)).toBe(30)
    expect(tierPercent(CFG.designerTiers, 50000)).toBe(30)
  })
})

describe('computeDiscountPercent', () => {
  const base = {config: CFG, validated: 'true', subtotal: 500}
  it('0 si no validado o sin clientType', () => {
    expect(computeDiscountPercent({...base, clientType: 'reseller', validated: 'false'})).toBe(0)
    expect(computeDiscountPercent({...base, clientType: null, validated: 'true'})).toBe(0)
  })
  it('0 si config es null', () => {
    expect(computeDiscountPercent({...base, config: null, clientType: 'reseller'})).toBe(0)
  })
  it('reseller -> resellerPercent', () => {
    expect(computeDiscountPercent({...base, clientType: 'reseller'})).toBe(50)
  })
  it('designer -> tramo por subtotal', () => {
    expect(computeDiscountPercent({...base, clientType: 'designer', subtotal: 500})).toBe(15)
    expect(computeDiscountPercent({...base, clientType: 'designer', subtotal: 5000})).toBe(20)
    expect(computeDiscountPercent({...base, clientType: 'designer', subtotal: 50000})).toBe(30)
  })
  it('clientType desconocido -> 0', () => {
    expect(computeDiscountPercent({...base, clientType: 'other'})).toBe(0)
  })
})
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `npx vitest run extensions/b2b-discount/src/pricing.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Implementar `pricing.ts`**

```ts
export interface DesignerTier {
  minSubtotal: number
  percent: number
}

export interface PricingConfig {
  resellerPercent: number
  designerTiers: DesignerTier[]
}

// Parsea y valida la forma; null si falta algo o es inválido.
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

// Mayor minSubtotal <= subtotal.
export function tierPercent(tiers: DesignerTier[], subtotal: number): number {
  let best = 0
  let bestMin = -1
  for (const t of tiers) {
    if (subtotal >= t.minSubtotal && t.minSubtotal > bestMin) {
      best = t.percent
      bestMin = t.minSubtotal
    }
  }
  return best
}

export function computeDiscountPercent(args: {
  config: PricingConfig | null
  clientType: string | null | undefined
  validated: string | null | undefined
  subtotal: number
}): number {
  const {config, clientType, validated, subtotal} = args
  if (!config) return 0
  if (validated !== 'true') return 0
  if (clientType === 'reseller') return config.resellerPercent
  if (clientType === 'designer') return tierPercent(config.designerTiers, subtotal)
  return 0
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `npx vitest run extensions/b2b-discount/src/pricing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add extensions/b2b-discount/src/pricing.ts extensions/b2b-discount/src/pricing.test.ts
git commit -m "feat(b2b-discount): pure pricing logic (reseller flat + designer tiers)"
```

---

## Task 3: Input query + adaptador `run.ts`

**Files:**
- Modify/Create: `extensions/b2b-discount/src/run.graphql`
- Modify: `extensions/b2b-discount/src/run.ts`
- Test: `extensions/b2b-discount/src/run.test.ts`

> Las firmas exactas (`RunInput`, `FunctionRunResult`, `DiscountApplicationStrategy`) las genera la CLI a partir de `run.graphql` (typegen). Usa los tipos generados; abajo va la forma esperada del Order Discount API.

- [ ] **Step 1: Definir el input (`run.graphql`)**

```graphql
query RunInput {
  cart {
    cost {
      subtotalAmount {
        amount
      }
    }
    buyerIdentity {
      customer {
        clientType: metafield(namespace: "b2b", key: "client_type") {
          value
        }
        validated: metafield(namespace: "b2b", key: "validated") {
          value
        }
      }
    }
  }
  shop {
    pricing: metafield(namespace: "b2b", key: "pricing") {
      value
    }
  }
}
```

- [ ] **Step 2: Regenerar tipos**

Run: `npm run shopify -- app function typegen` (o `shopify app function typegen` dentro de la extensión).
Expected: se actualiza `generated/api.ts` con `RunInput`/`FunctionRunResult`.

- [ ] **Step 3: Escribir el test del adaptador (`run.test.ts`)**

```ts
import {describe, it, expect} from 'vitest'
import {run} from './run'

const CFG = JSON.stringify({
  resellerPercent: 50,
  designerTiers: [
    {minSubtotal: 0, percent: 15},
    {minSubtotal: 1000, percent: 20},
    {minSubtotal: 10000, percent: 30},
  ],
})

function input(opts: {clientType?: string; validated?: string; subtotal?: string; pricing?: string | null}) {
  return {
    cart: {
      cost: {subtotalAmount: {amount: opts.subtotal ?? '500'}},
      buyerIdentity: {
        customer: opts.clientType
          ? {clientType: {value: opts.clientType}, validated: {value: opts.validated ?? 'true'}}
          : null,
      },
    },
    shop: {pricing: opts.pricing === undefined ? {value: CFG} : opts.pricing ? {value: opts.pricing} : null},
  } as any
}

describe('run (order discount adapter)', () => {
  it('sin customer -> sin descuento', () => {
    expect(run(input({})).discounts).toEqual([])
  })
  it('reseller -> 50%', () => {
    const r = run(input({clientType: 'reseller'}))
    expect(r.discounts[0].value).toEqual({percentage: {value: '50'}})
    expect(r.discounts[0].targets[0]).toHaveProperty('orderSubtotal')
    expect(r.discounts[0].message).toContain('50')
  })
  it('designer 5000 -> 20%', () => {
    const r = run(input({clientType: 'designer', subtotal: '5000'}))
    expect(r.discounts[0].value).toEqual({percentage: {value: '20'}})
  })
  it('no validado -> sin descuento', () => {
    expect(run(input({clientType: 'reseller', validated: 'false'})).discounts).toEqual([])
  })
  it('pricing ausente -> sin descuento', () => {
    expect(run(input({clientType: 'reseller', pricing: null})).discounts).toEqual([])
  })
})
```

- [ ] **Step 4: Ejecutar (debe fallar)**

Run: `npx vitest run extensions/b2b-discount/src/run.test.ts`
Expected: FAIL.

- [ ] **Step 5: Implementar `run.ts`**

```ts
import {parsePricingConfig, computeDiscountPercent} from './pricing'

// Order Discount Function API. Si la CLI generó tipos en ./generated/api, úsalos
// en lugar de `any` (RunInput / FunctionRunResult / DiscountApplicationStrategy.First).
const EMPTY = {discountApplicationStrategy: 'FIRST', discounts: []}

export function run(input: any) {
  const customer = input?.cart?.buyerIdentity?.customer
  const config = parsePricingConfig(input?.shop?.pricing?.value)
  const subtotal = Number(input?.cart?.cost?.subtotalAmount?.amount ?? '0')
  const clientType = customer?.clientType?.value as string | undefined

  const percent = computeDiscountPercent({
    config,
    clientType,
    validated: customer?.validated?.value,
    subtotal,
  })
  if (percent <= 0) return EMPTY

  const message = clientType === 'reseller' ? 'Descuento mayorista 50%' : `Descuento profesional ${percent}%`

  return {
    discountApplicationStrategy: 'FIRST',
    discounts: [
      {
        message,
        targets: [{orderSubtotal: {excludedVariantIds: []}}],
        value: {percentage: {value: String(percent)}},
      },
    ],
  }
}

export default run
```

> Al integrar con los tipos generados: cambia `'FIRST'` por `DiscountApplicationStrategy.First` y tipa `input` como `RunInput` y el retorno como `FunctionRunResult`. La forma (targets `orderSubtotal`, `value.percentage.value` como string) es la del Order Discount API.

- [ ] **Step 6: Ejecutar (debe pasar)**

Run: `npx vitest run extensions/b2b-discount/src/run.test.ts`
Expected: PASS.

- [ ] **Step 7: Verificar build de la Function**

Run: `npm run build` (en la extensión, compila a Wasm vía Javy).
Expected: compila sin errores. (Si falla por los tipos generados, ajustar `run.ts` a `DiscountApplicationStrategy.First` y tipos `RunInput`/`FunctionRunResult`.)

- [ ] **Step 8: Commit**

```bash
git add extensions/b2b-discount/src/run.ts extensions/b2b-discount/src/run.graphql extensions/b2b-discount/src/run.test.ts
git commit -m "feat(b2b-discount): function input + run adapter (order discount)"
```

---

## Task 4: Setup vía Admin API (metafield de config + descuento automático)

**Files:**
- Create: `scripts/setup.mjs`

> Este script crea: (a) la definición + valor del metafield `b2b.pricing` de la tienda, (b) el descuento automático vinculado a la Function. Usa las credenciales Admin de la tienda (token con `write_discounts`, `write_metaobjects`/`write_shop` no necesario; sí `write_discounts` y permiso de metafields de tienda). Se ejecuta UNA vez tras el primer `shopify app deploy` (para tener el `functionId`).

- [ ] **Step 1: Crear `scripts/setup.mjs`**

```js
// node --env-file=.env scripts/setup.mjs
// .env: SHOP_DOMAIN, ADMIN_TOKEN (shpat_ con write_discounts + metafields), FUNCTION_ID
const DOMAIN = process.env.SHOP_DOMAIN
const TOKEN = process.env.ADMIN_TOKEN
const FUNCTION_ID = process.env.FUNCTION_ID
const API = '2025-10'

async function gql(query, variables) {
  const res = await fetch(`https://${DOMAIN}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': TOKEN},
    body: JSON.stringify({query, variables}),
  })
  return res.json()
}

const DEFAULT_PRICING = JSON.stringify({
  resellerPercent: 50,
  designerTiers: [
    {minSubtotal: 0, percent: 15},
    {minSubtotal: 1000, percent: 20},
    {minSubtotal: 10000, percent: 30},
  ],
})

async function setShopPricingMetafield() {
  // Owner = la propia tienda. Necesita el Shop gid.
  const shop = await gql(`{ shop { id } }`)
  const ownerId = shop.data.shop.id
  const q = `mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{id} userErrors{field message} } }`
  const r = await gql(q, {
    m: [{ownerId, namespace: 'b2b', key: 'pricing', type: 'json', value: DEFAULT_PRICING}],
  })
  console.log('metafield b2b.pricing:', JSON.stringify(r.data?.metafieldsSet?.userErrors ?? r.errors))
}

async function createAutomaticDiscount() {
  const q = `
    mutation discountAutomaticAppCreate($discount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $discount) {
        automaticAppDiscount { discountId }
        userErrors { field message }
      }
    }`
  const r = await gql(q, {
    discount: {
      title: 'B2B discount',
      functionId: FUNCTION_ID,
      startsAt: '2026-01-01T00:00:00Z',
      combinesWith: {orderDiscounts: false, productDiscounts: false, shippingDiscounts: true},
    },
  })
  console.log('automatic discount:', JSON.stringify(r.data?.discountAutomaticAppCreate ?? r.errors))
}

await setShopPricingMetafield()
await createAutomaticDiscount()
```

- [ ] **Step 2: Verificación manual (tras el deploy de la Task 5)**

Run: `node --env-file=.env scripts/setup.mjs`
Expected: imprime sin `userErrors`; en Shopify Admin → Discounts aparece "B2B discount" (automático, de app); en Settings → Custom data → Shop metafields aparece `b2b.pricing`.

- [ ] **Step 3: Commit**

```bash
git add scripts/setup.mjs
git commit -m "feat(b2b-discount): setup script (pricing metafield + automatic discount)"
```

---

## Task 5: Deploy + smoke

- [ ] **Step 1: Deploy de la app/Function**

Run (en `mikmax-shopify-app/`): `shopify app deploy`
Expected: la Function se publica; la CLI muestra el **Function ID** (cópialo a `.env` como `FUNCTION_ID`).

- [ ] **Step 2: Ejecutar el setup** (Task 4 Step 2) con el `FUNCTION_ID` real.

- [ ] **Step 3: Smoke en checkout** (tienda real, con clientes de prueba con metafields `b2b.*`):

1. Cliente con `b2b.client_type=reseller`, `b2b.validated=true` → carrito → **50%** en el resumen ("Descuento mayorista 50%").
2. Cliente `designer` con subtotal 500 → 15%; 5.000 → 20%; 50.000 → 30%.
3. Cliente sin metafields b2b (B2C) → **sin descuento**.
4. Editar `b2b.pricing` (ej. resellerPercent 40) en Admin → nuevo carrito refleja 40% **sin redeploy**.

- [ ] **Step 4: Commit (notas de deploy si las hay)**

```bash
git add -A && git commit -m "chore: deploy notes" || echo "nada que commitear"
```

---

## Self-review (cobertura vs spec)

| Requisito spec | Task |
|---|---|
| Shopify Function (order discount) en app separada JS/TS | 0, 3 |
| Input: customer metafields + shop pricing + subtotal | 3 (run.graphql) |
| Lógica reseller 50% / designer tramos | 2 (pricing.ts) |
| No validado / B2C → sin descuento | 2, 3 |
| Config en metafield `b2b.pricing` (editable, sin redeploy) | 4, 5 (smoke step 4) |
| Descuento automático + combinesWith | 4 |
| Tests unitarios (tramos, bordes, robustez) | 2, 3 |
| Smoke checkout | 5 |

**Notas para el ejecutor:**
- La forma exacta del output (`DiscountApplicationStrategy.First`, targets `orderSubtotal`) la fija la versión del Order Discount API de la extensión generada — adapta `run.ts` a los tipos de `generated/api.ts` (la lógica de `pricing.ts` no cambia).
- Si Shopify pide la versión moderna unificada (`cart.lines.discounts.generate.run`), `pricing.ts` se reutiliza igual; solo cambia el adaptador `run.ts` y el target del `run.graphql`.
