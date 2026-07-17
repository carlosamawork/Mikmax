# Devoluciones desde /account

**Fecha:** 2026-07-17 · **Estado:** aprobado por Carlos

## Objetivo

"Solicitar devolución" en el listado de pedidos de `/account/orders`: el cliente (B2C o B2B) elige líneas, cantidad y motivo; la solicitud se crea en Shopify en estado "solicitada" (`returnRequest`, verificada disponible en la tienda) y el equipo la aprueba/rechaza desde el pedido con la UI nativa del admin. Aviso interno por Mailgun a `INTERNAL_NOTIFICATION_EMAIL` (canal verificado hoy end-to-end).

## Reglas

- **Elegibilidad** (botón visible): pedido `PAID`, `processedAt` ≤ 30 días, y sin devolución en curso (`returnStatus` de Admin ∉ {RETURN_REQUESTED, IN_PROGRESS}). La existencia real de líneas devolvibles la valida el servidor al abrir el formulario (`returnableFulfillments`); si no hay, el formulario informa "No items available for return."
- **Motivos** (enum Shopify): SIZE_TOO_SMALL, SIZE_TOO_LARGE, UNWANTED, NOT_AS_DESCRIBED, WRONG_ITEM, DEFECTIVE, COLOR, STYLE, OTHER.
- **Propiedad**: la server action solo acepta ids de pedido presentes en la sesión del cliente (getUser); el id Storefront se convierte a GID Admin (numérico sin query param).
- **Idioma**: /account es hoy EN hardcodeado ("Order placed", …); las cadenas nuevas siguen ese patrón EN (la localización del área de cuenta es un pendiente aparte).
- Reembolso/aprobación: fuera de alcance (equipo, en Shopify).

## Componentes

1. **Admin API** (`lib/shopify-admin.js`, mismas credenciales client_credentials): `getOrdersReturnStatus(orderGids)`, `getReturnableItems(orderGid)` (returnableFulfillments → [{fulfillmentLineItemId, title, maxQuantity}]), `createReturnRequest({orderGid, lineItems, customerNote})` vía mutación `returnRequest`. **Requiere scopes nuevos en la custom app (manual Carlos): `read_orders`, `read_returns`, `write_returns`.** Errores de scope llegan como errores GraphQL → se propagan legibles.
2. **Lógica pura** (`lib/account/returns.ts` + tests): `isReturnEligible({processedAt, financialStatus, returnStatus}, now)`, `adminOrderGid(storefrontOrderId)`, `RETURN_REASONS` (value/label EN).
3. **Server actions** (`app/(frontend)/account/actions.ts`): `getReturnableItemsAction(orderId)` y `requestOrderReturn(orderId, selections[{fulfillmentLineItemId, quantity, returnReason}], note)` — sesión + propiedad + Admin API + email interno (builder en `lib/account/returnEmail.ts`, `sendEmail` de lib/b2b/email/mailgun).
4. **UI**: `OrdersPage` obtiene `returnStatus` de los pedidos listados (una query Admin `nodes`) y lo inyecta; `OrderCard` muestra el botón "Request return" si elegible → formulario expandible en la card (checkbox + cantidad por línea devolvible, select de motivo, textarea opcional, "Submit request"), estados loading/error/éxito ("Return requested — we'll email you once it's reviewed."). Pedido con devolución en curso → etiqueta "Return requested" en vez del botón.

## Casos borde

- Pedido sin fulfillment aún → returnableFulfillments vacío → mensaje informativo, sin mutación.
- Cantidad solicitada > devolvible → clamp en UI y validación en action.
- Doble click/submit → botón disabled durante el envío; si Shopify devuelve userError (p. ej. ya solicitada), se muestra tal cual.
- Fallo del email interno → no bloquea (la solicitud ya está en Shopify); se loggea.

## Testing

vitest: elegibilidad (fecha límite, estados, returnStatus), conversión de GID, validación de selections en la action (módulo puro extraíble). Manual: pedido real elegible → solicitar → aparece en el pedido de Shopify como devolución solicitada + email interno recibido; pedido >30 días o no pagado → sin botón.
