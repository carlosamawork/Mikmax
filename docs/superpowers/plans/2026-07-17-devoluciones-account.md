# Devoluciones /account — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Solicitud de devolución (líneas + motivo) desde `/account/orders`, creada en Shopify como return "solicitada" + email interno.

**Architecture:** Helpers Admin API en `lib/shopify-admin.js` (returnStatus, returnableFulfillments, returnRequest) + lógica pura testeable en `lib/account/returns.ts` + server actions con verificación de propiedad + formulario expandible en `OrderCard`.

**Tech Stack:** Next.js 15 App Router, Admin API GraphQL (client_credentials), vitest.

**Spec:** `docs/superpowers/specs/2026-07-17-devoluciones-account-design.md`

## Global Constraints

- Repo storefront `/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax`, rama `feature/devoluciones-account` desde main. Prettier: sin punto y coma, comillas simples, 100 chars (`lib/shopify-admin.js` usa el estilo del archivo).
- Elegibilidad: `financialStatus === 'PAID'` + `processedAt` ≤ 30 días + `returnStatus` ∉ {`RETURN_REQUESTED`, `IN_PROGRESS`}.
- Motivos enum exactos: SIZE_TOO_SMALL, SIZE_TOO_LARGE, UNWANTED, NOT_AS_DESCRIBED, WRONG_ITEM, DEFECTIVE, COLOR, STYLE, OTHER.
- Propiedad SIEMPRE verificada: el `orderId` recibido debe existir en `session.customer.orders`.
- Strings UI en inglés hardcodeado (patrón actual de /account): "Request return", "Return requested", "Submit request", "No items available for return.", "Return requested — we'll email you once it's reviewed.".
- Email interno a `process.env.INTERNAL_NOTIFICATION_EMAIL`; su fallo NO bloquea la solicitud.
- Nunca `npm run dev`; nunca sudo. La verificación real contra Shopify requiere scopes nuevos (manual Carlos) — el código debe degradar con mensaje claro si faltan.

---

### Task R1: Lógica pura (`lib/account/returns.ts`) + tests

**Files:**
- Create: `lib/account/returns.ts`
- Test: `__tests__/account/returns.test.ts`

**Interfaces:**
- Produces: `isReturnEligible(o: {processedAt: string; financialStatus: string | null; returnStatus?: string | null}, now?: Date): boolean`; `adminOrderGid(storefrontId: string): string | null`; `RETURN_REASONS: {value: string; label: string}[]`; `validateSelections(selections: unknown, available: {fulfillmentLineItemId: string; maxQuantity: number}[]): {fulfillmentLineItemId: string; quantity: number; returnReason: string}[] | null` (null si inválidas: vacías, cantidad fuera de rango, motivo fuera del enum, id no disponible).

- [ ] **Step 1: Test (falla)** — `__tests__/account/returns.test.ts`:

```ts
import {describe, it, expect} from 'vitest'
import {
  isReturnEligible,
  adminOrderGid,
  validateSelections,
  RETURN_REASONS,
} from '@/lib/account/returns'

const NOW = new Date('2026-07-17T12:00:00Z')

describe('isReturnEligible', () => {
  const base = {processedAt: '2026-07-01T10:00:00Z', financialStatus: 'PAID', returnStatus: null}
  it('pagado, reciente y sin devolucion -> true', () => {
    expect(isReturnEligible(base, NOW)).toBe(true)
  })
  it('mas de 30 dias -> false (borde exacto 30 dias -> true)', () => {
    expect(isReturnEligible({...base, processedAt: '2026-06-16T11:00:00Z'}, NOW)).toBe(false)
    expect(isReturnEligible({...base, processedAt: '2026-06-17T12:00:00Z'}, NOW)).toBe(true)
  })
  it('no pagado -> false', () => {
    expect(isReturnEligible({...base, financialStatus: 'PENDING'}, NOW)).toBe(false)
    expect(isReturnEligible({...base, financialStatus: null}, NOW)).toBe(false)
  })
  it('devolucion en curso -> false', () => {
    expect(isReturnEligible({...base, returnStatus: 'RETURN_REQUESTED'}, NOW)).toBe(false)
    expect(isReturnEligible({...base, returnStatus: 'IN_PROGRESS'}, NOW)).toBe(false)
    expect(isReturnEligible({...base, returnStatus: 'RETURNED'}, NOW)).toBe(true)
  })
  it('fecha invalida -> false', () => {
    expect(isReturnEligible({...base, processedAt: ''}, NOW)).toBe(false)
  })
})

describe('adminOrderGid', () => {
  it('convierte el id Storefront (con ?key=) a GID Admin', () => {
    expect(adminOrderGid('gid://shopify/Order/6053622?key=abc123')).toBe(
      'gid://shopify/Order/6053622',
    )
    expect(adminOrderGid('gid://shopify/Order/6053622')).toBe('gid://shopify/Order/6053622')
  })
  it('id no reconocible -> null', () => {
    expect(adminOrderGid('')).toBeNull()
    expect(adminOrderGid('gid://shopify/Product/1')).toBeNull()
  })
})

describe('validateSelections', () => {
  const available = [
    {fulfillmentLineItemId: 'gid://shopify/FulfillmentLineItem/1', maxQuantity: 2},
    {fulfillmentLineItemId: 'gid://shopify/FulfillmentLineItem/2', maxQuantity: 1},
  ]
  it('seleccion valida -> normalizada', () => {
    expect(
      validateSelections(
        [{fulfillmentLineItemId: available[0].fulfillmentLineItemId, quantity: 2, returnReason: 'DEFECTIVE'}],
        available,
      ),
    ).toEqual([
      {fulfillmentLineItemId: 'gid://shopify/FulfillmentLineItem/1', quantity: 2, returnReason: 'DEFECTIVE'},
    ])
  })
  it('vacia, cantidad fuera de rango, motivo invalido o id desconocido -> null', () => {
    expect(validateSelections([], available)).toBeNull()
    expect(
      validateSelections(
        [{fulfillmentLineItemId: available[0].fulfillmentLineItemId, quantity: 3, returnReason: 'DEFECTIVE'}],
        available,
      ),
    ).toBeNull()
    expect(
      validateSelections(
        [{fulfillmentLineItemId: available[0].fulfillmentLineItemId, quantity: 1, returnReason: 'NOPE'}],
        available,
      ),
    ).toBeNull()
    expect(
      validateSelections([{fulfillmentLineItemId: 'gid://x/9', quantity: 1, returnReason: 'OTHER'}], available),
    ).toBeNull()
  })
})

describe('RETURN_REASONS', () => {
  it('enum completo de Shopify', () => {
    expect(RETURN_REASONS.map((r) => r.value)).toEqual([
      'SIZE_TOO_SMALL',
      'SIZE_TOO_LARGE',
      'UNWANTED',
      'NOT_AS_DESCRIBED',
      'WRONG_ITEM',
      'DEFECTIVE',
      'COLOR',
      'STYLE',
      'OTHER',
    ])
  })
})
```

- [ ] **Step 2: FAIL** — `npx vitest run __tests__/account/returns.test.ts`.
- [ ] **Step 3: Implementar** `lib/account/returns.ts`:

```ts
const RETURN_WINDOW_DAYS = 30
const BLOCKING_RETURN_STATUSES = new Set(['RETURN_REQUESTED', 'IN_PROGRESS'])

export const RETURN_REASONS = [
  {value: 'SIZE_TOO_SMALL', label: 'Too small'},
  {value: 'SIZE_TOO_LARGE', label: 'Too large'},
  {value: 'UNWANTED', label: 'No longer wanted'},
  {value: 'NOT_AS_DESCRIBED', label: 'Not as described'},
  {value: 'WRONG_ITEM', label: 'Wrong item received'},
  {value: 'DEFECTIVE', label: 'Damaged or defective'},
  {value: 'COLOR', label: 'Color not as expected'},
  {value: 'STYLE', label: 'Style not as expected'},
  {value: 'OTHER', label: 'Other'},
] as const

export function isReturnEligible(
  o: {processedAt: string; financialStatus: string | null; returnStatus?: string | null},
  now: Date = new Date(),
): boolean {
  if (o.financialStatus !== 'PAID') return false
  if (o.returnStatus && BLOCKING_RETURN_STATUSES.has(o.returnStatus)) return false
  const processed = Date.parse(o.processedAt)
  if (Number.isNaN(processed)) return false
  const ageDays = (now.getTime() - processed) / 86_400_000
  return ageDays <= RETURN_WINDOW_DAYS
}

// El id Storefront llega como gid://shopify/Order/123?key=... — el Admin usa el GID sin query.
export function adminOrderGid(storefrontId: string): string | null {
  const m = storefrontId.match(/^gid:\/\/shopify\/Order\/(\d+)/)
  return m ? `gid://shopify/Order/${m[1]}` : null
}

export interface ReturnSelection {
  fulfillmentLineItemId: string
  quantity: number
  returnReason: string
}

const VALID_REASONS = new Set(RETURN_REASONS.map((r) => r.value as string))

export function validateSelections(
  selections: unknown,
  available: {fulfillmentLineItemId: string; maxQuantity: number}[],
): ReturnSelection[] | null {
  if (!Array.isArray(selections) || selections.length === 0) return null
  const maxById = new Map(available.map((a) => [a.fulfillmentLineItemId, a.maxQuantity]))
  const out: ReturnSelection[] = []
  for (const sel of selections) {
    const s = sel as Partial<ReturnSelection>
    if (typeof s?.fulfillmentLineItemId !== 'string') return null
    const max = maxById.get(s.fulfillmentLineItemId)
    if (max === undefined) return null
    if (typeof s.quantity !== 'number' || !Number.isInteger(s.quantity)) return null
    if (s.quantity < 1 || s.quantity > max) return null
    if (typeof s.returnReason !== 'string' || !VALID_REASONS.has(s.returnReason)) return null
    out.push({fulfillmentLineItemId: s.fulfillmentLineItemId, quantity: s.quantity, returnReason: s.returnReason})
  }
  return out
}
```

- [ ] **Step 4: PASS + suite completa.**
- [ ] **Step 5: Commit** — `feat: logica de elegibilidad y validacion de devoluciones`

---

### Task R2: Helpers Admin API (`lib/shopify-admin.js`)

**Files:**
- Modify: `lib/shopify-admin.js` (añadir al final, estilo del archivo)

**Interfaces:**
- Produces: `getOrdersReturnStatus(orderGids: string[]): Promise<Record<string, string>>` (gid→returnStatus; `{}` en fallo), `getReturnableItems(orderGid): Promise<{items?: {fulfillmentLineItemId, title, maxQuantity}[]; error?: string}>`, `createReturnRequest({orderGid, lineItems: [{fulfillmentLineItemId, quantity, returnReason, customerNote?}]}): Promise<{ok?: boolean; error?: string}>` — todos vía `adminData` existente, con manejo de `json.errors` top-level (mensaje legible, p. ej. falta de scope) y `userErrors`.

- [ ] **Step 1: Implementar** los tres helpers:

```js
// --- Devoluciones (requiere scopes read_orders, read_returns, write_returns en la app) ---

export async function getOrdersReturnStatus(orderGids) {
  if (!Array.isArray(orderGids) || orderGids.length === 0) return {}
  const query = `
    query OrdersReturnStatus($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Order { id returnStatus }
      }
    }
  `
  try {
    const json = await adminData(query, {ids: orderGids})
    if (json?.errors?.length) return {}
    const out = {}
    for (const node of json?.data?.nodes ?? []) {
      if (node?.id) out[node.id] = node.returnStatus ?? null
    }
    return out
  } catch {
    return {}
  }
}

export async function getReturnableItems(orderGid) {
  const query = `
    query ReturnableItems($orderId: ID!) {
      returnableFulfillments(orderId: $orderId, first: 10) {
        edges {
          node {
            returnableFulfillmentLineItems(first: 50) {
              edges {
                node {
                  quantity
                  fulfillmentLineItem {
                    id
                    lineItem { title }
                  }
                }
              }
            }
          }
        }
      }
    }
  `
  try {
    const json = await adminData(query, {orderId: orderGid})
    if (json?.errors?.length) {
      return {error: json.errors.map((e) => e.message).join(', ')}
    }
    const items = []
    for (const f of json?.data?.returnableFulfillments?.edges ?? []) {
      for (const li of f?.node?.returnableFulfillmentLineItems?.edges ?? []) {
        const node = li?.node
        if (node?.fulfillmentLineItem?.id && node.quantity > 0) {
          items.push({
            fulfillmentLineItemId: node.fulfillmentLineItem.id,
            title: node.fulfillmentLineItem.lineItem?.title ?? '',
            maxQuantity: node.quantity,
          })
        }
      }
    }
    return {items}
  } catch (err) {
    return {error: String(err)}
  }
}

export async function createReturnRequest({orderGid, lineItems}) {
  const query = `
    mutation RequestReturn($input: ReturnRequestInput!) {
      returnRequest(input: $input) {
        return { id }
        userErrors { field message }
      }
    }
  `
  const variables = {
    input: {
      orderId: orderGid,
      returnLineItems: lineItems.map((l) => ({
        fulfillmentLineItemId: l.fulfillmentLineItemId,
        quantity: l.quantity,
        returnReason: l.returnReason,
        ...(l.customerNote ? {customerNote: l.customerNote} : {}),
      })),
    },
  }
  try {
    const json = await adminData(query, variables)
    if (json?.errors?.length) return {error: json.errors.map((e) => e.message).join(', ')}
    const errs = json?.data?.returnRequest?.userErrors ?? []
    if (errs.length) return {error: errs.map((e) => e.message).join(', ')}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}
```

Si la introspección local (no ejecutable contra tienda sin scopes) sugiere otro shape para `ReturnRequestInput`/`returnableFulfillments`, ajustar y anotarlo en el reporte (verificable: `__type(name: "ReturnRequestInput")` con las credenciales de `.env.local` — la introspección de tipos NO requiere los scopes de datos).

- [ ] **Step 2: Verificar el shape por introspección** (permitido: solo lee el schema):
`node --env-file=.env.local` con una consulta `{ __type(name: "ReturnRequestInput") { inputFields { name type { name kind ofType { name } } } } }` y equivalente para `ReturnRequestLineItemInput`. Ajustar el helper si difiere; pegar la salida en el reporte.
- [ ] **Step 3: typecheck+lint verdes; commit** — `feat: helpers Admin API de devoluciones (status, returnables, request)`

---

### Task R3: Server actions + email interno

**Files:**
- Modify: `app/(frontend)/account/actions.ts` (leer primero para seguir su patrón de server actions)
- Create: `lib/account/returnEmail.ts`

**Interfaces:**
- Produces: `getReturnableItemsAction(orderId: string): Promise<{items?: ...; error?: string}>` y `requestOrderReturn(orderId: string, selections: unknown, note: string): Promise<{ok?: boolean; error?: string}>` (ambas 'use server').
- `returnRequestInternalEmail({orderNumber, customerEmail, lines: [{title, quantity, reason}], note}): {subject, html}`.

- [ ] **Step 1: `lib/account/returnEmail.ts`**:

```ts
// Aviso interno de solicitud de devolución (Mailgun). Texto plano en tabla simple.
export function returnRequestInternalEmail(data: {
  orderNumber: string
  customerEmail: string
  lines: {title: string; quantity: number; reason: string}[]
  note?: string
}): {subject: string; html: string} {
  const rows = data.lines
    .map((l) => `<tr><td>${l.title}</td><td>${l.quantity}</td><td>${l.reason}</td></tr>`)
    .join('')
  return {
    subject: `Solicitud de devolución — pedido ${data.orderNumber}`,
    html: `
      <h2>Solicitud de devolución</h2>
      <p><b>Pedido:</b> ${data.orderNumber}<br/><b>Cliente:</b> ${data.customerEmail}</p>
      <table border="1" cellpadding="6" cellspacing="0">
        <tr><th>Artículo</th><th>Cantidad</th><th>Motivo</th></tr>${rows}
      </table>
      ${data.note ? `<p><b>Nota del cliente:</b> ${data.note}</p>` : ''}
      <p>Revisar y aprobar/rechazar desde el pedido en Shopify.</p>`,
  }
}
```

- [ ] **Step 2: Server actions** en `app/(frontend)/account/actions.ts` (imports: `getCurrentCustomer`, `adminOrderGid`, `validateSelections`, `RETURN_REASONS`, helpers de shopify-admin, `sendEmail`, `returnRequestInternalEmail`):

```ts
export async function getReturnableItemsAction(orderId: string) {
  const session = await getCurrentCustomer()
  if (!session) return {error: 'No session'}
  const owned = (session.customer.orders?.edges ?? []).some(({node}) => node.id === orderId)
  if (!owned) return {error: 'Order not found'}
  const gid = adminOrderGid(orderId)
  if (!gid) return {error: 'Order not found'}
  return getReturnableItems(gid)
}

export async function requestOrderReturn(orderId: string, selections: unknown, note: string) {
  const session = await getCurrentCustomer()
  if (!session) return {error: 'No session'}
  const order = (session.customer.orders?.edges ?? []).find(({node}) => node.id === orderId)?.node
  if (!order) return {error: 'Order not found'}
  const gid = adminOrderGid(orderId)
  if (!gid) return {error: 'Order not found'}

  const returnable = await getReturnableItems(gid)
  if (returnable.error || !returnable.items) return {error: returnable.error ?? 'Unavailable'}
  const valid = validateSelections(selections, returnable.items)
  if (!valid) return {error: 'Invalid selection'}

  const cleanNote = String(note ?? '').slice(0, 500)
  const result = await createReturnRequest({
    orderGid: gid,
    lineItems: valid.map((v) => ({...v, ...(cleanNote ? {customerNote: cleanNote} : {})})),
  })
  if (result.error) return {error: result.error}

  const titleById = new Map(returnable.items.map((i) => [i.fulfillmentLineItemId, i.title]))
  const mail = returnRequestInternalEmail({
    orderNumber: order.name || String(order.orderNumber ?? ''),
    customerEmail: session.customer.email ?? '',
    lines: valid.map((v) => ({
      title: titleById.get(v.fulfillmentLineItemId) ?? '',
      quantity: v.quantity,
      reason: v.returnReason,
    })),
    note: cleanNote || undefined,
  })
  await sendEmail({to: process.env.INTERNAL_NOTIFICATION_EMAIL || '', ...mail})
  return {ok: true}
}
```

Ajustar los accesos a `session.customer` al shape real del tipo `Customer` (leer `types/account.ts`); si `email` u `orderNumber` difieren, adaptar. `customerNote` va por línea en `ReturnRequestLineItemInput` (verificado en R2) — si resultara global del input, mover.

- [ ] **Step 3: typecheck + lint verdes; commit** — `feat: server actions de solicitud de devolucion + aviso interno`

---

### Task R4: UI (OrdersPage + OrderCard)

**Files:**
- Modify: `app/(frontend)/account/(dashboard)/orders/page.tsx`
- Modify: `lib/account/orders.ts` (+`returnStatus`/`returnEligible` en el mapeo)
- Modify: `types/account.ts` (tipo `Order`: `returnStatus?: string | null; returnEligible?: boolean`)
- Modify: `components/Account/OrderCard/OrderCard.tsx` + `OrderCard.module.scss`
- Create: `components/Account/OrderCard/ReturnRequestForm.tsx`

**Interfaces:**
- Consumes: `getOrdersReturnStatus` (R2), `isReturnEligible` (R1), actions (R3).
- Produces: card con botón/etiqueta/estado según elegibilidad.

- [ ] **Step 1: OrdersPage** — tras `mapOrders`, obtener `getOrdersReturnStatus(orders.map(o => adminOrderGid(o.id)).filter(Boolean))`, y anotar cada order: `returnStatus` (mapear por gid) y `returnEligible = isReturnEligible(order con returnStatus)`. Pasarlo por props (el mapeo puede hacerse en la propia page; `mapOrders` no necesita conocer Admin).
- [ ] **Step 2: OrderCard** — debajo del bloque actual de la card: si `order.returnEligible` → botón "Request return" (estilo de botón secundario existente en el módulo SCSS; crear clase `.returnBtn` sobria coherente con el diseño actual). Si `returnStatus` ∈ {RETURN_REQUESTED, IN_PROGRESS} → etiqueta "Return requested". El botón abre `<ReturnRequestForm orderId={order.id} onDone={...}/>` (estado local `returning`).
- [ ] **Step 3: `ReturnRequestForm.tsx`** ('use client'): al montar llama `getReturnableItemsAction(orderId)`; loading → "Loading…"; sin items → "No items available for return."; con items → lista con checkbox + `<select>` de cantidad (1..maxQuantity) por línea, `<select>` de motivo (RETURN_REASONS, placeholder "Select a reason", un motivo por línea seleccionada), textarea "Additional details (optional)", botón "Submit request" (disabled si nada seleccionado o falta motivo o enviando). Éxito → sustituir formulario por "Return requested — we'll email you once it's reviewed." y notificar al padre para cambiar el botón por la etiqueta. Error → mostrarlo encima del botón.
- [ ] **Step 4: SCSS** — mobile first, `min-width`, anidación según HTML (reglas del proyecto), coherente con `OrderCard.module.scss`.
- [ ] **Step 5: vitest + typecheck + lint verdes; commit** — `feat: formulario de devolucion en la card de pedido`

---

### Task R5: Verificación final

- [ ] `npx vitest run && npm run typecheck && npm run lint` completos verdes; intentar `npm run build` (si EACCES .next → bloqueado-por-entorno conocido, anotar).
- [ ] Barrido: `grep -rn "returnRequest\|returnable" app components lib --include="*.ts" --include="*.tsx" --include="*.js" | grep -v node_modules` — flujo completo sin cabos sueltos.
- [ ] Review final de rama + commit de docs; NO push (decisión humana).
- [ ] Manual (Carlos): añadir scopes `read_orders`, `read_returns`, `write_returns` a la custom app en el admin; smoke con un pedido real; merge cuando pase.
