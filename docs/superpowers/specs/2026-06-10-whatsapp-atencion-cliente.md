---
title: WhatsApp como canal de atención — propuesta para Mikmax
date: 2026-06-10
status: propuesta (sin implementar)
audience: cliente
---

# WhatsApp como canal de atención — propuesta para Mikmax

> Documento de planteamiento para presentar al cliente. **No es una implementación**, sino las opciones, lo que requiere cada una y el camino recomendado.

## El punto de partida
Hoy no hay nada montado: solo un botón en la web que abre un chat a un número. El cliente quiere **automatizar respuestas** porque:
1. Entran muchísimas preguntas y saturan al equipo.
2. Ese tiempo muchas veces **no acaba en pedido** (lo usan casi como "personal shopping").

## Enfoque por fases (recomendado)
- **Fase 1 — Reducir carga** (ahora): que el sistema conteste solo lo repetitivo.
- **Fase 2 — Convertir** (después): asistente que recomienda producto y guía a la compra.

---

## Las 3 opciones, de menos a más

### Opción A — App de WhatsApp Business (gratis)
- **Qué hace:** mensaje de bienvenida automático, mensaje de ausencia (fuera de horario), **respuestas rápidas** guardadas, etiquetas para organizar y catálogo de productos dentro del chat.
- **Qué NO hace:** no es un bot. El equipo sigue respondiendo a mano (solo más rápido).
- **Coste:** 0 €. **Tiempo:** días.
- **Para quién:** validar el canal sin invertir.

### Opción B — Plataforma con bot (SaaS de pago) ⭐ recomendada para empezar de verdad
- **Qué hace:** migra a la **WhatsApp Business Platform (API oficial de Meta)** a través de un proveedor con constructor de bots sin código. Bot real de FAQ que responde solo (envíos, devoluciones, tallas, materiales, **estado del pedido** conectándolo a Shopify), con **handoff a persona** cuando hace falta, multi-agente y horarios.
- **Coste:** cuota del proveedor (~50–300 €/mes según herramienta) + coste por conversación de Meta (las iniciadas por el cliente dentro de la ventana de 24h hoy son en su mayoría gratis; las que inicia la marca con plantilla tienen coste por mensaje).
- **Tiempo:** 2–4 semanas. Para una marca en Shopify hay proveedores que se integran con catálogo y pedidos.

### Opción C — Solución a medida con IA propia
- **Qué hace:** desarrollo de una capa con IA conectada al catálogo (Shopify/Sanity). Control total y base directa para la Fase 2.
- **Coste:** desarrollo a medida (mayor) + infraestructura.
- **Veredicto honesto:** sobreingeniería **hoy**. Tiene sentido en Fase 2, no para arrancar.

---

## Lo que el CLIENTE tiene que hacer / decidir

1. **Número dedicado de WhatsApp** — no un móvil personal. Para la API (Opción B/C) debe ser un número **que no esté ya registrado en un WhatsApp personal**.
2. **Cuenta de Meta Business verificada** — probablemente ya la tienen (se usa el pixel de Meta `2477340732553404`), lo cual acelera la activación de la API.
3. **Decidir presupuesto** (¿gratis primero o directo a plataforma de pago?).
4. **Aportar el contenido de las FAQ** — envíos, devoluciones, tallas, materiales, pagos, seguimiento de pedido — **en español e inglés** (enlaza con el plan bilingüe del proyecto).
5. **Definir reglas de escalado** — cuándo el bot pasa a una persona, y horario del equipo.
6. **Elegir proveedor** — preparamos una preselección de 2–3 según volumen.

---

## Medición: "el tiempo no se refleja en el valor del pedido"
Atacable **independientemente de la opción elegida**:
- Ya existe el evento `whatsapp_click` en GA4 + Meta (cuánta gente abre WhatsApp y desde qué página).
- El botón puede **llevar contexto** (qué producto miraban) en el mensaje pre-rellenado.
- Para atribuir pedido real: lo más fiable son **códigos de descuento exclusivos de WhatsApp** (rastreables en Shopify) o la analítica del propio proveedor integrada con Shopify.
- *Honestidad:* la atribución conversación→pedido en WhatsApp nunca es perfecta; estos proxies son lo razonable.

---

## Recomendación para presentar
**Opción A como arranque inmediato (gratis, esta semana)** + plan para **Opción B en 3–4 semanas** una vez el cliente apruebe presupuesto y elija proveedor. La **Opción C (IA / personal shopper)** se plantea como **Fase 2**, cuando el canal esté validado y midiendo.

---

## Próximos pasos sugeridos
1. Presentar estas opciones al cliente y recoger: presupuesto, número dedicado, contenido de FAQ.
2. Si se aprueba la Opción B: preselección de proveedores (2–3) con precios concretos.
3. Definir el flujo del bot y las reglas de escalado.
4. Implementar medición (contexto en el botón + códigos de descuento de WhatsApp).
