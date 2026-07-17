# Descuento B2B unificado (sin reseller/designer)

**Fecha:** 2026-07-17
**Estado:** aprobado por Carlos (diseño conversado en sesión)

## Objetivo

Eliminar la categoría de cliente B2B (reseller/designer). En su lugar:

1. Un **descuento por defecto** para todos los B2B validados, configurable por Mikmax como **fijo (%)** o **por tramos** de subtotal.
2. Un **override por cliente** (también fijo o por tramos) que sustituye por completo al default, gestionado desde la app B2B embebida.

El display en el storefront sigue las reglas actuales: descuento fijo → precio descontado visible en PDP/listados/buscador/size-selector (como hoy resellers); por tramos → visible solo en carrito/checkout con nudge de siguiente tramo (como hoy designers).

## Modelo de datos

```ts
type DiscountSpec =
  | {type: 'fixed'; percent: number} // 0–100
  | {type: 'tiers'; tiers: {minSubtotal: number; percent: number}[]}
```

| Dónde | Metafield | Contenido |
|---|---|---|
| Tienda | `b2b.pricing` (existe, cambia de forma) | `DiscountSpec` — el default |
| Cliente | `b2b.discount` (nuevo, JSON) | `DiscountSpec` — el override |
| Cliente | `b2b.validated` (existe, sin cambios) | Gate: sin `'true'` no hay descuento |
| Cliente | `b2b.client_type` (existe) | **Deja de leerse.** No se borra el dato |

**Regla efectiva** (idéntica en Function y storefront):
`efectivo = parse(override) ?? parse(default) ?? fallback horneado` — solo si `validated === 'true'`.

**Parseo legacy:** `{resellerPercent, designerTiers}` (forma actual de `b2b.pricing`) se acepta y se mapea a `{type: 'tiers', tiers: designerTiers}`. Evita ventana rota entre el deploy de la Function y el primer guardado del editor. Consecuencia asumida: los resellers actuales pierden el 50% hasta que se les asigne override (paso 3 del plan operativo).

**Fallback horneado** (`DEFAULT_PRICING`): `{type: 'tiers', tiers: [{0,15},{1000,20},{10000,30}]}`.

## Componentes

### 1. Function (`../mikmax-shopify-app/mikmax-b2b-app/extensions/b2b-discount`)

- `cart_lines_discounts_generate_run.graphql`: añadir `discount: metafield(namespace:"b2b", key:"discount")` al customer; eliminar `clientType`.
- `src/pricing.ts`:
  - `parseDiscountSpec(json)` — valida forma nueva y mapea legacy; devuelve `null` si inválido.
  - `computeDiscountPercent(spec, subtotal)` — `fixed` → `percent`; `tiers` → tramo más alto con `minSubtotal <= subtotal` (lógica `tierPercent` actual).
  - Precedencia override > default > fallback dentro del adapter.
- Mensaje del descuento unificado: `Descuento profesional X%`.
- `cart_delivery_options_discounts_generate_run.*` se revisa por si referencia client_type (mismo tratamiento).

### 2. App embebida (`extensions/app-home` + `shared/models/b2bSetup.ts`)

- **Editor del default** (`HomePage.jsx`): selector "Fijo (%) / Por tramos". Fijo → campo numérico único; tramos → filas actuales. `loadPricing`/`savePricing` leen/escriben el `DiscountSpec` en `b2b.pricing` (load acepta legacy).
- **Overrides por cliente** (sección/página nueva): buscador de clientes vía Admin Direct API (`customers(query:)`), muestra el override actual, mismo formulario fijo/tramos para asignar o **quitar** (quitar = borrar metafield → vuelve al default).
- **Scopes**: añadir `read_customers` y `write_customers` en `shopify.app.toml` → `shopify app deploy` + re-aceptar permisos en el admin.
- Gotcha conocido: nunca ejecutar shopify/npm con sudo (archivos root-owned).

### 3. Storefront (repo principal)

- `lib/b2b/pricing.ts`: sustituir `getResellerPercent()` por `getCustomerDiscountSpec()` (cacheada por request):
  - Lee `b2b.discount` del customer vía Storefront (misma mecánica con la que hoy se lee `client_type` en `lib/shopify.js`) + `b2b.pricing` de tienda vía Admin (como hoy).
  - Deriva `displayPercent` (el % si el efectivo es `fixed`, si no 0) para PDP/listados/buscador/size-selector — mismos puntos de consumo que hoy (`applyResellerToCard` se renombra a `applyDiscountToCard`).
- `app/(frontend)/cart/actions.ts` — `getB2bCartContext`: `{isDesigner, designerTiers}` → `{hasTiers, tiers}` según el spec efectivo. `nextTierNudge` en CartDrawer sin cambios de lógica.
- Descuento real del carrito: sigue leyéndose de la Cart API (`parseCartCost`) — sin cambios.
- **Limpieza de la categoría:**
  - `B2bRegisterForm`: fuera el radio de tipo de cliente; `api/b2b/register` deja de validarlo/propagarlo.
  - `lib/b2b/validation/score.ts`: fuera `clientTypeDeclared` (10 pts) — revisar que los umbrales de auto-aprobación/review siguen cuadrando con el nuevo máximo.
  - `lib/b2b/shopify.ts` `applyB2bRole`: deja de escribir `client_type` y el tag reseller/designer; queda solo `b2b-approved` + `validated`.
  - Sanity: `b2bApplication.clientType` se elimina del schema (docs viejos conservan el dato, inofensivo); singleton `b2bArea` pasa de contenido por grupo a contenido único (se toma como semilla el contenido del grupo reseller actual; editable después en Studio); `area/page.tsx` deja de bifurcar por `isDesigner`.
  - `CompanyInfo.tsx` (cuenta): fuera la fila "Account type".
  - `app/api/b2b/admin/route.ts`: aprobar sin `clientType`.

## Plan operativo (orden de deploy)

1. **Deploy app** (Function + editor + overrides). Designers actuales no notan nada (legacy → tramos); resellers actuales pierden el 50% temporalmente.
2. Mikmax abre el editor y **guarda el default** (fijo o tramos, lo que decida).
3. Mikmax **asigna overrides** (p. ej. 50% fijo a clientes antiguos) desde la nueva sección. Resuelve la petición de julio (mantener 50% a antiguos).
4. **Deploy storefront** (display unificado + limpieza registro/área/cuenta/scoring).

Los pasos 1–3 deben encadenarse en la misma ventana para minimizar el tiempo con resellers sin su 50%.

## Errores y casos borde

- Override con JSON inválido → se ignora (cae al default). El editor de la app es la única vía de escritura prevista, con validación previa al guardado.
- `tiers` vacío o sin tramo alcanzado → 0% (sin operación de descuento, como hoy).
- `percent` fuera de 0–100 → clamp al guardar en el editor; el parseo rechaza valores no numéricos.
- Cliente no validado con override → sin descuento (el gate `validated` va primero).
- Metafield de tienda ilegible desde la Function → fallback horneado (comportamiento actual).

## Testing

- **Function** (`pricing.test.ts`): parseo forma nueva (fijo y tramos), mapeo legacy, rechazo de inválidos, precedencia override > default > fallback, cálculo fijo y por tramos (bordes de tramo), gate validated.
- **Repo principal** (vitest): `parseDiscountSpec`/`displayPercent`, `applyDiscountToCard`, `getB2bCartContext` con specs fijo/tramos, scoring sin `clientTypeDeclared`.
- **Manual**: guardar default fijo y por tramos desde el editor; asignar/quitar override a un cliente de prueba; verificar PDP con fijo, nudge con tramos y el descuento real en checkout.
