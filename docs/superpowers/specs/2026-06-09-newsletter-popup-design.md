# Pop-up de Newsletter — Diseño

- **Fecha:** 2026-06-09
- **Figma:** desktop `node-id=20-8334` (Pop Up `20:8437`), mobile `node-id=20-7946`
- **Objetivo:** Pop-up modal de captación de newsletter (oferta "10% off"), editable desde Sanity, que reutiliza la integración Mailchimp existente y no se solapa con el banner de cookies.

---

## Decisiones acordadas (brainstorming)

1. **Disparo:** a los ~`delaySeconds` (default 10) de la primera visita, **1 vez por visitante** (cookie ~30 días), y **coordinado con el banner de cookies** (espera a que el consentimiento esté resuelto). No reaparece si se suscribió o lo cerró.
2. **Contenido editable en Sanity** (Settings): imagen, título/oferta, texto legal, retardo y un toggle activar/desactivar.
3. **Enlace legal → `/legal/privacy-policy`.**
4. **Hook compartido** `useNewsletterSubscribe` reutilizado por el formulario del footer y el pop-up (DRY).

---

## Estado actual del repo

- `components/Layout/Footer/NewsletterForm.tsx` ya suscribe vía `POST /api/subscribeUser` (Mailchimp), con estados `idle/submitting/success/error/already`. Esa lógica se extrae a un hook compartido.
- `app/api/subscribeUser/route.tsx` es el endpoint Mailchimp (se reutiliza sin cambios).
- `settings` (singleton) ya contiene objetos globales (`menu`, `footer`, `banner` = `announcementBanner`, …). El pop-up se añade como otro objeto (`newsletterPopup`), siguiendo el patrón de `announcementBanner`.
- `app/(frontend)/layout.tsx` ya hace `Promise.all([getFooter(), getBanner()])` y monta `<AnnouncementBanner>`, `<CookieConsent>`, etc. El pop-up se monta igual.
- `hooks/useConsent.tsx` emite el evento `mikmax:consentchange` y la cookie de consentimiento `${clientId}_localConsent_25` → se usan para coordinar la aparición.

---

## Arquitectura

### 1. Contenido — Sanity

**Nuevo objeto `sanity/schemas/objects/global/newsletterPopup.ts`** (patrón `announcementBanner`):
- `enabled` (boolean, initial false) — si off, no se renderiza.
- `image` (image, hotspot, campo `alt` requerido).
- `heading` (string, p. ej. "Subscribe for 10% off your next order").
- `legalText` (string, el texto "By subscribing, I agree…"). El componente añade el enlace **"privacy policy"** → `/legal/privacy-policy`.
- `delaySeconds` (number, initial 10, min 0).
- Validación: `image`/`heading` requeridos cuando `enabled` (patrón `Rule.custom` del banner).

**Registro:** añadir `newsletterPopup` a `sanity/schemas/index.ts` (objects) y un campo `newsletterPopup` (type `newsletterPopup`) al singleton `settings` (grupo `navigation` o uno propio).

**Query:** extender la proyección de `getSettings` (`sanity/queries/common/settings.ts`) para incluir `newsletterPopup{enabled, image{${image}, "alt": alt}, heading, legalText, delaySeconds}`; añadir `getNewsletterPopup()` en `sanity/queries/common/` que devuelve `settings.newsletterPopup` (espejo de `getBanner`). Tipo en `sanity/types/`.

### 2. Hook compartido — `hooks/useNewsletterSubscribe.ts`

Extrae la lógica de `NewsletterForm`:
```ts
type Status = 'idle' | 'submitting' | 'success' | 'error' | 'already'
// devuelve {status, subscribe(email)} ; subscribe hace el POST a /api/subscribeUser
// y mapea la respuesta a success/already/error (igual que hoy).
```
`NewsletterForm` se refactoriza para usar el hook (sin cambio de comportamiento). El pop-up lo usa también.

### 3. Componente — `components/Layout/NewsletterPopup/NewsletterPopup.tsx` (+ `.module.scss`)

- **Props:** los datos del pop-up (`enabled, image, heading, legalText, delaySeconds`).
- **Render (mobile-first):**
  - Móvil: tarjeta centrada apilada — **imagen arriba**, luego formulario.
  - Desktop (≥768px): tarjeta horizontal — **imagen izquierda | formulario derecha** (~738×362, mitades).
  - Backdrop oscuro (clic fuera = cerrar) + botón **"Close"** (esquina sup. der.).
  - Formulario: input "Enter your email" + botón **"Send"** (usa `useNewsletterSubscribe`); feedback éxito/ya-suscrito/error.
  - Texto legal (`legalText`) + enlace "privacy policy" → `/legal/privacy-policy`.
- **Aparición:**
  - Si `!enabled` → `null`.
  - Cookie propia `${clientId}_newsletter_25`; si existe → no mostrar.
  - Mostrar cuando: (a) transcurridos `delaySeconds`, **y** (b) el banner de cookies está resuelto (`hasCookie(${clientId}_localConsent_25)`), escuchando `mikmax:consentchange` para reaccionar cuando el usuario acepta/rechaza.
  - Al **cerrar** o **suscribirse con éxito** → set cookie propia (no reaparece).
- **Montaje:** en `app/(frontend)/layout.tsx`, fetch con `getNewsletterPopup()` (en el `Promise.all` existente) y `<NewsletterPopup data={...} />` dentro del `ShopProvider` (junto a `CookieConsent`).

### 4. Mejora de coherencia (en alcance)
Cambiar el enlace "Cookie Notice" de `CookieConsent` de `/privacy-policy` → `/legal/privacy-policy`.

### 5. Opcional (en alcance, simple)
Que `useNewsletterSubscribe`, al tener éxito, marque también la cookie del pop-up → suscribirse desde el footer suprime el pop-up. (Si complica, queda como follow-up.)

---

## Lista de archivos

**Nuevos**
- `sanity/schemas/objects/global/newsletterPopup.ts`
- `sanity/types/...` (tipo `NewsletterPopup`)
- `sanity/queries/common/newsletterPopup.ts` (`getNewsletterPopup`)
- `hooks/useNewsletterSubscribe.ts`
- `components/Layout/NewsletterPopup/NewsletterPopup.tsx` + `.module.scss`

**Modificados**
- `sanity/schemas/index.ts` (registrar `newsletterPopup`)
- `sanity/schemas/singletons/settings.ts` (campo `newsletterPopup`)
- `sanity/queries/common/settings.ts` (proyección)
- `hooks/...`/`NewsletterForm.tsx` (usar el hook compartido)
- `app/(frontend)/layout.tsx` (montar el pop-up)
- `components/Common/CookieConsent/CookieConsent.tsx` (enlace → `/legal/privacy-policy`)

**Reutilizados:** `app/api/subscribeUser`, cookie/evento de consentimiento.

---

## Supuestos a verificar en implementación

- Proyección exacta de `getSettings` (si proyecta campos uno a uno hay que añadir el bloque `newsletterPopup`).
- El slug de la página de privacidad legal es `privacy-policy` (ruta `/legal/privacy-policy`).
- Anchos/aspectos exactos de la tarjeta y la imagen → ajustar contra el Figma en la fase visual (`pixel-perfect`).

## Fuera de alcance

- Automatización del código 10% en Mailchimp (panel del cliente).
- Exit-intent, scroll-trigger, segmentación, A/B testing.
- Editar labels "Send"/"Enter your email" desde Sanity (van fijos).
