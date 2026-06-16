# Mikmax — B2B Fase 2 · Subsistema A: Motor de descuento (Shopify Function)

**Fecha:** 2026-06-16
**Stack:** Shopify app custom (Shopify CLI) · Discount Function (cart-and-checkout) en JavaScript/TypeScript · Admin API
**Repo:** **nuevo, separado** — `mikmax-shopify-app` (no vive en el repo Next/Vercel)
**Depende de:** Fase 1 (metafields de customer `b2b.client_type` / `b2b.validated` y tags `b2b-approved` ya escritos al aprobar).

> Este documento cubre **solo el Subsistema A** (aplicar el descuento correcto en carrito/checkout). El **Subsistema B** (mostrar el precio B2B en el catálogo) es un spec/plan aparte.

---

## 1. Contexto y restricciones

Mikmax está en plan **Shopify** (no Plus): el B2B nativo (Companies + catalogs + **price lists**) no está disponible (verificado por API en Fase 1). Por eso los precios mayoristas se aplican con **descuentos**, no con listas de precio.

**Reglas de descuento** (de la spec original del cliente):
- **Reseller** → 50% fijo sobre el subtotal.
- **Designer** → escalado por subtotal del carrito:
  - 0–999 € → 15%
  - 1.000–9.999 € → 20%
  - 10.000 € + → 30%

**Decisiones cerradas en brainstorming:**
- Mecanismo: **Shopify Functions** (cart-and-checkout discount). No descuentos automáticos por Admin API (los tramos del designer son frágiles ahí).
- Config de tramos/porcentajes: **metafield de la tienda en Shopify**, editable en Admin, leído por la Function desde su input. **Sin sync con Sanity**, sin redeploy para cambiar tramos.
- App: **repo separado**, Function en **JS/TS** (coherente con el stack del equipo).

---

## 2. Arquitectura

```
mikmax-shopify-app  (Shopify CLI app, repo nuevo)
  └── extensions/b2b-discount  (Discount Function, cart-and-checkout)
         ↑ input (GraphQL): customer metafields + shop pricing metafield + subtotal
         ↓ output: order discount (% sobre subtotal) o "sin descuento"

Admin API (setup, una vez):
  - discountAutomaticAppCreate → crea el descuento automático vinculado a la Function
  - metafieldsSet → crea el metafield de config b2b.pricing en la tienda
```

- La app instala **una** extensión Discount Function y crea **un** descuento automático "de app" vinculado a ella.
- El descuento se evalúa en **todos** los carritos; la Function decide por carrito si descuenta y cuánto. Carritos no-B2B → devuelve **sin descuento** (no afecta a B2C).

---

## 3. Data flow — input de la Function

La Function **no hace llamadas de red** (no tiene). Todo lo necesario llega en el `input` GraphQL (`extensions/b2b-discount/src/run.graphql`):

```graphql
query Input {
  cart {
    cost { subtotalAmount { amount } }
    buyerIdentity {
      customer {
        clientType: metafield(namespace: "b2b", key: "client_type") { value }
        validated: metafield(namespace: "b2b", key: "validated") { value }
      }
    }
  }
  shop {
    pricing: metafield(namespace: "b2b", key: "pricing") { value }
  }
}
```

Reutiliza los metafields `b2b.*` de customer escritos en Fase 1. El metafield `b2b.pricing` (shop) lo crea el setup (§5).

---

## 4. Lógica de la Function (`src/run.ts`)

Pura y testeable. Pseudocódigo:

```
run(input):
  customer = input.cart.buyerIdentity.customer
  if !customer or customer.validated.value != "true":
    return { discounts: [] }                     # B2C o no validado → nada

  cfg = parse(input.shop.pricing.value)          # {resellerPercent, designerTiers[]}
  type = customer.clientType.value               # "reseller" | "designer"
  subtotal = Number(input.cart.cost.subtotalAmount.amount)

  percent = 0
  if type == "reseller":
    percent = cfg.resellerPercent                # 50
  elif type == "designer":
    percent = tierPercent(cfg.designerTiers, subtotal)   # mayor umbral <= subtotal
  if percent <= 0:
    return { discounts: [] }

  return {
    discounts: [{
      targets: [{ orderSubtotal: {} }],          # order-level: % sobre subtotal
      value: { percentage: { value: percent } },
      message: type == "reseller"
        ? "Descuento mayorista 50%"
        : `Descuento profesional ${percent}%`
    }],
    discountApplicationStrategy: FIRST
  }
```

- **Order-level** (% sobre el subtotal del carrito), una sola línea de descuento con mensaje.
- `tierPercent`: elige el tramo con mayor `minSubtotal` que sea `<= subtotal`.
- **Combinabilidad:** el descuento automático se configura `combinesWith` para **no** apilar con descuentos de pedido por código (evita doble descuento). Confirmable en setup.
- Robustez: si el metafield `b2b.pricing` falta o es inválido → `{ discounts: [] }` (no rompe el checkout).

---

## 5. Configuración — metafield `b2b.pricing` (shop)

JSON editable en **Shopify Admin → Settings → Custom data → Shop metafields** (definición namespace `b2b`, key `pricing`, tipo `json`):

```json
{
  "resellerPercent": 50,
  "designerTiers": [
    { "minSubtotal": 0, "percent": 15 },
    { "minSubtotal": 1000, "percent": 20 },
    { "minSubtotal": 10000, "percent": 30 }
  ]
}
```

Cambiar tramos/porcentajes = editar este JSON. **Sin redeploy.**

> El metafield se lee por la Function como `shop.metafield`. Debe tener **acceso de lectura para la app/Function** (visibilidad de metafield de tienda).

---

## 6. Estructura del repo `mikmax-shopify-app`

```
shopify.app.toml                 # config de la app (scopes, nombre)
package.json
extensions/
  b2b-discount/
    shopify.extension.toml        # tipo: discount function (cart-and-checkout), target
    src/
      run.ts                      # lógica (parse config + decidir % + output)
      run.graphql                 # input query (§3)
      run.test.ts                 # tests unitarios de la lógica
scripts/
  setup.ts                        # Admin API: crea el descuento automático + metafield b2b.pricing
```

**Scopes de la app:** `write_discounts`, `read_discounts` (crear/gestionar el descuento), `read_customers` (metafields de customer en el input de la Function). `read_products` si hiciera falta a nivel de línea (no en order-level).

---

## 7. Setup (una vez, `scripts/setup.ts` o manual)

1. `discountAutomaticAppCreate` → crea el descuento automático vinculado a la Function (`functionId`), con `combinesWith` configurado.
2. `metafieldsSet` → crea/inicializa `shop` metafield `b2b.pricing` con el JSON por defecto (§5).
3. Verificar la definición de metafield `b2b.pricing` (json) con visibilidad para la Function.

---

## 8. Deployment

- `shopify app deploy` (CLI) publica la Function a Shopify.
- La app se instala en la tienda `mikmax-2026.myshopify.com`.
- El descuento automático queda activo; la Function corre en cada checkout.

---

## 9. Testing

**Unitarios** (sin Shopify, sobre `src/run.ts`):
- `validated != "true"` o sin customer → sin descuento (B2C intacto).
- reseller → 50%.
- designer subtotal 500 → 15% · 5.000 → 20% · 50.000 → 30% (los tres tramos + los bordes 1000 y 10000).
- metafield `b2b.pricing` ausente/inválido → sin descuento (no rompe).

**Smoke en checkout** (tras deploy, con clientes de prueba):
- Carrito como reseller → 50% en el resumen.
- Carrito como designer en cada tramo → % correcto.
- Carrito como B2C → sin descuento.

---

## 10. Fuera de alcance (Subsistema B y Fase 3)

- ✗ Mostrar el precio B2B/descontado en shop/PDP/carrito **antes** del checkout (Subsistema B — su propio spec).
- ✗ Bloque de incentivo de carrito para designers ("añade X € para el siguiente tramo") — Fase 3.
- ✗ Exención de IVA / términos de pago.

---

## 11. Riesgos y prerequisitos

| Tema | Nota |
|---|---|
| Cuenta Partner / app | Crear la app en el Partner Dashboard (o como custom app con CLI) para `shopify app`. |
| Scopes | Añadir `write_discounts`/`read_discounts` (y `read_customers`) a la app. |
| Metafields en input de Function | Confirmar que la Function puede leer `customer.metafield(b2b.*)` y `shop.metafield(b2b.pricing)` (definiciones con acceso). |
| Versión de API de la Function | Fijar la versión del Function API (target `cart-and-checkout` / order discount) en el plan; la API ha evolucionado (2024-10+). |
| Moneda/decimales | El subtotal llega como string; parsear con cuidado. Asumimos EUR (mercado default ES). |
| Combinabilidad con promos | Decidir y fijar `combinesWith` (recomendado: no apilar con order discounts por código). |
