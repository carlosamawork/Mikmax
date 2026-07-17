# Descuento B2B unificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar la categoría reseller/designer: un descuento por defecto (fijo % o por tramos) configurable por Mikmax + override por cliente (`b2b.discount`) gestionado desde la app embebida, con display unificado en el storefront.

**Architecture:** Un único formato `DiscountSpec` (`{type:'fixed',percent}` | `{type:'tiers',tiers[]}`) vive en el shop metafield `b2b.pricing` (default) y en el customer metafield `b2b.discount` (override). Regla efectiva: `override válido ?? default ?? fallback horneado`, solo si `b2b.validated === 'true'`. La Function aplica el % real; el storefront lo espeja para display (fijo → PDP/listados; tramos → carrito + nudge).

**Tech Stack:** Shopify Function (TS, api 2026-04), app embebida Preact + Polaris web components (Admin Direct API), Next.js 15 App Router, vitest en ambos repos.

**Spec:** `docs/superpowers/specs/2026-07-17-b2b-descuento-unificado-design.md`

## Global Constraints

- Repo app: `/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app` (git propio, sin remote — commit local).
- Repo storefront: `/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax` — trabajar en rama `feature/b2b-descuento-unificado`.
- NUNCA ejecutar `shopify`/`npm` con sudo (deja archivos root-owned).
- Prettier storefront: sin punto y coma, comillas simples, 100 chars. La app usa punto y coma (respetar el estilo de cada repo).
- Mensaje del descuento en checkout: `Descuento profesional X%` (literal exacto).
- Parseo legacy: `{resellerPercent, designerTiers}` → `{type:'tiers', tiers: designerTiers}`.
- Fallback horneado: tramos `[{0,15},{1000,20},{10000,30}]`.
- El storefront NUNCA toca `ColorSize.price` (alimenta add-to-cart; doble descuento).
- `b2b.client_type` deja de leerse pero NO se borra de los clientes.

---

## FASE A — App Shopify (`mikmax-b2b-app`)

### Task 1: Núcleo de pricing de la Function (`DiscountSpec`)

**Files:**
- Modify: `extensions/b2b-discount/src/pricing.ts` (reescritura completa)
- Test: `extensions/b2b-discount/src/pricing.test.ts` (reescritura completa)

**Interfaces:**
- Consumes: nada (módulo puro).
- Produces: `type DiscountSpec`, `interface Tier {minSubtotal: number; percent: number}`, `DEFAULT_SPEC: DiscountSpec`, `parseDiscountSpec(json: string | null | undefined): DiscountSpec | null`, `tierPercent(tiers: Tier[], subtotal: number): number`, `computeDiscountPercent(spec: DiscountSpec | null, subtotal: number): number`. Task 2 los importa.

- [ ] **Step 1: Reescribir el test (falla)**

Sustituir todo `extensions/b2b-discount/src/pricing.test.ts` por:

```ts
import {describe, it, expect} from 'vitest';
import {
  parseDiscountSpec,
  tierPercent,
  computeDiscountPercent,
  DEFAULT_SPEC,
} from './pricing';

const TIERS = [
  {minSubtotal: 0, percent: 15},
  {minSubtotal: 1000, percent: 20},
  {minSubtotal: 10000, percent: 30},
];

describe('parseDiscountSpec', () => {
  it('parsea fixed', () => {
    expect(parseDiscountSpec(JSON.stringify({type: 'fixed', percent: 50}))).toEqual({
      type: 'fixed',
      percent: 50,
    });
  });
  it('parsea tiers', () => {
    expect(parseDiscountSpec(JSON.stringify({type: 'tiers', tiers: TIERS}))).toEqual({
      type: 'tiers',
      tiers: TIERS,
    });
  });
  it('mapea el formato legacy a tiers', () => {
    const legacy = {resellerPercent: 50, designerTiers: TIERS};
    expect(parseDiscountSpec(JSON.stringify(legacy))).toEqual({type: 'tiers', tiers: TIERS});
  });
  it('null/invalido/incompleto -> null', () => {
    expect(parseDiscountSpec(null)).toBeNull();
    expect(parseDiscountSpec(undefined)).toBeNull();
    expect(parseDiscountSpec('nope')).toBeNull();
    expect(parseDiscountSpec('{}')).toBeNull();
    expect(parseDiscountSpec(JSON.stringify({type: 'fixed', percent: 'x'}))).toBeNull();
    expect(parseDiscountSpec(JSON.stringify({type: 'tiers', tiers: [{minSubtotal: 0}]}))).toBeNull();
  });
});

describe('tierPercent', () => {
  it('elige el tramo mas alto con minSubtotal <= subtotal', () => {
    expect(tierPercent(TIERS, 500)).toBe(15);
    expect(tierPercent(TIERS, 999)).toBe(15);
    expect(tierPercent(TIERS, 1000)).toBe(20);
    expect(tierPercent(TIERS, 10000)).toBe(30);
  });
  it('sin tramo alcanzado o lista vacia -> 0', () => {
    expect(tierPercent([{minSubtotal: 100, percent: 10}], 50)).toBe(0);
    expect(tierPercent([], 500)).toBe(0);
  });
});

describe('computeDiscountPercent', () => {
  it('fixed -> percent (clamp 0-100)', () => {
    expect(computeDiscountPercent({type: 'fixed', percent: 50}, 10)).toBe(50);
    expect(computeDiscountPercent({type: 'fixed', percent: 150}, 10)).toBe(100);
    expect(computeDiscountPercent({type: 'fixed', percent: -5}, 10)).toBe(0);
  });
  it('tiers -> por subtotal', () => {
    expect(computeDiscountPercent({type: 'tiers', tiers: TIERS}, 500)).toBe(15);
    expect(computeDiscountPercent({type: 'tiers', tiers: TIERS}, 5000)).toBe(20);
  });
  it('spec null -> 0', () => {
    expect(computeDiscountPercent(null, 500)).toBe(0);
  });
});

describe('DEFAULT_SPEC', () => {
  it('es tramos 15/20/30', () => {
    expect(DEFAULT_SPEC).toEqual({type: 'tiers', tiers: TIERS});
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app/extensions/b2b-discount" && npx vitest run src/pricing.test.ts`
Expected: FAIL (`parseDiscountSpec` no exportado).

- [ ] **Step 3: Reescribir `pricing.ts`**

Sustituir todo `extensions/b2b-discount/src/pricing.ts` por:

```ts
export interface Tier {
  minSubtotal: number;
  percent: number;
}

export type DiscountSpec =
  | {type: 'fixed'; percent: number}
  | {type: 'tiers'; tiers: Tier[]};

// Fallback horneado: si ni el override del cliente ni el metafield de tienda son
// legibles/validos, la Function aplica estos tramos (iguales al provisioning).
export const DEFAULT_SPEC: DiscountSpec = {
  type: 'tiers',
  tiers: [
    {minSubtotal: 0, percent: 15},
    {minSubtotal: 1000, percent: 20},
    {minSubtotal: 10000, percent: 30},
  ],
};

function parseTiers(raw: unknown): Tier[] | null {
  if (!Array.isArray(raw)) return null;
  const tiers: Tier[] = [];
  for (const t of raw) {
    if (typeof t?.minSubtotal !== 'number' || typeof t?.percent !== 'number') return null;
    tiers.push({minSubtotal: t.minSubtotal, percent: t.percent});
  }
  return tiers;
}

// Acepta el formato nuevo ({type:'fixed'|'tiers'}) y el legacy
// ({resellerPercent, designerTiers} -> tiers). Invalido -> null.
export function parseDiscountSpec(json: string | null | undefined): DiscountSpec | null {
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.type === 'fixed') {
    return typeof o.percent === 'number' ? {type: 'fixed', percent: o.percent} : null;
  }
  if (o.type === 'tiers') {
    const tiers = parseTiers(o.tiers);
    return tiers ? {type: 'tiers', tiers} : null;
  }
  if (typeof o.resellerPercent === 'number') {
    const tiers = parseTiers(o.designerTiers);
    return tiers ? {type: 'tiers', tiers} : null;
  }
  return null;
}

// Highest minSubtotal that is <= subtotal.
export function tierPercent(tiers: Tier[], subtotal: number): number {
  let best = 0;
  let bestMin = -1;
  for (const t of tiers) {
    if (subtotal >= t.minSubtotal && t.minSubtotal > bestMin) {
      best = t.percent;
      bestMin = t.minSubtotal;
    }
  }
  return best;
}

const clamp = (n: number) => Math.max(0, Math.min(n, 100));

export function computeDiscountPercent(spec: DiscountSpec | null, subtotal: number): number {
  if (!spec) return 0;
  if (spec.type === 'fixed') return clamp(spec.percent);
  return clamp(tierPercent(spec.tiers, subtotal));
}
```

- [ ] **Step 4: Verificar que pasa**

Run: mismo comando del Step 2.
Expected: PASS (todos los tests).

- [ ] **Step 5: Commit (repo app)**

```bash
cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app"
git add extensions/b2b-discount/src/pricing.ts extensions/b2b-discount/src/pricing.test.ts
git commit -m "feat: DiscountSpec unificado (fijo/tramos) con parseo legacy en la Function"
```

---

### Task 2: Query GraphQL + adapter de la Function

**Files:**
- Modify: `extensions/b2b-discount/src/cart_lines_discounts_generate_run.graphql`
- Modify: `extensions/b2b-discount/src/cart_lines_discounts_generate_run.ts`

**Interfaces:**
- Consumes: `parseDiscountSpec`, `computeDiscountPercent`, `DEFAULT_SPEC` de Task 1.
- Produces: la Function lee `customer.discount` (metafield `b2b.discount`) y deja de leer `clientType`.

- [ ] **Step 1: Actualizar la query**

En `cart_lines_discounts_generate_run.graphql`, dentro de `buyerIdentity { customer { ... } }`, sustituir el bloque `clientType` por `discount` (el bloque `validated` se queda igual):

```graphql
      customer {
        discount: metafield(namespace: "b2b", key: "discount") {
          value
        }
        validated: metafield(namespace: "b2b", key: "validated") {
          value
        }
      }
```

- [ ] **Step 2: Regenerar tipos**

Run: `cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app/extensions/b2b-discount" && npm run typegen`
Expected: `generated/api` actualizado sin errores (el tipo `CartInput` ahora expone `discount` en customer).

- [ ] **Step 3: Reescribir el adapter**

Sustituir el cuerpo de `cartLinesDiscountsGenerateRun` en `cart_lines_discounts_generate_run.ts` por:

```ts
import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from '../generated/api';
import {parseDiscountSpec, computeDiscountPercent, DEFAULT_SPEC} from './pricing';

export function cartLinesDiscountsGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  if (!input.cart.lines.length) {
    return {operations: []};
  }
  if (!input.discount.discountClasses.includes(DiscountClass.Order)) {
    return {operations: []};
  }

  const customer = input.cart.buyerIdentity?.customer;
  if (customer?.validated?.value !== 'true') {
    return {operations: []};
  }

  // Precedencia: override del cliente > default de tienda > fallback horneado.
  const spec =
    parseDiscountSpec(customer?.discount?.value) ??
    parseDiscountSpec(input.shop.pricing?.value) ??
    DEFAULT_SPEC;

  const subtotal = Number(input.cart.cost.subtotalAmount.amount);
  const percent = computeDiscountPercent(spec, subtotal);
  if (percent <= 0) {
    return {operations: []};
  }

  return {
    operations: [
      {
        orderDiscountsAdd: {
          candidates: [
            {
              message: `Descuento profesional ${percent}%`,
              targets: [{orderSubtotal: {excludedCartLineIds: []}}],
              value: {percentage: {value: percent}},
            },
          ],
          selectionStrategy: OrderDiscountSelectionStrategy.First,
        },
      },
    ],
  };
}
```

- [ ] **Step 4: Build + tests de la extensión**

Run: `cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app/extensions/b2b-discount" && npm run build && npx vitest run`
Expected: build OK, tests PASS.

- [ ] **Step 5: Commit (repo app)**

```bash
cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app"
git add extensions/b2b-discount/src/ extensions/b2b-discount/generated/
git commit -m "feat: Function lee override b2b.discount y aplica spec efectivo"
```

---

### Task 3: Modelo compartido de la app + provisioning

**Files:**
- Create: `shared/models/discountSpec.ts`
- Modify: `shared/models/b2bSetup.ts`

**Interfaces:**
- Produces: `shared/models/discountSpec.ts` exporta `DiscountSpec`, `Tier`, `DEFAULT_SPEC`, `parseDiscountSpec(json)`, `normalizeSpec(spec): DiscountSpec` (clamp 0-100 en %, ≥0 en €, ordena tramos). `b2bSetup.ts` exporta `loadPricing(): Promise<DiscountSpec>` y `savePricing(spec: DiscountSpec)` con la nueva forma. Tasks 4 y 5 los consumen.

- [ ] **Step 1: Crear `shared/models/discountSpec.ts`**

```ts
// Forma unica del descuento B2B (default de tienda y override por cliente).
// Espejo del parseo de la Function (extensions/b2b-discount/src/pricing.ts).

export interface Tier {
  minSubtotal: number;
  percent: number;
}

export type DiscountSpec =
  | {type: 'fixed'; percent: number}
  | {type: 'tiers'; tiers: Tier[]};

export const DEFAULT_SPEC: DiscountSpec = {
  type: 'tiers',
  tiers: [
    {minSubtotal: 0, percent: 15},
    {minSubtotal: 1000, percent: 20},
    {minSubtotal: 10000, percent: 30},
  ],
};

function parseTiers(raw: unknown): Tier[] | null {
  if (!Array.isArray(raw)) return null;
  const tiers: Tier[] = [];
  for (const t of raw) {
    if (typeof t?.minSubtotal !== 'number' || typeof t?.percent !== 'number') return null;
    tiers.push({minSubtotal: t.minSubtotal, percent: t.percent});
  }
  return tiers;
}

// Acepta formato nuevo y legacy ({resellerPercent, designerTiers} -> tiers).
export function parseDiscountSpec(json: string | null | undefined): DiscountSpec | null {
  if (!json) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (o.type === 'fixed') {
    return typeof o.percent === 'number' ? {type: 'fixed', percent: o.percent} : null;
  }
  if (o.type === 'tiers') {
    const tiers = parseTiers(o.tiers);
    return tiers ? {type: 'tiers', tiers} : null;
  }
  if (typeof o.resellerPercent === 'number') {
    const tiers = parseTiers(o.designerTiers);
    return tiers ? {type: 'tiers', tiers} : null;
  }
  return null;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// Limpia valores del formulario antes de guardar: clamp %, minSubtotal >= 0, tramos ordenados.
export function normalizeSpec(spec: DiscountSpec): DiscountSpec {
  if (spec.type === 'fixed') {
    return {type: 'fixed', percent: clamp(Number(spec.percent) || 0, 0, 100)};
  }
  return {
    type: 'tiers',
    tiers: [...spec.tiers]
      .map((t) => ({
        minSubtotal: Math.max(0, Number(t.minSubtotal) || 0),
        percent: clamp(Number(t.percent) || 0, 0, 100),
      }))
      .sort((a, b) => a.minSubtotal - b.minSubtotal),
  };
}
```

- [ ] **Step 2: Actualizar `b2bSetup.ts`**

1. Añadir import arriba: `import {DiscountSpec, DEFAULT_SPEC, parseDiscountSpec, normalizeSpec} from './discountSpec';`
2. Sustituir la constante `DEFAULT_PRICING` (string JSON) por: `const DEFAULT_PRICING = JSON.stringify(DEFAULT_SPEC);`
3. Eliminar `export interface PricingConfig {...}` y `const DEFAULT_PRICING_OBJ`.
4. Sustituir `loadPricing` y `savePricing` por:

```ts
// Lee la config actual del metafield b2b.pricing (o el default si no existe / invalida).
export async function loadPricing(): Promise<DiscountSpec> {
  const json = await gqlFetch(`#graphql
    query Pricing { shop { metafield(namespace: "b2b", key: "pricing") { value } } }`);
  return parseDiscountSpec(json?.data?.shop?.metafield?.value) ?? DEFAULT_SPEC;
}

// Normaliza y escribe el metafield b2b.pricing (formato DiscountSpec).
export async function savePricing(spec: DiscountSpec): Promise<{ ok: boolean; message: string }> {
  const clean = normalizeSpec(spec);
  const shop = await gqlFetch(`#graphql
    query ShopForSave { shop { id } }`);
  const ownerId = shop?.data?.shop?.id;
  if (!ownerId) {
    return {ok: false, message: "No se pudo leer la tienda: " + JSON.stringify(shop?.errors ?? shop)};
  }
  const r = await gqlFetch(
    `#graphql
    mutation SetPricing($m: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $m) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      m: [
        {
          ownerId,
          namespace: "b2b",
          key: "pricing",
          type: "json",
          value: JSON.stringify(clean),
        },
      ],
    },
  );
  const errs: Array<{ message: string }> = r?.data?.metafieldsSet?.userErrors ?? [];
  if (errs.length) return { ok: false, message: errs.map((e) => e.message).join(", ") };
  return { ok: true, message: "Descuentos guardados ✓" };
}
```

5. En `provisionB2bDiscount`, tras el bloque que crea la definición de `b2b.pricing` (el `const def = ...` con su manejo de errores), añadir la definición del metafield de cliente `b2b.discount` (mismo patrón best-effort):

```ts
  // 1b) definicion del metafield de cliente b2b.discount (override por cliente).
  const defCustomer = await gqlFetch(
    `#graphql
    mutation DefCustomerCreate($d: MetafieldDefinitionInput!) {
      metafieldDefinitionCreate(definition: $d) {
        createdDefinition { id }
        userErrors { field message code }
      }
    }`,
    {
      d: {
        name: "B2B discount override",
        namespace: "b2b",
        key: "discount",
        type: "json",
        ownerType: "CUSTOMER",
        access: { admin: "MERCHANT_READ_WRITE" },
      },
    },
  );
  const defCustErr: Array<{ message: string; code?: string }> =
    defCustomer?.data?.metafieldDefinitionCreate?.userErrors ?? [];
  const defCustTaken = defCustErr.some((e) => e.code === "TAKEN");
  if (defCustErr.length && !defCustTaken) {
    messages.push(`Definición b2b.discount: ${defCustErr.map((e) => e.message).join(", ")}`);
  } else {
    messages.push(defCustTaken ? "Definición b2b.discount ya existía ✓" : "Definición b2b.discount creada ✓");
  }
```

- [ ] **Step 3: Typecheck del repo app**

Run: `cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app" && npx tsc --noEmit 2>/dev/null || echo "sin tsconfig raíz — verificar que no hay imports rotos con: grep -rn 'PricingConfig' shared extensions/app-home"`
Expected: sin referencias a `PricingConfig` fuera de `HomePage.jsx` (que se arregla en Task 4).

- [ ] **Step 4: Commit (repo app)**

```bash
cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app"
git add shared/models/discountSpec.ts shared/models/b2bSetup.ts
git commit -m "feat: modelo DiscountSpec compartido + provisioning de b2b.discount"
```

---

### Task 4: Editor del default con selector fijo/tramos

**Files:**
- Create: `extensions/app-home/src/components/DiscountSpecForm.jsx`
- Modify: `extensions/app-home/src/pages/HomePage.jsx`

**Interfaces:**
- Consumes: `loadPricing`/`savePricing` (Task 3), `DiscountSpec` (Task 3).
- Produces: `<DiscountSpecForm spec={spec} onChange={(next) => ...} />` — componente controlado reutilizado por Task 5.

- [ ] **Step 1: Crear `DiscountSpecForm.jsx`**

```jsx
/** @typedef {import('../../../../shared/models/discountSpec').DiscountSpec} DiscountSpec */

// Formulario controlado de un DiscountSpec: selector fijo/tramos + campos.
// Se usa para el default de tienda (HomePage) y para overrides por cliente.
export default function DiscountSpecForm({spec, onChange}) {
  const num = (v) => Number(v) || 0;

  const setType = (type) => {
    if (type === spec.type) return;
    onChange(
      type === 'fixed'
        ? {type: 'fixed', percent: 0}
        : {type: 'tiers', tiers: [{minSubtotal: 0, percent: 0}]},
    );
  };
  const setPercent = (v) => onChange({type: 'fixed', percent: num(v)});
  const setTier = (i, key, v) =>
    onChange({
      type: 'tiers',
      tiers: spec.tiers.map((t, idx) => (idx === i ? {...t, [key]: num(v)} : t)),
    });
  const addTier = () =>
    onChange({type: 'tiers', tiers: [...spec.tiers, {minSubtotal: 0, percent: 0}]});
  const removeTier = (i) =>
    onChange({type: 'tiers', tiers: spec.tiers.filter((_, idx) => idx !== i)});

  return (
    <s-stack direction="block" gap="base">
      <s-select
        label="Tipo de descuento"
        value={spec.type}
        onChange={(e) => setType(e.currentTarget.value)}
      >
        <s-option value="fixed">Fijo (%)</s-option>
        <s-option value="tiers">Por tramos de subtotal</s-option>
      </s-select>

      {spec.type === 'fixed' && (
        <s-number-field
          label="Descuento"
          value={String(spec.percent)}
          min="0"
          max="100"
          suffix="%"
          onChange={(e) => setPercent(e.currentTarget.value)}
        />
      )}

      {spec.type === 'tiers' && (
        <>
          <s-paragraph>
            Cada tramo: a partir de qué subtotal del carrito (€) se aplica ese descuento (%).
            Se ordenan solos al guardar.
          </s-paragraph>
          {spec.tiers.map((t, i) => (
            <s-stack key={i} direction="inline" gap="base" alignItems="end">
              <s-number-field
                label="Desde"
                value={String(t.minSubtotal)}
                min="0"
                suffix="€"
                onChange={(e) => setTier(i, 'minSubtotal', e.currentTarget.value)}
              />
              <s-number-field
                label="Descuento"
                value={String(t.percent)}
                min="0"
                max="100"
                suffix="%"
                onChange={(e) => setTier(i, 'percent', e.currentTarget.value)}
              />
              <s-button variant="tertiary" onClick={() => removeTier(i)}>
                Quitar
              </s-button>
            </s-stack>
          ))}
          <s-button variant="secondary" onClick={addTier}>
            + Añadir tramo
          </s-button>
        </>
      )}
    </s-stack>
  );
}
```

- [ ] **Step 2: Reescribir `HomePage.jsx`**

Sustituir el contenido por (mantiene provisioning; el editor pasa a usar `DiscountSpecForm`):

```jsx
import {useState, useEffect} from 'preact/hooks';
import {loadPricing, savePricing, provisionB2bDiscount} from '../../../../shared/models/b2bSetup';
import DiscountSpecForm from '../components/DiscountSpecForm.jsx';

/** @typedef {import('../../../../shared/models/discountSpec').DiscountSpec} DiscountSpec */

export default function HomePage() {
  const [spec, setSpec] = useState(/** @type {DiscountSpec | null} */ (null));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(/** @type {string | null} */ (null));
  const [provisioning, setProvisioning] = useState(false);
  const [provMsg, setProvMsg] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    loadPricing()
      .then(setSpec)
      .catch(() => setSpec({type: 'tiers', tiers: []}));
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const r = await savePricing(spec);
      setMsg(r.message);
    } catch (error) {
      setMsg(String(error));
    } finally {
      setSaving(false);
    }
  };

  const provision = async () => {
    setProvisioning(true);
    setProvMsg(null);
    try {
      const r = await provisionB2bDiscount();
      setProvMsg(r.messages.join(' · '));
    } catch (error) {
      setProvMsg(String(error));
    } finally {
      setProvisioning(false);
    }
  };

  if (!spec) {
    return (
      <s-page heading="Descuentos B2B">
        <s-section>
          <s-paragraph>Cargando…</s-paragraph>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Descuentos B2B">
      <s-section heading="Descuento por defecto">
        <s-paragraph>
          Se aplica a todos los clientes B2B validados que no tengan un descuento personalizado.
        </s-paragraph>
        <DiscountSpecForm spec={spec} onChange={setSpec} />
        <s-button variant="primary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar descuento por defecto'}
        </s-button>
        {msg && <s-paragraph>{msg}</s-paragraph>}
      </s-section>

      <s-section heading="Avanzado">
        <s-paragraph>
          Si el descuento automático no existiera (p. ej. app reinstalada), créalo aquí.
        </s-paragraph>
        <s-button variant="secondary" onClick={provision} disabled={provisioning}>
          {provisioning ? 'Procesando…' : 'Asegurar descuento automático'}
        </s-button>
        {provMsg && <s-paragraph>{provMsg}</s-paragraph>}
      </s-section>
    </s-page>
  );
}
```

- [ ] **Step 3: Verificar que no quedan referencias al modelo viejo**

Run: `cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app" && grep -rn "resellerPercent\|designerTiers\|PricingConfig" shared extensions/app-home/src || echo LIMPIO`
Expected: `LIMPIO` (solo `discountSpec.ts` puede mencionar `resellerPercent`/`designerTiers` en el parseo legacy).

- [ ] **Step 4: Commit (repo app)**

```bash
cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app"
git add extensions/app-home/src/components/DiscountSpecForm.jsx extensions/app-home/src/pages/HomePage.jsx
git commit -m "feat: editor del default con selector fijo/tramos"
```

---

### Task 5: Overrides por cliente en la app (página Clientes)

**Files:**
- Create: `shared/models/customerDiscount.ts`
- Create: `extensions/app-home/src/pages/CustomersPage.jsx`
- Modify: `extensions/app-home/src/AppHome.jsx`

**Interfaces:**
- Consumes: `DiscountSpec`, `parseDiscountSpec`, `normalizeSpec` (Task 3), `DiscountSpecForm` (Task 4).
- Produces: `searchCustomers(q)`, `loadCustomerDiscount(customerId)`, `saveCustomerDiscount(customerId, spec | null)` (null = borrar override → vuelve al default).

- [ ] **Step 1: Crear `shared/models/customerDiscount.ts`**

```ts
// Override de descuento por cliente: metafield customer b2b.discount (JSON DiscountSpec).
import {DiscountSpec, parseDiscountSpec, normalizeSpec} from './discountSpec';

function gqlFetch(query: string, variables?: Record<string, unknown>) {
  return fetch("shopify:admin/api/2026-04/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());
}

export interface CustomerHit {
  id: string;
  displayName: string;
  email: string | null;
  validated: boolean;
}

export async function searchCustomers(q: string): Promise<CustomerHit[]> {
  const json = await gqlFetch(
    `#graphql
    query Customers($q: String!) {
      customers(first: 10, query: $q) {
        nodes {
          id
          displayName
          email
          validated: metafield(namespace: "b2b", key: "validated") { value }
        }
      }
    }`,
    { q },
  );
  const nodes: Array<{
    id: string;
    displayName: string;
    email: string | null;
    validated: { value: string } | null;
  }> = json?.data?.customers?.nodes ?? [];
  return nodes.map((n) => ({
    id: n.id,
    displayName: n.displayName,
    email: n.email,
    validated: n.validated?.value === "true",
  }));
}

export async function loadCustomerDiscount(customerId: string): Promise<DiscountSpec | null> {
  const json = await gqlFetch(
    `#graphql
    query CustomerDiscount($id: ID!) {
      customer(id: $id) {
        metafield(namespace: "b2b", key: "discount") { value }
      }
    }`,
    { id: customerId },
  );
  return parseDiscountSpec(json?.data?.customer?.metafield?.value);
}

// spec = null -> borra el metafield (el cliente vuelve al descuento por defecto).
export async function saveCustomerDiscount(
  customerId: string,
  spec: DiscountSpec | null,
): Promise<{ ok: boolean; message: string }> {
  if (spec === null) {
    const r = await gqlFetch(
      `#graphql
      mutation DeleteDiscount($m: [MetafieldIdentifierInput!]!) {
        metafieldsDelete(metafields: $m) {
          deletedMetafields { key }
          userErrors { field message }
        }
      }`,
      { m: [{ ownerId: customerId, namespace: "b2b", key: "discount" }] },
    );
    const errs: Array<{ message: string }> = r?.data?.metafieldsDelete?.userErrors ?? [];
    if (errs.length) return { ok: false, message: errs.map((e) => e.message).join(", ") };
    return { ok: true, message: "Override eliminado — vuelve al descuento por defecto ✓" };
  }

  const clean = normalizeSpec(spec);
  const r = await gqlFetch(
    `#graphql
    mutation SetDiscount($m: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $m) {
        metafields { id }
        userErrors { field message }
      }
    }`,
    {
      m: [
        {
          ownerId: customerId,
          namespace: "b2b",
          key: "discount",
          type: "json",
          value: JSON.stringify(clean),
        },
      ],
    },
  );
  const errs: Array<{ message: string }> = r?.data?.metafieldsSet?.userErrors ?? [];
  if (errs.length) return { ok: false, message: errs.map((e) => e.message).join(", ") };
  return { ok: true, message: "Descuento personalizado guardado ✓" };
}
```

- [ ] **Step 2: Crear `CustomersPage.jsx`**

```jsx
import {useState} from 'preact/hooks';
import {
  searchCustomers,
  loadCustomerDiscount,
  saveCustomerDiscount,
} from '../../../../shared/models/customerDiscount';
import DiscountSpecForm from '../components/DiscountSpecForm.jsx';

export default function CustomersPage() {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState(/** @type {any[]} */ ([]));
  const [selected, setSelected] = useState(/** @type {any | null} */ (null));
  const [spec, setSpec] = useState(/** @type {any | null} */ (null));
  const [hasOverride, setHasOverride] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(/** @type {string | null} */ (null));

  const search = async () => {
    setBusy(true);
    setMsg(null);
    setSelected(null);
    try {
      setHits(await searchCustomers(query));
    } catch (error) {
      setMsg(String(error));
    } finally {
      setBusy(false);
    }
  };

  const select = async (hit) => {
    setBusy(true);
    setMsg(null);
    try {
      const current = await loadCustomerDiscount(hit.id);
      setSelected(hit);
      setHasOverride(current !== null);
      setSpec(current ?? {type: 'fixed', percent: 0});
    } catch (error) {
      setMsg(String(error));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveCustomerDiscount(selected.id, spec);
      setMsg(r.message);
      if (r.ok) setHasOverride(true);
    } catch (error) {
      setMsg(String(error));
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await saveCustomerDiscount(selected.id, null);
      setMsg(r.message);
      if (r.ok) {
        setHasOverride(false);
        setSpec({type: 'fixed', percent: 0});
      }
    } catch (error) {
      setMsg(String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <s-page heading="Descuentos por cliente">
      <s-section heading="Buscar cliente">
        <s-stack direction="inline" gap="base" alignItems="end">
          <s-text-field
            label="Nombre o email"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
          />
          <s-button variant="primary" onClick={search} disabled={busy || !query}>
            Buscar
          </s-button>
        </s-stack>
        {hits.map((h) => (
          <s-stack key={h.id} direction="inline" gap="base" alignItems="center">
            <s-paragraph>
              {h.displayName} {h.email ? `· ${h.email}` : ''} {h.validated ? '· B2B ✓' : '· (no B2B)'}
            </s-paragraph>
            <s-button variant="secondary" onClick={() => select(h)} disabled={busy}>
              Editar descuento
            </s-button>
          </s-stack>
        ))}
      </s-section>

      {selected && spec && (
        <s-section heading={`Descuento de ${selected.displayName}`}>
          <s-paragraph>
            {hasOverride
              ? 'Este cliente tiene un descuento personalizado (sustituye al por defecto).'
              : 'Este cliente usa el descuento por defecto. Al guardar, tendrá uno personalizado.'}
          </s-paragraph>
          <DiscountSpecForm spec={spec} onChange={setSpec} />
          <s-stack direction="inline" gap="base">
            <s-button variant="primary" onClick={save} disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar descuento personalizado'}
            </s-button>
            {hasOverride && (
              <s-button variant="tertiary" onClick={clear} disabled={busy}>
                Quitar override (volver al por defecto)
              </s-button>
            )}
          </s-stack>
        </s-section>
      )}

      {msg && (
        <s-section>
          <s-paragraph>{msg}</s-paragraph>
        </s-section>
      )}
    </s-page>
  );
}
```

- [ ] **Step 3: Registrar la ruta y el enlace de navegación en `AppHome.jsx`**

```jsx
import CustomersPage from './pages/CustomersPage.jsx';
```

En `<s-app-nav>` añadir `<s-link href="/customers">Clientes</s-link>` antes del link de Settings, y en `<Router>` añadir `<Route path="/customers" component={CustomersPage} />` antes de la ruta default.

- [ ] **Step 4: Commit (repo app)**

```bash
cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app"
git add shared/models/customerDiscount.ts extensions/app-home/src/pages/CustomersPage.jsx extensions/app-home/src/AppHome.jsx
git commit -m "feat: overrides de descuento por cliente desde la app embebida"
```

---

### Task 6: Scopes + deploy de la app (gate manual)

**Files:**
- Modify: `shopify.app.toml:20`

- [ ] **Step 1: Ampliar scopes**

En `shopify.app.toml` línea 20, cambiar:

```toml
scopes = "write_products,write_discounts"
```

por:

```toml
scopes = "write_products,write_discounts,read_customers,write_customers"
```

- [ ] **Step 2: Commit (repo app)**

```bash
cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app"
git add shopify.app.toml
git commit -m "chore: scopes read/write_customers para overrides por cliente"
```

- [ ] **Step 3: Deploy (manual — Carlos, sin sudo)**

```bash
cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax-shopify-app/mikmax-b2b-app"
shopify app deploy
```

Después, en el admin de `mikmax-2026`: aceptar los nuevos permisos de la app.

- [ ] **Step 4: Operativa post-deploy (manual — Mikmax/Carlos, misma ventana)**

1. Abrir la app → "Descuentos B2B" → elegir tipo de default → **Guardar** (escribe el formato nuevo en `b2b.pricing`).
2. Pulsar "Asegurar descuento automático" (crea la definición `b2b.discount` de cliente).
3. Abrir "Clientes" → asignar override 50% fijo a los clientes antiguos que deben conservarlo.
4. Smoke: checkout de prueba con un cliente con override (ver `Descuento profesional 50%`) y otro sin override (default).

> Hasta el paso 3, los antiguos resellers ven el default (tramos si no se cambia) en lugar de su 50% — encadenar 1→3 sin demora.

---

## FASE B — Storefront (`mikmax`, rama `feature/b2b-descuento-unificado`)

### Task 7: `lib/b2b/discountSpec.ts` (módulo puro + tests)

**Files:**
- Create: `lib/b2b/discountSpec.ts`
- Test: `__tests__/b2b/discountSpec.test.ts`

**Interfaces:**
- Produces: `type DiscountSpec`, `interface Tier`, `parseDiscountSpec(json)`, `tierPercent(tiers, subtotal)`, `displayPercent(spec: DiscountSpec | null): number` (fijo → % clamp 0-100; tramos/null → 0). Tasks 8-9 los consumen. Sin fallback horneado aquí: en el storefront, sin config legible no se muestra descuento (el real lo pone la Function igualmente).

- [ ] **Step 0: Crear la rama**

```bash
cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax"
git checkout -b feature/b2b-descuento-unificado
```

- [ ] **Step 1: Escribir el test (falla)**

Crear `__tests__/b2b/discountSpec.test.ts`:

```ts
import {describe, it, expect} from 'vitest'
import {parseDiscountSpec, tierPercent, displayPercent} from '@/lib/b2b/discountSpec'

const TIERS = [
  {minSubtotal: 0, percent: 15},
  {minSubtotal: 1000, percent: 20},
  {minSubtotal: 10000, percent: 30},
]

describe('parseDiscountSpec', () => {
  it('parsea fixed y tiers', () => {
    expect(parseDiscountSpec(JSON.stringify({type: 'fixed', percent: 50}))).toEqual({
      type: 'fixed',
      percent: 50,
    })
    expect(parseDiscountSpec(JSON.stringify({type: 'tiers', tiers: TIERS}))).toEqual({
      type: 'tiers',
      tiers: TIERS,
    })
  })
  it('mapea legacy {resellerPercent, designerTiers} a tiers', () => {
    expect(parseDiscountSpec(JSON.stringify({resellerPercent: 50, designerTiers: TIERS}))).toEqual({
      type: 'tiers',
      tiers: TIERS,
    })
  })
  it('invalido -> null', () => {
    expect(parseDiscountSpec(null)).toBeNull()
    expect(parseDiscountSpec('{}')).toBeNull()
    expect(parseDiscountSpec(JSON.stringify({type: 'fixed'}))).toBeNull()
    expect(parseDiscountSpec(JSON.stringify({type: 'tiers', tiers: [{percent: 1}]}))).toBeNull()
  })
})

describe('tierPercent', () => {
  it('tramo mas alto alcanzado; vacio/no alcanzado -> 0', () => {
    expect(tierPercent(TIERS, 999)).toBe(15)
    expect(tierPercent(TIERS, 1000)).toBe(20)
    expect(tierPercent([], 500)).toBe(0)
    expect(tierPercent([{minSubtotal: 100, percent: 10}], 50)).toBe(0)
  })
})

describe('displayPercent', () => {
  it('fixed -> percent clamp; tiers/null -> 0', () => {
    expect(displayPercent({type: 'fixed', percent: 50})).toBe(50)
    expect(displayPercent({type: 'fixed', percent: 150})).toBe(100)
    expect(displayPercent({type: 'tiers', tiers: TIERS})).toBe(0)
    expect(displayPercent(null)).toBe(0)
  })
})
```

- [ ] **Step 2: Verificar que falla**

Run: `cd "/Users/carlossalvador/Desktop/development/propios/22. Mikmax/mikmax" && npx vitest run __tests__/b2b/discountSpec.test.ts`
Expected: FAIL (módulo no existe).

- [ ] **Step 3: Crear `lib/b2b/discountSpec.ts`**

```ts
// Forma unica del descuento B2B — espejo del parseo de la Function
// (mikmax-b2b-app/extensions/b2b-discount/src/pricing.ts). Modulo puro, sin IO.

export interface Tier {
  minSubtotal: number
  percent: number
}

export type DiscountSpec = {type: 'fixed'; percent: number} | {type: 'tiers'; tiers: Tier[]}

function parseTiers(raw: unknown): Tier[] | null {
  if (!Array.isArray(raw)) return null
  const tiers: Tier[] = []
  for (const t of raw) {
    if (typeof t?.minSubtotal !== 'number' || typeof t?.percent !== 'number') return null
    tiers.push({minSubtotal: t.minSubtotal, percent: t.percent})
  }
  return tiers
}

// Acepta formato nuevo y legacy ({resellerPercent, designerTiers} -> tiers).
export function parseDiscountSpec(json: string | null | undefined): DiscountSpec | null {
  if (!json) return null
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (o.type === 'fixed') {
    return typeof o.percent === 'number' ? {type: 'fixed', percent: o.percent} : null
  }
  if (o.type === 'tiers') {
    const tiers = parseTiers(o.tiers)
    return tiers ? {type: 'tiers', tiers} : null
  }
  if (typeof o.resellerPercent === 'number') {
    const tiers = parseTiers(o.designerTiers)
    return tiers ? {type: 'tiers', tiers} : null
  }
  return null
}

// Highest minSubtotal that is <= subtotal.
export function tierPercent(tiers: Tier[], subtotal: number): number {
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

// % que se pinta en PDP/listados: solo los descuentos fijos tienen precio visible
// fuera del carrito (los tramos dependen del subtotal, indefinido sin carrito).
export function displayPercent(spec: DiscountSpec | null): number {
  if (spec?.type !== 'fixed') return 0
  return Math.max(0, Math.min(spec.percent, 100))
}
```

- [ ] **Step 4: Verificar que pasa**

Run: `npx vitest run __tests__/b2b/discountSpec.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/b2b/discountSpec.ts __tests__/b2b/discountSpec.test.ts
git commit -m "feat: DiscountSpec unificado en el storefront (parseo + displayPercent)"
```

---

### Task 8: Spec efectivo por request + display en PDP/listados

**Files:**
- Modify: `lib/shopify.js` (~línea 351, query del customer)
- Modify: `lib/b2b/pricing.ts` (reescritura)
- Modify: `app/(frontend)/shop/actions.ts`, `app/(frontend)/shop/ShopArchive.tsx`, `app/(frontend)/search/actions.ts`, `app/(frontend)/search/page.tsx`, `app/(frontend)/products/[handle]/page.tsx` (renames)
- Test: `__tests__/b2b/pricingDisplay.test.ts` (renames)

**Interfaces:**
- Consumes: `parseDiscountSpec`, `displayPercent`, `DiscountSpec` (Task 7); `getShopB2bPricing` (existente); `getCurrentCustomer` (existente).
- Produces: `getEffectiveDiscountSpec(): Promise<DiscountSpec | null>` (cacheada por request; null si no validado o sin config), `getDisplayPercent(): Promise<number>`, `discountedPrice(amount, percent)` (antes `resellerPrice`), `applyDiscountToCard(card, percent)` (antes `applyResellerToCard`). Task 9 consume `getEffectiveDiscountSpec`.

- [ ] **Step 1: Añadir el metafield override a la query del customer**

En `lib/shopify.js`, junto a `b2bValidated`/`b2bClientType` (~línea 351), añadir:

```graphql
        b2bDiscount: metafield(namespace: "b2b", key: "discount") {
          value
        }
```

(No quitar `b2bClientType` todavía — se elimina en Task 13 cuando ya no tenga usos.)

- [ ] **Step 2: Reescribir `lib/b2b/pricing.ts`**

```ts
import {cache} from 'react'
import {getShopB2bPricing} from '@/lib/shopify-admin'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {parseDiscountSpec, displayPercent, type DiscountSpec} from '@/lib/b2b/discountSpec'

// Precio descontado redondeado a 2 decimales. percent 0 → sin cambios.
export function discountedPrice(amount: number, percent: number): number {
  const pct = Math.max(0, Math.min(percent, 100))
  if (!pct) return amount
  return Math.round(amount * (1 - pct / 100) * 100) / 100
}

type CardLike = {minPrice?: number; maxPrice?: number; compareAtPrice?: number}

// Aplica el % de display a una card: min/max descontados, compareAt = min original (tachado).
export function applyDiscountToCard<T extends CardLike>(card: T, percent: number): T & CardLike {
  if (!percent || typeof card.minPrice !== 'number') return card
  return {
    ...card,
    compareAtPrice: card.minPrice,
    minPrice: discountedPrice(card.minPrice, percent),
    maxPrice:
      typeof card.maxPrice === 'number' ? discountedPrice(card.maxPrice, percent) : card.maxPrice,
  }
}

// Spec efectivo del cliente de ESTA request: override (b2b.discount) > default de
// tienda (b2b.pricing) > null. Solo clientes B2B validados.
export const getEffectiveDiscountSpec = cache(async (): Promise<DiscountSpec | null> => {
  const session = await getCurrentCustomer()
  const c = session?.customer
  if (c?.b2bValidated?.value !== 'true') return null
  const override = parseDiscountSpec(c?.b2bDiscount?.value)
  if (override) return override
  return parseDiscountSpec(await getShopB2bPricing())
})

// % a pintar en PDP/listados en ESTA request (0 si el spec es de tramos o no hay).
export const getDisplayPercent = cache(async (): Promise<number> => {
  return displayPercent(await getEffectiveDiscountSpec())
})
```

- [ ] **Step 3: Renombrar en los 5 consumidores**

Mapeo exacto (imports y usos, incluidas las variables locales `resellerPercent` → `displayPct`):

| Antes | Después |
|---|---|
| `getResellerPercent` | `getDisplayPercent` |
| `applyResellerToCard` | `applyDiscountToCard` |
| `resellerPrice` | `discountedPrice` |

Archivos: `app/(frontend)/shop/actions.ts`, `app/(frontend)/shop/ShopArchive.tsx`, `app/(frontend)/search/actions.ts`, `app/(frontend)/search/page.tsx`, `app/(frontend)/products/[handle]/page.tsx`.

Verificar: `grep -rn "getResellerPercent\|applyResellerToCard\|resellerPrice" app components lib --include="*.ts" --include="*.tsx" | grep -v discountSpec` → sin resultados.

- [ ] **Step 4: Actualizar `__tests__/b2b/pricingDisplay.test.ts`**

Aplicar el mismo mapeo de renames a imports y llamadas del test (la lógica probada no cambia).

- [ ] **Step 5: Tests + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS ambos. (`getB2bPricingConfig` ya no existe — el typecheck delatará cualquier import restante; `app/(frontend)/cart/actions.ts` la importa y se arregla en Task 9: si el typecheck falla SOLO por eso, continuar a Task 9 y validar allí.)

- [ ] **Step 6: Commit**

```bash
git add lib/shopify.js lib/b2b/pricing.ts "app/(frontend)/shop" "app/(frontend)/search" "app/(frontend)/products/[handle]/page.tsx" __tests__/b2b/pricingDisplay.test.ts
git commit -m "feat: display de precio B2B por spec efectivo (override > default)"
```

---

### Task 9: Contexto de carrito por tramos + CartDrawer

**Files:**
- Modify: `app/(frontend)/cart/actions.ts:22-37`
- Modify: `context/shopContext.js:37`
- Modify: `components/Layout/CartDrawer/CartDrawer.tsx` (líneas 36, 204-215)
- Test: `__tests__/b2b/nextTierNudge.test.ts` (solo si importa tipos renombrados)

**Interfaces:**
- Consumes: `getEffectiveDiscountSpec` (Task 8).
- Produces: `getB2bCartContext(): Promise<B2bCartContext>` con `interface B2bCartContext {hasTiers: boolean; tiers: {minSubtotal: number; percent: number}[]}`.

- [ ] **Step 1: Reescribir `getB2bCartContext` en `cart/actions.ts`**

Sustituir el import de `getB2bPricingConfig` por `getEffectiveDiscountSpec` (de `@/lib/b2b/pricing`) y el bloque 22-37 por:

```ts
export interface B2bCartContext {
  hasTiers: boolean
  tiers: {minSubtotal: number; percent: number}[]
}

// Si el spec efectivo del cliente es por tramos, los devuelve (para el nudge del carrito).
export async function getB2bCartContext(): Promise<B2bCartContext> {
  const spec = await getEffectiveDiscountSpec()
  if (spec?.type !== 'tiers' || spec.tiers.length === 0) return {hasTiers: false, tiers: []}
  return {hasTiers: true, tiers: spec.tiers}
}
```

(Los imports de `getCurrentCustomer`/`isB2bApproved` se quedan solo si `syncCartBuyer` los usa — sí los usa; eliminar únicamente el de `getB2bPricingConfig`.)

- [ ] **Step 2: Estado inicial en `context/shopContext.js:37`**

```js
const [b2bCartContext, setB2bCartContext] = useState({hasTiers: false, tiers: []})
```

- [ ] **Step 3: CartDrawer**

En `components/Layout/CartDrawer/CartDrawer.tsx`: el tipo de la prop (línea 36) pasa a `{hasTiers: boolean; tiers: {minSubtotal: number; percent: number}[]}`; en el bloque 204-215 sustituir `isDesigner` → `hasTiers` y `designerTiers` → `tiers`.

- [ ] **Step 4: Tests + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: PASS. Si `nextTierNudge.test.ts` referencia los nombres viejos, aplicar el rename ahí también.

- [ ] **Step 5: Commit**

```bash
git add "app/(frontend)/cart/actions.ts" context/shopContext.js components/Layout/CartDrawer/CartDrawer.tsx __tests__/b2b/nextTierNudge.test.ts
git commit -m "feat: nudge de tramos por spec efectivo (sin categoria designer)"
```

---

### Task 10: Registro sin categoría + scoring rebalanceado

**Files:**
- Modify: `lib/b2b/validation/score.ts`
- Modify: `types/b2b.ts` (B2bRegisterInput, ValidationSignals)
- Modify: `components/B2B/B2bRegisterForm/B2bRegisterForm.tsx`
- Modify: `app/api/b2b/register/route.ts`
- Modify: `lib/b2b/email/templates.ts:145,165`
- Test: `__tests__/b2b/score.test.ts`

**Interfaces:**
- Produces: `ValidationSignals` sin `clientTypeDeclared`; `B2bRegisterInput` sin `clientType`; puntos rebalanceados `vatValid 45, corporateEmail 25, websitePresent 15, countryMatchesVat 15` (máx 100). Umbrales sin cambio: APPROVE_AT 85, REVIEW_AT 50. Racional: las combinaciones que antes aprobaban con el `+10` de tipo declarado (p. ej. VAT+email+web = 85) siguen aprobando.

- [ ] **Step 1: Actualizar el test de scoring (falla)**

Reescribir `__tests__/b2b/score.test.ts` — quitar `clientTypeDeclared` de todas las señales y ajustar los casos clave:

```ts
import {describe, it, expect} from 'vitest'
import {scoreApplication} from '@/lib/b2b/validation/score'

const BASE = {
  vatValid: false,
  vatServiceAvailable: true,
  corporateEmail: false,
  websitePresent: false,
  countryMatchesVat: false,
  countryVerifiable: true,
}

describe('scoreApplication', () => {
  it('todo valido -> 100 approved', () => {
    const r = scoreApplication({
      ...BASE,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
    })
    expect(r.score).toBe(100)
    expect(r.decision).toBe('approved')
  })
  it('APPROVED exacto en 85 (VAT+email+web)', () => {
    const r = scoreApplication({
      ...BASE,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
    })
    expect(r.score).toBe(85)
    expect(r.decision).toBe('approved')
  })
  it('REVIEW por debajo de 85 (VAT+email = 70)', () => {
    const r = scoreApplication({...BASE, vatValid: true, corporateEmail: true})
    expect(r.score).toBe(70)
    expect(r.decision).toBe('review')
  })
  it('REJECTED por debajo de 50 (solo VAT = 45)', () => {
    const r = scoreApplication({...BASE, vatValid: true})
    expect(r.score).toBe(45)
    expect(r.decision).toBe('rejected')
  })
  it('pais no verificable -> siempre review', () => {
    const r = scoreApplication({
      ...BASE,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
      countryVerifiable: false,
    })
    expect(r.decision).toBe('review')
  })
})
```

Run: `npx vitest run __tests__/b2b/score.test.ts` → Expected: FAIL.

- [ ] **Step 2: Reescribir `score.ts`**

```ts
import type {ValidationSignals, ScoreResult, B2bDecision} from '@/types/b2b'

// Rebalanceado al quitar clientTypeDeclared (+10): su peso se reparte en
// vatValid (+5) y corporateEmail (+5) para que las combinaciones que antes
// aprobaban con el tipo declarado sigan sumando 85.
const POINTS = {
  vatValid: 45,
  corporateEmail: 25,
  websitePresent: 15,
  countryMatchesVat: 15,
}

const APPROVE_AT = 85
const REVIEW_AT = 50

export function scoreApplication(signals: ValidationSignals): ScoreResult {
  let score = 0
  if (signals.vatValid) score += POINTS.vatValid
  if (signals.corporateEmail) score += POINTS.corporateEmail
  if (signals.websitePresent) score += POINTS.websitePresent
  if (signals.countryMatchesVat) score += POINTS.countryMatchesVat

  let decision: B2bDecision = 'rejected'
  if (score >= APPROVE_AT) decision = 'approved'
  else if (score >= REVIEW_AT) decision = 'review'

  // País no verificable (fuera de UE+UK): no se puede validar el VAT, así que nunca
  // se auto-aprueba ni se auto-rechaza — siempre a revisión manual.
  if (!signals.countryVerifiable) decision = 'review'

  return {score, decision}
}
```

- [ ] **Step 3: Tipos**

En `types/b2b.ts`: eliminar `clientType: B2bClientType` de `B2bRegisterInput` y `clientTypeDeclared: boolean` de `ValidationSignals`. (`B2bClientType` y `B2bCompanyInfo.clientType` se eliminan en Task 11.)

- [ ] **Step 4: Formulario**

En `B2bRegisterForm.tsx`: quitar `clientType: 'reseller'` de `EMPTY`, el `<fieldset className={s.clientType}>` completo (líneas 98-112) y el import de `B2bClientType`. En `B2bRegisterForm.module.scss` eliminar las reglas `.clientType`/`.radio` si existen.

- [ ] **Step 5: Route + templates**

- `app/api/b2b/register/route.ts`: en `isValidPayload` quitar la línea `(b.clientType === 'reseller' || b.clientType === 'designer') &&`; en `signals` quitar `clientTypeDeclared`; en `createApprovedB2bCustomer({...})` quitar `clientType`; en las DOS llamadas a `internalReviewEmail({...})` quitar `clientType`.
- `lib/b2b/email/templates.ts`: quitar `clientType: string` del tipo del parámetro (línea 145) y la fila `${row('Tipo', data.clientType)}` (línea 165).

- [ ] **Step 6: Tests + typecheck**

Run: `npx vitest run && npm run typecheck`
Expected: score tests PASS; el typecheck fallará en `lib/b2b/shopify.ts`/`application.ts`/`admin route` (aún esperan `clientType`) → esos se arreglan en Task 11; si es el único tipo de error, continuar.

- [ ] **Step 7: Commit**

```bash
git add lib/b2b/validation/score.ts types/b2b.ts components/B2B/B2bRegisterForm/ "app/api/b2b/register/route.ts" lib/b2b/email/templates.ts __tests__/b2b/score.test.ts
git commit -m "feat: registro B2B sin categoria + scoring rebalanceado"
```

---

### Task 11: Aprobación y cuenta sin categoría

**Files:**
- Modify: `lib/b2b/shopify.ts`
- Modify: `lib/shopify-admin.js:152-170`
- Modify: `app/api/b2b/admin/route.ts:60-64`
- Modify: `lib/b2b/application.ts`
- Modify: `types/b2b.ts`
- Modify: `components/Account/CompanyInfo/CompanyInfo.tsx`
- Modify: `sanity/schemas/documents/b2bApplication.ts`

**Interfaces:**
- Produces: `createApprovedB2bCustomer({email, password, companyName})`, `createReviewedB2bCustomer({email, companyName})` (sin `clientType`); `setCustomerB2bData(customerId)` solo escribe `b2b.validated = 'true'`.

- [ ] **Step 1: `lib/b2b/shopify.ts`**

Eliminar `discountGroupFor`, el import de `B2bClientType`, y dejar:

```ts
// Aplica el rol B2B a un customer existente: tag + metafield de validacion.
async function applyB2bRole(customerId: string) {
  await customerTagsAdd(customerId, ['b2b-approved'])
  await setCustomerB2bData(customerId)
}
```

Quitar `clientType` de los args y llamadas de `createApprovedB2bCustomer` y `createReviewedB2bCustomer` (`await applyB2bRole(customerId)`).

- [ ] **Step 2: `lib/shopify-admin.js`**

`setCustomerB2bData(customerId)` sin segundo parámetro; en `variables.metafields` dejar SOLO la fila de `validated`:

```js
    metafields: [
      {ownerId: customerId, namespace: 'b2b', key: 'validated', type: 'single_line_text_field', value: 'true'},
    ],
```

- [ ] **Step 3: `app/api/b2b/admin/route.ts`**

En el bloque `action === 'approve'`, quitar `clientType: app.clientType as B2bClientType,` de la llamada y el import de `B2bClientType`.

- [ ] **Step 4: `lib/b2b/application.ts`**

- `createB2bApplication`: quitar `clientType: input.clientType,` del doc.
- `getB2bApplication`: quitar `clientType` de la projection (y del comentario).
- `getB2bCompanyInfo`: quitar `clientType` de la projection.

- [ ] **Step 5: Tipos + cuenta**

- `types/b2b.ts`: eliminar `export type B2bClientType = ...` y el campo `clientType?: B2bClientType` de `B2bCompanyInfo`.
- `CompanyInfo.tsx`: eliminar el mapa `CONDITION` y la fila `{label: 'Account type', ...}`.

- [ ] **Step 6: Schema Sanity de solicitudes**

En `sanity/schemas/documents/b2bApplication.ts` eliminar el `defineField` de `clientType` (docs antiguos conservan el dato huérfano — inofensivo).

- [ ] **Step 7: Tests + typecheck + lint**

Run: `npx vitest run && npm run typecheck && npm run lint`
Expected: PASS los tres (ya no debe quedar ningún error de `clientType`).

- [ ] **Step 8: Commit**

```bash
git add lib/b2b/shopify.ts lib/shopify-admin.js "app/api/b2b/admin/route.ts" lib/b2b/application.ts types/b2b.ts components/Account/CompanyInfo/CompanyInfo.tsx sanity/schemas/documents/b2bApplication.ts
git commit -m "feat: aprobacion y cuenta B2B sin categoria (solo b2b-approved + validated)"
```

---

### Task 12: Área profesional unificada (Sanity)

**Files:**
- Modify: `sanity/schemas/singletons/b2bArea.ts`
- Modify: `sanity/types/singletons/b2bArea.ts`
- Modify: `sanity/queries/queries/b2bArea.ts`
- Modify: `app/(frontend)/mikmax-for-business/area/page.tsx`
- Create: `scripts/migrate-b2b-area.mjs`

**Interfaces:**
- Produces: `B2bAreaData {intro?, content?: B2bAreaGroupData}`; `getB2bArea(lang)` devuelve esa forma. El objeto `b2bAreaGroup` se reutiliza como tipo del campo único `content`.

- [ ] **Step 1: Schema**

`sanity/schemas/singletons/b2bArea.ts` — sustituir los dos campos de grupo por uno:

```ts
import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'b2bArea',
  title: 'Área profesional B2B',
  type: 'document',
  fields: [
    defineField({name: 'intro', title: 'Introducción', type: 'internationalizedArrayBody'}),
    defineField({name: 'content', title: 'Contenido profesional', type: 'b2bAreaGroup'}),
  ],
  preview: {prepare: () => ({title: 'Área profesional B2B'})},
})
```

- [ ] **Step 2: Migración del contenido (semilla = grupo reseller)**

Crear `scripts/migrate-b2b-area.mjs`:

```js
// Copia b2bArea.reseller -> b2bArea.content y borra los grupos antiguos.
// Uso: node --env-file=.env.local scripts/migrate-b2b-area.mjs
import {createClient} from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

const doc = await client.fetch('*[_type == "b2bArea"][0]{_id, reseller, content}')
if (!doc) {
  console.log('No hay documento b2bArea — nada que migrar.')
  process.exit(0)
}
if (doc.content) {
  console.log('b2bArea.content ya existe — no se sobreescribe.')
} else if (doc.reseller) {
  await client.patch(doc._id).set({content: doc.reseller}).commit()
  console.log('Copiado reseller -> content ✓')
} else {
  console.log('b2bArea sin grupo reseller — nada que copiar.')
}
await client.patch(doc._id).unset(['reseller', 'designer']).commit()
console.log('Grupos reseller/designer eliminados ✓')
```

Run: `node --env-file=.env.local scripts/migrate-b2b-area.mjs`
Expected: `Copiado reseller -> content ✓` (o el mensaje de no-op que corresponda). **Nota:** el dataset `production` es compartido — ejecutar una sola vez, tras revisar la salida del fetch.

- [ ] **Step 3: Tipos + query**

`sanity/types/singletons/b2bArea.ts`:

```ts
export interface B2bAreaData {
  intro?: PortableTextBlock[]
  content?: B2bAreaGroupData
}
```

`sanity/queries/queries/b2bArea.ts` — la query pasa a:

```ts
    groq`*[_type == "b2bArea"][0]{
      ${localizedField('intro')},
      "content": content${groupProjection}
    }`,
```

(`groupProjection` y los tags `{next: {tags: ['b2bArea'], revalidate: 3600}}` no cambian.)

- [ ] **Step 4: Página**

`area/page.tsx`: eliminar `clientType`/`isDesigner`/`condition` y la fila `Status` del `<dl>`; `const group = data?.content`. El resto del render queda igual (usa `group?.*` y `data?.intro`).

- [ ] **Step 5: Tests + typecheck + build**

Run: `npx vitest run && npm run typecheck && npm run build`
Expected: PASS; el build compila el Studio embebido con el schema nuevo.

- [ ] **Step 6: Commit**

```bash
git add sanity/schemas/singletons/b2bArea.ts sanity/types/singletons/b2bArea.ts sanity/queries/queries/b2bArea.ts "app/(frontend)/mikmax-for-business/area/page.tsx" scripts/migrate-b2b-area.mjs
git commit -m "feat: area profesional B2B con contenido unico (sin grupos)"
```

---

### Task 13: Limpieza final + verificación global

**Files:**
- Modify: `lib/shopify.js` (quitar `b2bClientType` de la query del customer)

- [ ] **Step 1: Confirmar que `b2bClientType` ya no tiene usos**

Run: `grep -rn "b2bClientType" app components lib context types --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "lib/shopify.js"`
Expected: sin resultados. Si aparece alguno, arreglarlo antes de seguir.

- [ ] **Step 2: Quitar el metafield de la query**

En `lib/shopify.js`, eliminar el bloque:

```graphql
        b2bClientType: metafield(namespace: "b2b", key: "client_type") {
          value
        }
```

- [ ] **Step 3: Barrido final de la categoría**

Run: `grep -rn "client_type\|clientType\|isDesigner\|designerTiers\|resellerPercent\|B2bClientType" app components lib context types sanity --include="*.ts" --include="*.tsx" --include="*.js" | grep -v "discountSpec\|node_modules"`
Expected: sin resultados (el parseo legacy vive solo en `lib/b2b/discountSpec.ts`).

- [ ] **Step 4: Verificación completa**

Run: `npx vitest run && npm run typecheck && npm run lint && npm run build`
Expected: PASS los cuatro.

- [ ] **Step 5: Commit + push de la rama**

```bash
git add lib/shopify.js
git commit -m "chore: fin de la categoria reseller/designer en el storefront"
git push -u origin feature/b2b-descuento-unificado
```

- [ ] **Step 6: Smoke manual (Carlos — dev server lo arranca el usuario)**

1. Cliente B2B con override fijo → PDP/listados con precio tachado + % personal; carrito con descuento real.
2. Cliente B2B sin override, default tramos → PDP sin descuento visible; carrito con tramo + nudge.
3. Registro nuevo sin radio de tipo; solicitud llega a Sanity sin `clientType`.
4. `/mikmax-for-business/area` muestra el contenido único.

> Merge de la rama a `main` cuando la Fase A esté desplegada y el smoke pase (evita ventana donde el storefront espera el formato nuevo y la Function aún no lo escribe — aunque ambos lados parsean legacy, mejor no cruzarlos).
