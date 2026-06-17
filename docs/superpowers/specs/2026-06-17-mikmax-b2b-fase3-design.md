# Mikmax — B2B Fase 3: nudge de tramos + área profesional rica + registro global

**Fecha:** 2026-06-17
**Stack:** Next.js 15 (App Router, server actions) · Sanity CMS v3 · Shopify (customer metafields) · SCSS
**Depende de:** Fase 1 (registro/validación/scoring) y Fase 2 (descuento Function + display + carrito), ya en producción.

Cierra los 3 huecos detectados en la auditoría del B2B contra el spec del cliente (pasos 4 y 5 + alcance de países). Tres sub-features independientes, un solo spec.

---

## Sub-feature A — Nudge de tramos en el carrito (designer)

### Objetivo
En el carrito, un cliente **designer** ve cuánto le falta para el siguiente tramo de descuento: *"Añade 250 € más para alcanzar el 20%"*. El descuento ya aplicado lo muestra la línea existente (`cartCost.discountTitle`). Esto es **solo presentación** — la Function sigue siendo la fuente de verdad del dinero.

### Datos necesarios en el cliente
El `CartDrawer` es cliente y ya conoce `cartCost.subtotal` (subtotal real de Shopify). Le faltan: si el cliente es designer y los tramos. Se añaden vía server action:

- **`app/(frontend)/cart/actions.ts`** — nueva acción:
  ```ts
  export interface B2bCartContext {
    isDesigner: boolean
    designerTiers: {minSubtotal: number; percent: number}[]
  }
  export async function getB2bCartContext(): Promise<B2bCartContext> {
    const session = await getCurrentCustomer()
    const isDesigner =
      isB2bApproved(session?.customer) && session?.customer.b2bClientType?.value === 'designer'
    if (!isDesigner) return {isDesigner: false, designerTiers: []}
    const cfg = await getB2bPricingConfig()
    return {isDesigner: true, designerTiers: cfg?.designerTiers ?? []}
  }
  ```
  (`getB2bPricingConfig` ya existe en `lib/b2b/pricing.ts`.)

- **`context/shopContext.js`** — estado `b2bCartContext` (default `{isDesigner: false, designerTiers: []}`). Se hidrata UNA vez: en el mount (junto a `getCartCost`) y en `refreshCartBuyer` (login/logout). Se expone en el `value`.

### Cálculo del nudge (`CartDrawer.tsx`, cliente, función pura)
```ts
function nextTierNudge(subtotal: number, tiers: {minSubtotal: number; percent: number}[]) {
  const sorted = [...tiers].sort((a, b) => a.minSubtotal - b.minSubtotal)
  const next = sorted.find((t) => t.minSubtotal > subtotal)
  if (!next) return null // ya en el tramo máximo
  return {gap: next.minSubtotal - subtotal, percent: next.percent}
}
```
- Render (solo si `b2bCartContext.isDesigner` y hay carrito), debajo de la línea de descuento:
  - Con `next`: *"Añade {FMT(gap)} más para alcanzar el {percent}%"*.
  - Sin `next` (tramo máximo): *"Tienes el descuento profesional máximo ({percentMax}%)"*.
- Reseller (50% plano) → `isDesigner=false` → no se muestra nada.

### Robustez
- `designerTiers` vacío o config nula → `getB2bCartContext` devuelve `[]` → `nextTierNudge` devuelve `null` → no se muestra nudge (no rompe).
- Usa el MISMO `cartCost.subtotal` que ve la Function → el tramo mostrado y el aplicado coinciden.

### Tests
- `nextTierNudge` (unit, `__tests__/b2b/`): subtotal 500 con tiers [0/15,1000/20,10000/30] → gap 500, 20%; subtotal 1500 → gap 8500, 30%; subtotal 50000 → null; tiers `[]` → null.

---

## Sub-feature B — Área profesional rica (Sanity, por grupo)

### Objetivo
La página `mikmax-for-business/area` muestra, además de la condición y el contacto que ya tiene: **política comercial, condiciones de compra, fiscalidad/exención**, todo **distinto por grupo** (reseller vs designer) y **editable desde Sanity**.

### Schema Sanity (vía skill `sanity-schema-builder`)
Singleton **`b2bArea`** con un grupo de campos por cada tipo de cliente. Cada grupo (`reseller`, `designer`) es un object `b2bAreaGroup`:
```
b2bAreaGroup (object):
  commercialPolicy   : body  (rich text)   — política comercial
  purchaseConditions : body  (rich text)   — condiciones de compra
  taxInfo            : body  (rich text)   — fiscalidad / exención IVA
  contactName        : string              — contacto comercial (nombre)
  contactEmail       : string              — contacto comercial (email)

b2bArea (singleton document):
  intro    : body            (opcional, compartido)
  reseller : b2bAreaGroup
  designer : b2bAreaGroup
```
- Registrar en `sanity/desk/` (singleton, patrón `LOCKED_DOCUMENT_TYPES`) y en `hiddenDocTypes`.
- `body` reutiliza el tipo rich text existente del proyecto.

### Query (patrón de revalidación obligatorio)
- **`sanity/queries/queries/b2bArea.ts`** — `getB2bArea()` con `client.fetch(..., {next: {tags: ['b2bArea'], revalidate: 3600}})`.
- Registrar el tag `b2bArea` en `app/api/revalidate/route.ts` (tabla de tags activos).
- Tipo de la respuesta en `sanity/types/`.

### Página `app/(frontend)/mikmax-for-business/area/page.tsx`
- Lee la sesión (`getCurrentCustomer`) → grupo del cliente (`b2bClientType.value`, `'designer'` | `'reseller'`).
- `getB2bArea()` → selecciona el bloque del grupo (`data.designer` o `data.reseller`).
- Render: condición ("Reseller" / "Interior Designer") + `intro` + política + condiciones + fiscalidad + contacto, con **PortableText** (skill `portabletext-renderer`).
- Degradar: si `b2bArea` o el bloque del grupo no existen aún → mostrar solo lo que haya (la versión mínima actual: condición + contacto fallback `business@mikmax.com`). Nunca romper.

### Tests
- Mayormente contenido/render. Smoke manual: como reseller ve su bloque; como designer ve el suyo; sin doc en Sanity → versión mínima.

---

## Sub-feature C — Registro abierto a todos los países → revisión

### Objetivo
Permitir el alta desde **cualquier país**. UE+UK se validan automáticamente (VIES/Companies House). El resto, al no ser verificable, va **siempre a revisión manual** (nunca auto-rechazo).

### Formulario (`components/B2B/B2bRegisterForm/B2bRegisterForm.tsx`)
- Sustituir la lista `COUNTRIES` (9 entradas) por una **lista ISO completa** (`code`, `name`), ordenada alfabéticamente, `ES` por defecto. Fuente: un módulo `lib/b2b/countries.ts` (`COUNTRIES: {code: string; name: string}[]`).
- Sin otros cambios de campos.

### Concepto "país verificable"
- **`lib/b2b/validation/vatPrefixes.ts`** ya mapea prefijos VAT → país para UE + GB. Derivar:
  ```ts
  export const VERIFIABLE_COUNTRIES = new Set(Object.values(VAT_PREFIX_TO_COUNTRY)) // UE + GB
  export const isVerifiableCountry = (country: string) =>
    VERIFIABLE_COUNTRIES.has((country || '').toUpperCase())
  ```

### Decisión (`lib/b2b/validation/score.ts`)
- La función de decisión recibe además `verifiable: boolean`. Regla:
  ```
  decide(score, verifiable):
    if (!verifiable) return 'review'        // país no verificable → siempre revisión
    if (score >= APPROVE_AT) return 'approved'
    if (score >= REVIEW_AT)  return 'review'
    return 'rejected'
  ```
  El score se sigue calculando igual (para la ficha interna); solo cambia el mapeo a estado.
- **`app/api/b2b/register/route.ts`**: pasar `isVerifiableCountry(input.country)` a la decisión. Para país no verificable, VIES/Companies House no se llaman (o se llaman y devuelven `available:false`, ya neutral) — la rama de estado la fuerza `verifiable=false`.

### Coherencia con el resto del flujo
- País no verificable nunca alcanza `approved` (sin VAT validado, score < 85 siempre) → no hay riesgo por arriba.
- En `review`: guarda `b2bApplication` en Sanity + email "estamos revisando" al cliente + ficha interna al equipo (ya existe; incluye país y score). El equipo aprueba desde el panel Sanity (webhook), que ya promueve el customer en Shopify.

### Tests
- `decide(score, verifiable)` (unit):
  - **verificable:** 90→approved, 60→review, 40→rejected.
  - **no verificable:** CUALQUIER score → review (40→review, 60→review, 90→review). La regla `if(!verifiable) return 'review'` va primero, así que sin validación de VAT nunca se auto-aprueba ni se auto-rechaza.
- `isVerifiableCountry`: 'ES'→true, 'GB'→true, 'US'→false, ''→false.

---

## Arquitectura / decomposición

| Plan | Alcance | Independiente |
|---|---|---|
| **A — Nudge carrito** | `cart/actions.ts` + `shopContext.js` + `CartDrawer` + test de `nextTierNudge` | Sí |
| **B — Área profesional** | schema `b2bArea` + query + `area/page.tsx` + revalidate tag | Sí |
| **C — Registro global** | `countries.ts` + form + `vatPrefixes.ts` + `score.ts` + register route + tests | Sí |

Orden sugerido: C (lógica pura + form, bajo riesgo) → A (carrito) → B (schema + contenido). Cada uno produce software testeable por sí mismo.

## Manejo de errores (degradar, nunca romper)
- A: sin tiers/config → sin nudge. B: sin doc Sanity → área mínima actual. C: servicios de validación caídos → ya neutral (Fase 1); país no verificable → review.

## Fuera de alcance
- Cambiar los porcentajes/tramos (siguen en `b2b.pricing`).
- Multi-idioma del área profesional (un solo idioma, como el resto del sitio).
- Reglas de fiscalidad automáticas (la fiscalidad/exención es contenido editorial, no cálculo).
