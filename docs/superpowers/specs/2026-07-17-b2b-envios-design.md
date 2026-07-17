# Envíos B2B (tarifas propias + override por cliente)

**Fecha:** 2026-07-17 · **Estado:** aprobado por Carlos (diseño conversado)

## Objetivo

Envíos con precio distinto para B2B sin tocar los B2C actuales, replicando el patrón del descuento: un "default" B2B y un override por cliente.

## Diseño

1. **Tarifas B2B = default.** Mikmax las crea en Ajustes→Envíos junto a las actuales, con el prefijo literal `B2B ` en el nombre. Las B2C no se tocan. Pueden ser más caras que las públicas.
2. **Visibilidad** — extensión nueva `b2b-delivery` (Delivery Customization Function) en `mikmax-b2b-app`: cliente `b2b.validated === 'true'` → oculta las opciones cuyo título NO empiece por `B2B `; resto → oculta las que sí. **Salvaguarda:** si un grupo de entrega no contiene ninguna opción `B2B `, no se oculta nada en ese grupo (nunca un checkout sin envío). Scope nuevo: `write_delivery_customizations`.
3. **Override por cliente** — metafield `b2b.shipping` (json):
   `{type:'percent', percent}` (rebaja %) | `{type:'price', amount}` (precio objetivo; la Function calcula la rebaja desde el coste de cada opción visible, nunca negativo). Lo aplica el target de envío de la Function de descuentos existente (`cart_delivery_options_discounts_generate_run`), gateado por `validated`. El descuento automático amplía sus clases a `ORDER + SHIPPING` (provisioning actualiza el existente). Límite conocido: el override solo abarata la tarifa B2B visible.
4. **UI** — página Clientes de la app: sección "Envío personalizado" (form percent/price + guardar + quitar), junto a la del descuento. Sin editor de default en la app (el default vive en Ajustes→Envíos). Provisioning crea la definición del metafield `b2b.shipping` (sin acceso storefront: solo lo lee la Function; recordar que el namespace b2b legacy rechaza `access.admin` explícito).
5. **Storefront:** sin cambios (el envío solo aparece en checkout).

## Casos borde

- Override inválido/ausente → sin descuento de envío (tarifa B2B tal cual).
- `price` ≥ coste de la opción → sin descuento (no se sube el precio).
- Cliente no validado con override → nada (gate validated primero).
- Zona sin tarifas B2B → el B2B ve las públicas (salvaguarda).
- Si el API de delivery discounts no soporta `fixedAmount`, el modo `price` se implementa como porcentaje calculado por opción: `(cost−amount)/cost·100`.

## Testing

Function: parseo del shipping spec, cálculo por opción (percent, price, price≥cost, inválido), gate validated; customization: ocultar por prefijo en ambos sentidos + salvaguarda de grupo sin B2B. Manual: checkout B2C intacto, checkout B2B ve solo tarifas B2B, override baja el precio.

## Operativa post-deploy

`shopify app deploy` + aceptar scope; re-ejecutar "Asegurar descuento automático" (añade clase SHIPPING + definición b2b.shipping); crear tarifas `B2B ` en Ajustes→Envíos (instrucciones para Mikmax al cierre).
