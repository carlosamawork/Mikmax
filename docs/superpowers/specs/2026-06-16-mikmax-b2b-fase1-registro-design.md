# Mikmax — B2B "Mikmax for Business" · Fase 1: Landing + Registro con validación automática

**Fecha:** 2026-06-16
**Stack:** Next.js 15 (App Router) · Sanity CMS v3 · Shopify Storefront + Admin API · Mailgun · SCSS · TypeScript
**Dominio:** https://www.mikmax.com
**Figma origen:** `Mikmax | Programación V2`, frame `32:14795` ("Desktop | Mikmax for Business")

> Este documento cubre **solo la Fase 1** del programa B2B. Ver §1 para el mapa completo de fases.

---

## 1. Contexto y alcance del programa B2B

Mikmax habilita venta **mayorista self-service**: empresas (revendedores e interioristas) se registran, se validan, y compran online con su precio/descuento. El B2C ya está en producción y **no se toca** salvo lo estrictamente necesario para integrar el B2B.

El programa B2B completo son **6 subsistemas** repartidos en 3 fases. Cada fase tiene su propio spec → plan → implementación.

| Fase | Subsistemas | Estado |
|---|---|---|
| **Fase 1 (este doc)** | 1) Registro + validación automática · 2) Sanity `b2bApplication` + panel admin · landing "Mikmax for Business" · login B2B | **En diseño** |
| **Fase 2** | 3) Shopify Functions de descuento (reseller 50% / designer escalado) · 4) Precio mayorista en catálogo B2C | Pendiente |
| **Fase 3** | 5) Bloque incentivo de carrito (designers) · 6) Área profesional ampliada | Pendiente |

**Decisión clave heredada:** las Shopify Functions (Fase 2) **no viven en este repo**. Son una extensión de una **Shopify App custom desplegada por Shopify CLI** (mismo patrón ya documentado para `bundle-discount` en el spec de arquitectura MVP §6.3). Esa app **se creará desde cero** cuando arranque la Fase 2. La Fase 1 **no depende** de ella.

### Objetivo de la Fase 1

Un flujo de alta B2B end-to-end:

1. La empresa entra a `/b2b` ("Mikmax for Business"), conoce la propuesta y puede **iniciar sesión** (si ya es cliente) o **darse de alta**.
2. Rellena el formulario de alta en `/b2b/register`.
3. Un backend valida automáticamente (VIES, Companies House, dominio de email, coherencia país-VAT) y **puntúa** la solicitud.
4. Según la puntuación: **APPROVED** (alta inmediata + login listo), **REVIEW** (queda pendiente en Sanity para revisión manual) o **REJECTED** (se pide más información).
5. Un panel en Sanity Studio permite **Aprobar / Rechazar / Pedir info** las solicitudes en REVIEW.
6. Toda transición dispara el **email** correspondiente (Mailgun).
7. Un cliente aprobado puede entrar a su **área profesional** `/b2b/area`.

### Fuera de la Fase 1 (explícito)

- ✗ Descuentos reales en checkout (Shopify Functions) → Fase 2.
- ✗ Mostrar `wholesale_price` en catálogo B2C → Fase 2.
- ✗ Bloque de incentivo de carrito para designers → Fase 3.
- ✗ Multi-currency / multi-market para B2B.
- ✗ El área profesional `/b2b/area` se entrega **mínima** (condición, política estática, contacto). Su versión rica es Fase 3.

---

## 2. Decisiones arquitectónicas nucleares

| Decisión | Resolución |
|---|---|
| **Modelo de negocio** | Mayorista self-service (revendedor / interiorista). |
| **Authority de la solicitud** | **Sanity** (`b2bApplication`) es el registro maestro de toda solicitud y su estado. |
| **Authority del cliente B2B** | **Shopify Customer** (tags + metafields namespace `b2b`). Se crea al **aprobar** (auto o manual). |
| **Auth** | Reutiliza el auth B2C existente: classic Storefront customer tokens + cookie httpOnly `mikmax_customer_token`. **No** se crea un sistema de login nuevo. |
| **Gating B2B** | Por **tag** de Shopify `b2b-approved`. `/b2b/area` se protege comprobando ese tag con `getCurrentCustomer()`. |
| **Contraseña** | El formulario de alta **pide contraseña**. Ver §6.3 para el matiz de seguridad APPROVED vs REVIEW. |
| **Creación de customer** | Storefront `customerCreate` (email+password, ya existe en `lib/shopify.js`) + Admin API para tags y metafields `b2b.*` (`lib/shopify-admin.js`, extendido). |
| **Email** | **Mailgun** (`lib/b2b/email/`). No había proveedor transaccional; Mailchimp existente es solo newsletter. |
| **Validación externa** | VIES (SOAP, EU VAT) + Companies House (REST, UK). Fallos de servicio = señal neutra, nunca rechazo automático. |
| **Shopify Functions** | Diferidas a Fase 2 (App custom aparte). Fase 1 no aplica descuentos en checkout. |
| **Estilos** | SCSS Modules co-localizados, mobile-first con mixin `from()`, tokens existentes. CLAUDE.md compliant. |

---

## 3. Mapa de rutas

```
Páginas (app/(frontend)/b2b/)
/b2b                          → Landing "Mikmax for Business" (Figma 32:14795) + login
/b2b/register                 → Formulario de alta B2B (generado, estilo Figma)
/b2b/area                     → Área profesional protegida (tag b2b-approved)

API (app/api/b2b/)
/api/b2b/register             → POST: valida, puntúa, ramifica APPROVED/REVIEW/REJECTED
/api/b2b/admin/[action]       → POST: approve | reject | more_info desde Sanity Studio

Reutilizadas (sin tocar)
loginAction / recoverAction / resetAction   (app/(frontend)/login/actions.ts)
/api/auth/status                            (header toggle logged-in)
```

> **Naming:** la landing vive en `/b2b`. El item de menú "Mikmax for Business" enlaza a `/b2b`.

### Estructura de carpetas (nuevo)

```
app/(frontend)/b2b/
├── page.tsx                  (landing — server component)
├── B2bLandingClient.tsx      (bloque login interactivo, si aplica)
├── register/
│   ├── page.tsx              (server shell)
│   └── RegisterForm.tsx      (client — formulario)
└── area/
    ├── layout.tsx            (guard tag b2b-approved → redirect /b2b)
    └── page.tsx

app/api/b2b/
├── register/route.ts
└── admin/[action]/route.ts

lib/b2b/
├── validation/
│   ├── vies.ts               (SOAP VIES — EU VAT)
│   ├── companiesHouse.ts     (REST — UK)
│   ├── email.ts              (dominios genéricos)
│   ├── country.ts            (coherencia país ↔ prefijo VAT)
│   ├── vatPrefixes.ts        (mapa prefijo→país)
│   └── score.ts              (agregación + umbrales de decisión)
├── shopify.ts                (createB2BCustomer + tagging/metafields, sobre lib/shopify-admin.js)
├── application.ts            (CRUD de b2bApplication en Sanity)
└── email/
    ├── mailgun.ts            (cliente Mailgun)
    └── templates.ts          (approved / review / rejected / internal)

components/B2B/
├── RegisterForm/             (form + estados)
├── B2bHero/                  (hero landing)
├── B2bLogin/                 (bloque login de la landing)
└── ...                       (secciones de la landing según Figma)

sanity/schemas/documents/b2bApplication.ts   (NUEVO)
sanity/desk/                                  (vista custom + document actions)
```

---

## 4. Subsistema 1 — Backend de registro y validación

### 4.1. Campos del formulario (`/b2b/register`)

| Campo | Tipo | Notas |
|---|---|---|
| `clientType` | `'reseller' \| 'designer'` | Radio. Condiciona discount_group. |
| `country` | string (ISO-2) | Select. |
| `legalCompanyName` | string | Razón social. |
| `vatNumber` | string | NIF/VAT intracomunitario o company number UK. |
| `companyWebsite` | string (url) | Opcional pero puntúa. |
| `corporateEmail` | string (email) | Login del futuro customer. |
| `fiscalAddress` | string (multilinea) | Dirección fiscal. |
| `password` | string | **Nuevo respecto a la spec original.** Mín. 8 chars. Ver §6.3. |

Validación de forma en cliente (requeridos, formato email/url) y **revalidación en servidor** antes de puntuar.

### 4.2. Pipeline de validación (`lib/b2b/validation/`)

Cada validador es puro y testeable, devuelve una señal parcial. La API route los orquesta.

| Módulo | Entrada | Salida | Fallo de servicio |
|---|---|---|---|
| `vies.ts` | vatNumber | `{ valid: bool, name?, address?, available: bool }` | `available:false` → puntos VAT = 0, nota interna "VIES no disponible". **No** rechaza. |
| `companiesHouse.ts` | vatNumber (UK) | `{ valid: bool, name? }` | Igual: neutra + nota. Requiere `COMPANIES_HOUSE_API_KEY`. |
| `email.ts` | corporateEmail | `{ corporate: bool }` | n/a (local). Rechaza dominios genéricos: gmail, hotmail, yahoo, outlook, icloud (lista ampliable). |
| `country.ts` | country, vatNumber | `{ coherent: bool }` | n/a (local). Compara prefijo VAT (`vatPrefixes.ts`) con `country`. |

### 4.3. Scoring (`score.ts`)

| Señal | Puntos |
|---|---|
| VAT válido en **VIES** (EU) **o** match válido en **Companies House** (UK) | 40 |
| Email corporativo (no genérico) | 20 |
| Web de empresa presente | 15 |
| País coincide con prefijo del VAT | 15 |
| Tipo de cliente declarado | 10 |

**Umbrales:** `≥85 → APPROVED` · `≥50 → REVIEW` · `<50 → REJECTED`.

> **Resolución de hueco lógico (UK):** la spec original solo acreditaba "VIES válido (40)", lo que dejaba a toda empresa UK por debajo de 85 → siempre REVIEW. **Decisión: un match válido en Companies House también vale 40 puntos**, de modo que UK puede auto-aprobarse igual que EU. (Opción (a) confirmada con el usuario.)

> **VIES caído:** si VIES no responde, los 40 puntos no se otorgan, pero **no se rechaza**. Sin esos 40, el máximo alcanzable es 60 → la solicitud cae naturalmente en **REVIEW** con nota interna "VIES no disponible — verificar manualmente".

### 4.4. Ramificación de resultados (`/api/b2b/register`)

```
POST /api/b2b/register
  1. Revalida payload (zod o validación manual server-side).
  2. Ejecuta validadores (VIES + CompaniesHouse según país, email, country).
  3. score = score.ts(signals)
  4. switch:
     ├── APPROVED (≥85):
     │     a. Storefront customerCreate(email, password, firstName=companyName)
     │     b. Admin: añade tags ['b2b-approved', clientType]
     │              + metafields b2b.{client_type, validated:'true', discount_group}
     │     c. Sanity: crea b2bApplication { status:'approved', shopifyCustomerId, score }
     │     d. Mailgun: email de bienvenida + acceso
     │     → respuesta { status:'approved' } (front redirige a /b2b con login listo)
     │
     ├── REVIEW (≥50):
     │     a. Sanity: crea b2bApplication { status:'pending', score, internalNotes }
     │        (SIN guardar contraseña — ver §6.3)
     │     b. Mailgun: email al cliente "estamos revisando tu solicitud"
     │     c. Mailgun: email interno a INTERNAL_NOTIFICATION_EMAIL con todos los datos
     │     → respuesta { status:'review' }
     │
     └── REJECTED (<50):
           a. Sanity: crea b2bApplication { status:'rejected', score }
           b. Mailgun: email de rechazo pidiendo más información
           → respuesta { status:'rejected' }
```

**Manejo de errores:** cada llamada externa (VIES, Companies House, Shopify, Sanity, Mailgun) va con try/catch y timeout. Un fallo en creación de customer (APPROVED) hace fallback a REVIEW + nota interna, nunca pierde la solicitud. Toda solicitud **siempre** queda registrada en Sanity.

---

## 5. Subsistema 2 — Sanity `b2bApplication` + panel admin

### 5.1. Schema `b2bApplication` (document)

> Crear con la skill `sanity-schema-builder`. Añadir a `hiddenDocTypes` en `sanity/desk/index.ts`.

```ts
{
  name: 'b2bApplication',
  fields: [
    { name: 'applicantName',     type: 'string' },
    { name: 'companyName',       type: 'string' },
    { name: 'vatNumber',         type: 'string' },
    { name: 'country',           type: 'string' },
    { name: 'clientType',        type: 'string' },   // reseller | designer
    { name: 'corporateEmail',    type: 'string' },
    { name: 'companyWebsite',    type: 'url' },
    { name: 'fiscalAddress',     type: 'text' },
    { name: 'status',            type: 'string' },    // pending | approved | rejected | more_info
    { name: 'validationScore',   type: 'number' },
    { name: 'internalNotes',     type: 'text' },
    { name: 'shopifyCustomerId', type: 'string' },
    { name: 'createdAt',         type: 'datetime' },
    { name: 'updatedAt',         type: 'datetime' },
  ]
}
```

> **No** se almacena la contraseña en Sanity en ningún caso.

### 5.2. Panel admin (Sanity Studio)

- Vista custom en el desk que **lista las solicitudes `pending`** (orden por `createdAt` desc).
- **Document actions** custom: **Aprobar** / **Rechazar** / **Pedir info**.
- Cada acción llama a `POST /api/b2b/admin/[action]` con el `_id` de la aplicación.

### 5.3. `/api/b2b/admin/[action]`

Autenticado (solo desde Studio / con secreto interno). Acciones:

- **approve:** crea el Shopify customer (sin password → email de activación, ver §6.3) + tags + metafields `b2b.*`, set `status:'approved'`, guarda `shopifyCustomerId`, envía email de aprobación.
- **reject:** set `status:'rejected'`, envía email de rechazo.
- **more_info:** set `status:'more_info'`, envía email pidiendo datos adicionales.

Todas actualizan `updatedAt`.

---

## 6. Auth, login y creación de customer

### 6.1. Login B2B (reutiliza B2C)

La landing `/b2b` incluye el bloque de login del Figma. Usa el `loginAction` existente y la cookie `mikmax_customer_token`. Tras login correcto, si el customer tiene tag `b2b-approved`, el CTA lo lleva a `/b2b/area`.

### 6.2. Gating de `/b2b/area`

`app/(frontend)/b2b/area/layout.tsx` (server): `getCurrentCustomer()` → si no hay sesión **o** el customer no tiene tag `b2b-approved` → `redirect('/b2b')`. La lectura de tags requiere **Admin API** (los tags no se exponen por Storefront `getUser`), así que se añade `getCustomerTags(customerId)` en `lib/shopify-admin.js`, o se lee un metafield `b2b.validated` vía Storefront (más barato). **Decisión:** exponer `b2b.validated` y `b2b.client_type` como metafields legibles por Storefront (configurar visibilidad de metafield) y leerlos en `getUser` extendido; evita una llamada Admin por request.

### 6.3. Contraseña: APPROVED vs REVIEW (seguridad)

- **APPROVED (auto):** la contraseña llega en el mismo request. Se crea el customer **inmediatamente** con esa contraseña (Storefront `customerCreate`) → el usuario puede iniciar sesión al instante. La contraseña **no se persiste** en ningún sitio salvo Shopify.
- **REVIEW → aprobación manual posterior:** **no** se guarda la contraseña en texto plano en Sanity (riesgo de seguridad). Cuando el admin aprueba días después, se crea el customer **sin** contraseña y se dispara el flujo de **activación/recuperación existente** (`recoverAction` / reset) para que el cliente fije su contraseña vía email. El email de aprobación incluye ese enlace.
- **REJECTED:** no se crea customer; la contraseña se descarta.

### 6.4. Metafields y tags en Shopify

| Customer | Valor |
|---|---|
| tag | `b2b-approved` |
| tag | `reseller` \| `designer` |
| metafield `b2b.client_type` | `reseller` \| `designer` |
| metafield `b2b.validated` | `'true'` |
| metafield `b2b.discount_group` | `wholesale` (reseller) \| `designer` |

`discount_group` lo consumirá la Shopify Function en Fase 2.

---

## 7. Subsistema landing — "Mikmax for Business" (`/b2b`)

Maquetación del frame Figma `32:14795`, estilo editorial minimalista coherente con el B2C (blanco, botones negros, inputs limpios, tokens existentes). Secciones:

1. **Hero + bloque login** ("Create a business account": email, password, Sign in, Forgot password, "New to Mikmax? → /b2b/register").
2. **Consultoría** (textos + imagen — contenido estático; candidato a Sanity en Fase 3).
3. **Download catalog** (CTA a PDF/recurso).
4. **Newsletter** (reutiliza `NewsletterForm` existente).
5. **Footer** (existente).

> Imágenes con `LazyImage`, vídeos con `LazyVideo`. Mobile-first con `from()`. Maquetación vía skill `figma-maquetador` y ajuste con `pixel-perfect`.

Item de menú "Mikmax for Business" → `/b2b` (ya existe en el nav del Figma).

---

## 8. Variables de entorno

### Existentes (reutilizadas)
```
SHOPIFY_STORE_DOMAIN, SHOPIFY_STOREFRONT_ACCESSTOKEN, SHOPIFY_API_VERSION
SHOPIFY_ADMIN_CLIENT_ID / SHOPIFY_ADMIN_CLIENT_SECRET / SHOPIFY_ADMIN_DOMAIN  (o SHOPIFY_ADMIN_ACCESS_TOKEN)
NEXT_PUBLIC_SANITY_*  + token de escritura Sanity
NEXT_PUBLIC_SITE_URL
```

### Nuevas
```
COMPANIES_HOUSE_API_KEY          (REST UK)
MAILGUN_API_KEY                  (email transaccional B2B)
MAILGUN_DOMAIN                   (dominio verificado en Mailgun)
INTERNAL_NOTIFICATION_EMAIL      (destinatario de notificaciones internas REVIEW)
B2B_ADMIN_ACTION_SECRET          (autenticar /api/b2b/admin/[action] desde Studio)
```

> VIES no requiere API key (servicio SOAP público de la Comisión Europea).

---

## 9. TypeScript

| Tipo | Carpeta |
|---|---|
| `B2bApplication` (respuesta GROQ) | `sanity/types/` |
| `B2bRegisterInput`, `ValidationSignals`, `ScoreResult`, props de `RegisterForm`, etc. | `types/` |

---

## 10. Testing

Tests unitarios (mock de APIs externas):

- `vies.ts`: VAT válido / inválido / servicio caído.
- `companiesHouse.ts`: match / no match / sin API key.
- `email.ts`: dominios genéricos vs corporativos.
- `country.ts`: coherencia prefijo-país (varios prefijos).
- `score.ts`: los tres umbrales (APPROVED/REVIEW/REJECTED), caso UK (Companies House=40), caso VIES caído (cae en REVIEW).

Smoke manual del flujo completo en staging (alta auto-approve, alta review→aprobación en Studio, rechazo).

---

## 11. Plan de implementación (se partirá en 2 planes)

| Plan | Contenido |
|---|---|
| **Plan A — Backend** | Schema `b2bApplication` + desk/actions · `lib/b2b/validation/*` + tests · `score.ts` · `lib/b2b/shopify.ts` (createB2BCustomer + tags/metafields) · `lib/b2b/application.ts` · `lib/b2b/email/*` (Mailgun) · `/api/b2b/register` · `/api/b2b/admin/[action]` · extensión de `getUser` con metafields b2b. |
| **Plan B — Frontend** | Landing `/b2b` (maquetación Figma) · `RegisterForm` + `/b2b/register` · wiring login B2B · `/b2b/area` (mínima) + guard · item de menú. |

Plan A no depende de Figma; Plan B depende de Plan A para el wiring del form. Se pueden solapar.

---

## 12. Definition of Done (Fase 1)

### Funcional
- `/b2b` renderiza la landing maquetada y su login funciona (reutiliza auth B2C).
- `/b2b/register` envía el formulario y muestra estado APPROVED/REVIEW/REJECTED.
- Un alta con VAT válido (EU o UK) y email corporativo se **auto-aprueba**, crea el Shopify customer con tags+metafields y permite login inmediato.
- Un alta dudosa cae en **REVIEW**, se guarda en Sanity como `pending` y dispara email al cliente + interno.
- El panel de Sanity Studio lista pendientes y los botones Aprobar/Rechazar/Pedir info actualizan Shopify + envían el email correcto.
- Aprobar una solicitud REVIEW crea el customer y le envía enlace de activación de contraseña.
- `/b2b/area` solo es accesible para customers validados como B2B (guard por metafield `b2b.validated`; el tag `b2b-approved` queda para Functions/admin).
- VIES caído no rompe el alta: cae en REVIEW con nota interna.

### No-funcional
- `npm run typecheck`, `npm run lint`, `npm run build` limpios.
- Tests unitarios de validación/scoring en verde.
- Mobile (375px) y desktop (1440px) sin overflow.
- Cero `<img>`/`<video>` nativos; imágenes solo `cdn.sanity.io`/`cdn.shopify.com`.
- Cero secretos en cliente; Admin API y Mailgun solo server-side.
- Ninguna contraseña persistida fuera de Shopify.

---

## 13. Riesgos y mitigaciones

| Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|
| VIES intermitente / lento | Alta | Medio | Timeout + tratar caída como neutra → REVIEW. Nota interna. |
| Companies House requiere registro de API key | Media | Bajo | Pedir `COMPANIES_HOUSE_API_KEY` antes de Plan A; sin key, UK siempre REVIEW. |
| Dominio Mailgun sin verificar | Media | Alto | Verificar dominio antes del Plan A; placeholder env hasta entonces. Bloqueante para emails. |
| Tags no legibles por Storefront para el gating | Media | Medio | Usar metafield `b2b.validated` legible por Storefront en lugar de tag para el guard. |
| Contraseña en REVIEW (seguridad) | — | Alto | No persistir; activación por email al aprobar (§6.3). |
| Auto-aprobar empresa fraudulenta | Baja | Medio | Umbral 85 exige VAT verificado + email corporativo. Admin puede revocar (tag) post-hoc. |
| Sanity Connect / token de escritura mal scoped | Baja | Medio | Verificar token con permiso de escritura sobre `b2bApplication` antes del Plan A. |

---

## 14. Checklist pre-arranque (antes del Plan A)

```
□ MAILGUN_API_KEY + MAILGUN_DOMAIN (dominio verificado en Mailgun)
□ INTERNAL_NOTIFICATION_EMAIL (a quién llegan las notificaciones de REVIEW)
□ COMPANIES_HOUSE_API_KEY (registrar app en Companies House Developer Hub)
□ B2B_ADMIN_ACTION_SECRET (generar secreto aleatorio)
□ Confirmar token Sanity con escritura sobre b2bApplication
□ Confirmar scopes Admin API: write_customers, read_customers (tags + metafields de customer)
□ Confirmar definición de metafields de customer namespace "b2b" (client_type, validated, discount_group)
   con visibilidad Storefront para validated/client_type
□ Recurso "Download catalog" (PDF) para la landing
□ Bookmark Figma: landing 32:14795
```

---

## 15. Hitos siguientes (fuera de Fase 1)

1. **Fase 2** — Crear la Shopify App custom (Partner) + extensiones de Function: reseller 50% y designer escalado (tramos desde Sanity → metafield → input de la Function). Precio mayorista `b2b.wholesale_price` en catálogo B2C. Resolver fuente única de verdad de precio (display vs checkout).
2. **Fase 3** — Bloque incentivo de carrito (gap al siguiente tramo, designers) + área profesional rica (política comercial, exención de IVA, contacto asignado, contenido desde Sanity).
