# Mikmax — B2B Fase 2 · Motor de descuento (Function) + precio B2B en la tienda

**Fecha:** 2026-06-17
**Stack:** Shopify Discount Function (JS/TS, repo separado) · Next.js 15 (display) · Admin API · Storefront Cart API
**Supersede a:** `2026-06-16-mikmax-b2b-fase2a-discount-engine-design.md` (ese cubría solo la Function; este añade el display en tienda y consolida la Fase 2 completa).
**Depende de:** Fase 1 — al aprobar, el customer ya tiene tag `b2b-approved` y metafields `b2b.client_type` (`reseller`|`designer`) y `b2b.validated=true`.

---

## 1. Contexto y restricción verificada

Mikmax está en plan **Shopify** (no Plus). Verificado por API el 2026-06-17 (test de crear-y-borrar):
- `companyCreate` ✅ y `priceListCreate` ✅ funcionan.
- `catalogCreate` con contexto de company location **siempre falla**: *"Catalogs assigned to company locations can't be set to active with your plan"* — en DRAFT y ACTIVE, con o sin price list.

Conclusión: el B2B nativo da el armazón de cuentas/empresas pero **NO el pricing por catálogo** en este plan. Por eso los precios mayoristas se aplican con **descuentos** (Shopify Function), no con price lists.

**Reglas de descuento (spec original del cliente):**
- **Reseller** → 50% fijo sobre el subtotal.
- **Designer** → escalado por subtotal del carrito: 0–999 € → 15% · 1.000–9.999 € → 20% · 10.000 € + → 30%.

**Decisiones cerradas en brainstorming (2026-06-17):**
- Mecanismo: **Shopify Function** (cart-and-checkout order discount). Los tramos del designer no se pueden hacer con descuentos automáticos básicos.
- **Alcance del display:** reseller −50% visible en **toda la tienda**; descuento designer visible **solo en carrito + checkout** (el tramo no existe sin carrito).
- **Enfoque A:** la Function es la fuente de verdad. El **carrito lee el descuento real** del Storefront Cart API (vale para reseller y designer). En el Next **solo se espeja el −50% plano del reseller** en PDP/listados. Mínima duplicación de lógica.
- Config de tramos/%: **metafield de tienda** `b2b.pricing` (JSON), editable en Admin, leído por **ambos** (Function y Next). Sin redeploy para cambiar tramos.
- La Function vive en un **repo separado** (`mikmax-shopify-app`); el display vive en el repo Next.

---

## 2. Arquitectura

```
mikmax-shopify-app   (repo NUEVO, Shopify CLI)                  ← Subsistema A
  extensions/b2b-discount/  → Function (cart-and-checkout, order discount)
  scripts/setup.ts          → discountAutomaticAppCreate + metafieldsSet(b2b.pricing)

mikmax  (repo Next actual)                                      ← Subsistema B
  lib/b2b/pricing.ts        → lectura de config + display reseller
  PDP / ProductCard         → precio reseller ×(1−resellerPercent)
  context/shopContext.js    → buyerIdentity en el carrito al login B2B
  CartDrawer / página carrito → totales y descuento desde cart.cost de Shopify

Contrato compartido: metafield de tienda  b2b.pricing (json)
  { resellerPercent: 50, designerTiers: [{minSubtotal,percent}...] }
  Única fuente de verdad. Lo leen Function (input) y Next (Admin API).
```

- La app instala **una** Function y crea **un** descuento automático "de app" vinculado a ella. Se evalúa en todos los carritos; carritos no-B2B → sin descuento (B2C intacto).
- **Linchpin del enfoque A:** para que la Function aplique (y el carrito lo refleje), el carrito debe llevar `buyerIdentity.customerAccessToken` del cliente B2B. Se setea **al login**, no solo al ir al checkout.

---

## 3. Subsistema A — Function (repo `mikmax-shopify-app`)

### 3.1 Input (`extensions/b2b-discount/src/run.graphql`)
La Function no hace llamadas de red; todo llega en el input:

```graphql
query Input {
  cart {
    cost { subtotalAmount { amount } }
    buyerIdentity {
      customer {
        clientType: metafield(namespace: "b2b", key: "client_type") { value }
        validated:  metafield(namespace: "b2b", key: "validated")  { value }
      }
    }
  }
  shop {
    pricing: metafield(namespace: "b2b", key: "pricing") { value }
  }
}
```

### 3.2 Lógica (`src/run.ts`) — pura y testeable
```
run(input):
  customer = input.cart.buyerIdentity.customer
  if !customer or customer.validated.value != "true": return { discounts: [] }   # B2C / no validado

  cfg = parse(input.shop.pricing.value)            # {resellerPercent, designerTiers[]}
  type = customer.clientType.value                 # "reseller" | "designer"
  subtotal = Number(input.cart.cost.subtotalAmount.amount)

  percent = 0
  if type == "reseller": percent = cfg.resellerPercent
  elif type == "designer": percent = tierPercent(cfg.designerTiers, subtotal)   # mayor minSubtotal <= subtotal
  if percent <= 0: return { discounts: [] }

  return {
    discounts: [{
      targets: [{ orderSubtotal: {} }],
      value: { percentage: { value: percent } },
      message: type == "reseller" ? "Descuento mayorista 50%" : `Descuento profesional ${percent}%`
    }],
    discountApplicationStrategy: FIRST
  }
```
- Order-level (% sobre subtotal), una línea con mensaje.
- `combinesWith` configurado para **no** apilar con descuentos de pedido por código (evita doble descuento).
- Robustez: `b2b.pricing` ausente/inválido → `{ discounts: [] }` (no rompe el checkout).

### 3.3 Estructura del repo
```
shopify.app.toml · package.json
extensions/b2b-discount/
  shopify.extension.toml      # discount function, target cart-and-checkout order discount
  src/{run.ts, run.graphql, run.test.ts}
scripts/setup.ts              # Admin API: descuento automático + metafield b2b.pricing
```
Scopes app: `write_discounts`, `read_discounts`, `read_customers`.

### 3.4 Setup (una vez)
1. `discountAutomaticAppCreate` → descuento automático vinculado a la Function (`functionId`), con `combinesWith`.
2. `metafieldsSet` → `shop` metafield `b2b.pricing` (json) con el default de §5.
3. Verificar la definición de metafield `b2b.pricing` con visibilidad para la Function.

---

## 4. Subsistema B — Precio B2B en la tienda (repo Next)

### 4.1 Config compartida — `lib/b2b/pricing.ts`
- `getB2bPricingConfig()`: lee el `shop` metafield `b2b.pricing` vía **Admin API** (server-side, `lib/shopify-admin.js`), cacheado con `next: {tags:['b2b-pricing'], revalidate}`. Devuelve `{resellerPercent, designerTiers}`. Si falta/invalida → `null`.
- `resellerDisplayPrice(amount, config)`: `amount * (1 - resellerPercent/100)`. Solo reseller.
- `getB2bCustomerType(session)`: deriva `reseller`|`designer`|`null` de `getCurrentCustomer()` (ya lee los metafields `b2b.*` en Fase 1).

> Solo se necesita `resellerPercent` para el display de PDP/listados; el designer se lee del carrito real. La dependencia del frontend con la config es mínima.

### 4.2 PDP + ProductCard (listados)
Server components. Pseudocódigo de presentación:
```
type = getB2bCustomerType(session)
if type == "reseller" and config:
   mostrar precioOriginal (tachado) + resellerDisplayPrice(precio, config)
else:
   precio normal (designer y B2C ven precio completo en PDP/listados)
```
Para designer se puede mostrar una nota discreta "Precio profesional aplicado en el carrito" (opcional, no bloqueante).

### 4.3 buyerIdentity en el carrito — `context/shopContext.js`
- Al **login** de un cliente B2B validado: `cartBuyerIdentityUpdate(cartId, {customerAccessToken})` sobre el carrito existente (si lo hay).
- Al **crear** un carrito estando logueado B2B: setear `buyerIdentity` en el `cartCreate`/primer add.
- Al **logout:** limpiar `buyerIdentity` para no arrastrar descuento obsoleto.
- Reusa `cartBuyerIdentityUpdate` ya añadida en `lib/shopify.js` (fix de checkout).

### 4.4 CartDrawer + página de carrito
- Totales desde el `cart.cost` de Shopify (`subtotalAmount` vs `totalAmount`), no desde la suma local de líneas.
- Línea de descuento desde `cart.discountAllocations` (o `subtotal − total`) con su `message` → correcto para reseller **y** designer sin recalcular.
- Requiere exponer `cost { subtotalAmount totalAmount } discountAllocations { discountedAmount { amount } ... }` en el fragmento de carrito del Storefront API.

---

## 5. Contrato de config — metafield `b2b.pricing` (shop)

JSON editable en **Admin → Settings → Custom data → Shop metafields** (namespace `b2b`, key `pricing`, tipo `json`):
```json
{
  "resellerPercent": 50,
  "designerTiers": [
    { "minSubtotal": 0,     "percent": 15 },
    { "minSubtotal": 1000,  "percent": 20 },
    { "minSubtotal": 10000, "percent": 30 }
  ]
}
```
Cambiar tramos/% = editar este JSON. **Sin redeploy.** Lo lee la Function (input) y el Next (Admin API). Al cambiarlo, invalidar el tag `b2b-pricing` (revalidación on-demand) para refrescar el display.

---

## 6. Manejo de errores (degradar, nunca romper)

| Situación | Comportamiento |
|---|---|
| `b2b.pricing` ausente/inválido | Function → sin descuento. Next → sin display B2B (precios completos). |
| Cliente no validado / B2C | Todo sin cambios, en tienda y checkout. |
| Fallo al setear `buyerIdentity` en el carrito | Carrito muestra precio completo, pero el checkout aplica igual (fallback: `prepareCheckout` ya existente). |
| Designer en PDP/listados | Precio completo (por diseño; el tramo no existe sin carrito). |

---

## 7. Testing

**Function (unit, sin Shopify, sobre `src/run.ts`):**
- `validated != "true"` / sin customer → sin descuento (B2C intacto).
- reseller → 50%.
- designer: 500→15% · 5.000→20% · 50.000→30% + bordes 1.000 y 10.000.
- `b2b.pricing` ausente/inválido → sin descuento.

**`lib/b2b/pricing.ts` (unit):**
- `resellerDisplayPrice` correcto.
- B2C / designer → sin transformación en PDP.
- config `null` → sin display.

**Smoke tras deploy (clientes de prueba):**
- reseller → −50% en PDP + carrito + checkout.
- designer → completo en PDP; tramo correcto en carrito + checkout (probar los tres tramos).
- B2C → intacto en toda la tienda y checkout.

---

## 8. Decomposición y orden

- **Plan A — Function (`mikmax-shopify-app`):** independiente, desplegable solo. El usuario hace `shopify app init` + `generate extension`; luego se implementa Function + tests + `setup.ts`; el usuario despliega (`shopify app deploy`).
- **Plan B — Display (repo Next):** el espejo reseller de PDP/listados es independiente; el carrito-lee-descuento-real **depende de A desplegado**. **Orden: A primero, luego B.**

Cada plan produce software funcional y testeable por sí mismo.

---

## 9. Fuera de alcance (Fase 3+)

- ✗ Exención de IVA / términos de pago.
- ✗ Bloque de incentivo "añade X € para el siguiente tramo" (designer).
- ✗ Mostrar tramo designer en PDP/listados (decisión explícita: solo carrito/checkout).

---

## 10. Riesgos y prerequisitos

| Tema | Nota |
|---|---|
| Cuenta Partner / CLI | Crear la app (`shopify app init`) para `shopify app deploy`. Tarea del usuario. |
| Scopes de la app Function | `write_discounts`, `read_discounts`, `read_customers`. |
| Metafields en input de Function | Confirmar lectura de `customer.metafield(b2b.*)` y `shop.metafield(b2b.pricing)` (definiciones con acceso para la Function). |
| Descuento automático visible en Storefront Cart | El enfoque A asume que el descuento de Function se refleja en `cart.cost`/`discountAllocations` del Storefront API con `buyerIdentity` seteado. Validar en el primer smoke tras deploy; si no apareciera, fallback = espejar también el designer en el carrito (enfoque B parcial). |
| Versión de API de la Function | Fijar la versión del Function API (cart-and-checkout order discount). |
| Moneda/decimales | Subtotal llega como string; asumir EUR (mercado default ES). |
| Combinabilidad con promos | `combinesWith`: no apilar con order discounts por código. |
