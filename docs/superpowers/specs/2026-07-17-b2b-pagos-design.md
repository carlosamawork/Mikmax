# Formas de pago B2B (tarjeta siempre; transferencia/giro por asignación)

**Fecha:** 2026-07-17 · **Estado:** aprobado por Carlos

## Objetivo

Clientes B2B con hasta 3 formas de pago: tarjeta (siempre disponible), transferencia bancaria y giro bancario (solo si se les asignan individualmente). Nadie más ve los métodos manuales.

## Diseño

1. **Métodos manuales** — Mikmax crea en Configuración→Pagos dos métodos de pago manuales: "Transferencia bancaria" y "Giro bancario". Pedidos con método manual = "pago pendiente" (cobro gestionado fuera; Mikmax marca pagado). La pasarela de tarjeta no se toca.
2. **Asignación** — metafield de cliente `b2b.payment` (json): `{transfer: boolean, giro: boolean}`. Ausente/inválido → solo tarjeta. Ambos asignables a la vez.
3. **Extensión `b2b-payment`** (Payment Customization Function, misma app `mikmax-b2b-app`): oculta en checkout los métodos manuales gestionados que el cliente no tenga concedidos. Identificación por nombre, case-insensitive: contiene `transferencia` → transfer; contiene `giro` → giro; cualquier otro método (tarjeta, PayPal…) jamás se toca. Gate `b2b.validated === 'true'`; no validado/invitado/sin asignación → ambos manuales ocultos.
4. **Provisioning** — botón "Asegurar": definición de metafield `b2b.payment` (CUSTOMER json, sin `access` — namespace legacy), `paymentCustomizationCreate {functionId, title: "Formas de pago B2B", enabled: true}` sin duplicar, functionId por apiType `payment-customization` con fallback por título `b2b-payment`. Scope nuevo `write_payment_customizations`.
5. **UI** — página Clientes B2B, sección "Forma de pago": dos checkboxes (Transferencia, Giro) + guardar + quitar (borrar metafield = solo tarjeta). Modelo gemelo de `customerDiscount.ts`/`customerShipping.ts` (topLevelErrors incluido).
6. **Storefront:** sin cambios.

## Casos borde

- Método manual con nombre que contenga ambas palabras → se trata como transfer (primera regla que case; documentar que no se nombren así).
- Cliente con `{transfer:false, giro:false}` guardado ≡ sin metafield: solo tarjeta.
- Payment customizations no disponibles en el plan → error visible en el provisioning (mensaje del API); se evalúa alternativa.

## Testing

Function: parseo del spec, clasificación por nombre (case-insensitive, métodos ajenos intocables), matriz validated×asignación. Manual: checkout B2C sin métodos manuales; B2B sin asignación solo tarjeta; con transfer asignada aparece transferencia; ídem giro; ambos.

## Operativa

Deploy ANTES de provisionar (regla general de la app) → "Asegurar" → crear los dos métodos manuales → smoke. Actualizar la guía PDF del cliente con la sección de pagos.
