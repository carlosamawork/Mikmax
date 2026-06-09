# Pop-up de Newsletter — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pop-up modal de newsletter editable desde Sanity (oferta "10% off"), que aparece a los ~10s una vez por visitante (coordinado con el banner de cookies) y reutiliza la integración Mailchimp existente.

**Architecture:** Objeto `newsletterPopup` en el singleton `settings` (contenido editable) → proyectado en `getSettings`/`getNewsletterPopup`. Un hook compartido `useNewsletterSubscribe` (extraído de `NewsletterForm`) encapsula el POST a `/api/subscribeUser`. Un client component `NewsletterPopup` montado en el layout muestra el modal según cookie propia + cookie de consentimiento + retardo.

**Tech Stack:** Next.js 15 App Router (client components + context), Sanity CMS v3 (GROQ), SCSS modules, `cookies-next`, TypeScript estricto. **El repo NO tiene runner de tests**; verificación = `npm run typecheck` (+ `npm run lint`) y comprobación visual.

**Referencia:** spec `docs/superpowers/specs/2026-06-09-newsletter-popup-design.md`. Figma desktop `20-8334`, mobile `20-7946`.

**Commits:** español; commit por tarea (autorizado).

---

## Estructura de archivos

**Nuevos**
- `sanity/schemas/objects/global/newsletterPopup.ts`
- `sanity/types/objects/global/newsletterPopup.ts`
- `sanity/queries/common/newsletterPopup.ts`
- `hooks/useNewsletterSubscribe.ts`
- `components/Layout/NewsletterPopup/NewsletterPopup.tsx` + `.module.scss`

**Modificados**
- `sanity/schemas/index.ts` (registrar `newsletterPopup`)
- `sanity/schemas/singletons/settings.ts` (campo `newsletterPopup`)
- `sanity/types/objects/global/settings.ts` (`newsletterPopup?`)
- `sanity/queries/common/settings.ts` (proyección)
- `components/Layout/Footer/NewsletterForm.tsx` (usar el hook)
- `app/(frontend)/layout.tsx` (montar el pop-up)
- `components/Common/CookieConsent/CookieConsent.tsx` (enlace → `/legal/privacy-policy`)

---

## Task 1: Schema `newsletterPopup` + registro

**Files:**
- Create: `sanity/schemas/objects/global/newsletterPopup.ts`
- Modify: `sanity/schemas/index.ts`, `sanity/schemas/singletons/settings.ts`

- [ ] **Step 1: Crear `sanity/schemas/objects/global/newsletterPopup.ts`** (patrón `announcementBanner`)

```ts
import {EnvelopeIcon} from '@sanity/icons'
import {defineField} from 'sanity'

export default defineField({
  name: 'newsletterPopup',
  title: 'Pop-up newsletter',
  type: 'object',
  icon: EnvelopeIcon,
  description: 'Modal de captación de newsletter. Aparece una vez por visitante tras un retardo.',
  options: {collapsed: false, collapsible: true},
  fields: [
    defineField({
      name: 'enabled',
      title: 'Activado',
      type: 'boolean',
      initialValue: false,
      description: 'Si está desactivado, el pop-up no se muestra.',
    }),
    defineField({
      name: 'image',
      title: 'Imagen',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string'})],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const enabled = (context.parent as {enabled?: boolean})?.enabled
          if (enabled && !value) return 'Imagen requerida cuando el pop-up está activado.'
          return true
        }),
    }),
    defineField({
      name: 'heading',
      title: 'Título / oferta',
      type: 'string',
      description: 'P. ej. "Subscribe for 10% off your next order".',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const enabled = (context.parent as {enabled?: boolean})?.enabled
          if (enabled && !value) return 'Título requerido cuando el pop-up está activado.'
          return true
        }),
    }),
    defineField({
      name: 'legalText',
      title: 'Texto legal',
      type: 'string',
      description:
        'Texto bajo el formulario. El enlace "privacy policy" (a /legal/privacy-policy) se añade automáticamente al final.',
    }),
    defineField({
      name: 'delaySeconds',
      title: 'Retardo (segundos)',
      type: 'number',
      initialValue: 10,
      validation: (Rule) => Rule.min(0),
    }),
  ],
})
```

> Si `EnvelopeIcon` no existe en la versión de `@sanity/icons`, usar `BellIcon`. Verificar.

- [ ] **Step 2: Registrar el object en `sanity/schemas/index.ts`**

Añadir el import junto a los otros objects globales (cerca de `announcementBanner`):
```ts
import newsletterPopup from './objects/global/newsletterPopup'
```
Y añadir `newsletterPopup,` al array `objects`.

- [ ] **Step 3: Añadir el campo al singleton `sanity/schemas/singletons/settings.ts`**

Añadir un grupo y el campo. En `groups`, tras el grupo `banner`, añadir:
```ts
    {
      name: 'newsletterPopup',
      title: 'Pop-up newsletter',
    },
```
En `fields`, tras el campo `banner`, añadir:
```ts
    defineField({
      name: 'newsletterPopup',
      title: 'Pop-up newsletter',
      type: 'newsletterPopup',
      group: 'newsletterPopup',
    }),
```

- [ ] **Step 4: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add sanity/schemas/objects/global/newsletterPopup.ts sanity/schemas/index.ts sanity/schemas/singletons/settings.ts
git commit -m "feat(sanity): objeto newsletterPopup en settings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Tipos + query `getNewsletterPopup`

**Files:**
- Create: `sanity/types/objects/global/newsletterPopup.ts`, `sanity/queries/common/newsletterPopup.ts`
- Modify: `sanity/types/objects/global/settings.ts`, `sanity/queries/common/settings.ts`

- [ ] **Step 1: Crear el tipo `sanity/types/objects/global/newsletterPopup.ts`**

```ts
export type NewsletterPopup = {
  enabled?: boolean
  image?: {imageUrl?: string | null; alt?: string | null}
  heading?: string
  legalText?: string
  delaySeconds?: number
}
```

- [ ] **Step 2: Extender `SettingsData`** en `sanity/types/objects/global/settings.ts`

Añadir el import (junto a `import type {AnnouncementBanner} from './announcementBanner'`):
```ts
import type {NewsletterPopup} from './newsletterPopup'
```
Y añadir el campo dentro del type `SettingsData` (junto a `banner?: AnnouncementBanner`):
```ts
  newsletterPopup?: NewsletterPopup
```
Si `sanity/types` tiene un barrel (`index`) que re-exporta estos tipos, añadir también `export * from './objects/global/newsletterPopup'` donde corresponda (verificar que `NewsletterPopup` sea importable desde `@/sanity/types`).

- [ ] **Step 3: Proyectar en `getSettings`** (`sanity/queries/common/settings.ts`)

En la query GROQ literal, añadir el bloque `newsletterPopup` justo ANTES de `seo{ ${seo} }` (proyección inline para no usar fragmentos en este archivo, según su comentario):
```groq
      newsletterPopup{
        enabled,
        image{ "imageUrl": asset->url, "alt": alt },
        heading,
        legalText,
        delaySeconds
      },
```

- [ ] **Step 4: Crear `sanity/queries/common/newsletterPopup.ts`** (espejo de `banner.ts`)

```ts
// sanity/queries/common/newsletterPopup.ts
import type {NewsletterPopup} from '@/sanity/types'
import {getSettings} from './settings'

export async function getNewsletterPopup(): Promise<NewsletterPopup | undefined> {
  const settings = await getSettings()
  return settings.newsletterPopup
}
```

> Confirmar que `NewsletterPopup` se exporta desde `@/sanity/types` (paso 2). Si no, importar desde la ruta concreta.

- [ ] **Step 5: Verificar typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add sanity/types/objects/global/newsletterPopup.ts sanity/types/objects/global/settings.ts sanity/queries/common/settings.ts sanity/queries/common/newsletterPopup.ts
git commit -m "feat(queries): getNewsletterPopup + tipo + proyeccion en settings

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Hook `useNewsletterSubscribe` + refactor de `NewsletterForm`

**Files:**
- Create: `hooks/useNewsletterSubscribe.ts`
- Modify: `components/Layout/Footer/NewsletterForm.tsx`

- [ ] **Step 1: Crear `hooks/useNewsletterSubscribe.ts`**

```ts
'use client'

import {setCookie} from 'cookies-next'
import {useState} from 'react'

export type NewsletterStatus = 'idle' | 'submitting' | 'success' | 'error' | 'already'

export function useNewsletterSubscribe() {
  const [status, setStatus] = useState<NewsletterStatus>('idle')

  async function subscribe(email: string) {
    if (status === 'submitting') return
    setStatus('submitting')

    try {
      const res = await fetch('/api/subscribeUser', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email}),
      })
      const json = (await res.json()) as {error?: {title?: string}}

      if (res.ok) {
        setStatus('success')
        // Suscribirse (footer o pop-up) suprime el pop-up de newsletter.
        const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'site'
        setCookie(`${clientId}_newsletter_25`, '1', {maxAge: 60 * 60 * 24 * 30})
      } else if (
        typeof json.error === 'object' &&
        json.error !== null &&
        json.error.title?.toLowerCase().includes('member exists')
      ) {
        setStatus('already')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  return {status, subscribe}
}
```

- [ ] **Step 2: Refactor `components/Layout/Footer/NewsletterForm.tsx`** para usar el hook

Reemplazar el `type Status` local y la función `onSubmit` por el hook. El componente queda:

```tsx
// components/Layout/Footer/NewsletterForm.tsx
'use client'

import {FormEvent, useState} from 'react'
import {useNewsletterSubscribe} from '@/hooks/useNewsletterSubscribe'
import s from './NewsletterForm.module.scss'
import type {NewsletterFormProps} from '@/types/footer'

export default function NewsletterForm({
  title = 'Keep in touch',
  subtitle = 'Subscribe to our newsletter to get the latest updates on new releases, pre-orders, and exclusive content.',
  placeholder = 'Enter your email',
  buttonLabel = 'Subscribe',
}: NewsletterFormProps) {
  const [email, setEmail] = useState('')
  const {status, subscribe} = useNewsletterSubscribe()

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting' || status === 'success') return
    await subscribe(email)
  }

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.title}>{title}</p>
      <p className={s.subtitle}>{subtitle}</p>

      <label htmlFor="newsletter-email" className={s.srOnly}>
        Email
      </label>
      <div className={s.inputWrap}>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          className={s.input}
          disabled={status === 'submitting' || status === 'success'}
        />
        <button
          type="submit"
          className={s.button}
          disabled={status === 'submitting' || status === 'success' || !email}
        >
          {status === 'submitting' ? '…' : buttonLabel}
        </button>
      </div>

      {status === 'success' && <p className={s.feedback}>Thanks for subscribing.</p>}
      {status === 'already' && <p className={s.feedback}>You&apos;re already subscribed.</p>}
      {status === 'error' && <p className={s.feedbackError}>Something went wrong. Try again.</p>}
    </form>
  )
}
```

> Mismo comportamiento que antes; solo se externaliza la lógica de envío.

- [ ] **Step 3: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add hooks/useNewsletterSubscribe.ts components/Layout/Footer/NewsletterForm.tsx
git commit -m "refactor(newsletter): hook compartido useNewsletterSubscribe

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Componente `NewsletterPopup`

**Files:**
- Create: `components/Layout/NewsletterPopup/NewsletterPopup.tsx` + `.module.scss`

- [ ] **Step 1: Crear `components/Layout/NewsletterPopup/NewsletterPopup.module.scss`** (mobile-first)

```scss
@use '@/styles/common/variables' as *;

$nlFont: 'Helvetica Neue', Helvetica, Arial, sans-serif;

.overlay {
  position: fixed;
  inset: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: px(20);
  background: rgba(0, 0, 0, 0.4);
}

.card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: px(360);
  background: map-get($colors, 'white');
  overflow: hidden;

  @media (min-width: 768px) {
    flex-direction: row;
    max-width: px(738);
  }
}

.media {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: map-get($colors, 'gray');

  @media (min-width: 768px) {
    width: px(369);
    aspect-ratio: auto;
    align-self: stretch;
  }

  > :global(.wrapper),
  > div {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.body {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: px(15);
  padding: px(20) px(15);

  @media (min-width: 768px) {
    width: px(369);
    justify-content: center;
  }
}

.close {
  position: absolute;
  top: px(10);
  right: px(10);
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: $nlFont;
  font-size: px(11);
  color: map-get($colors, 'black');
}

.heading {
  margin: 0;
  font-family: $nlFont;
  font-size: px(13);
  line-height: px(20);
  color: map-get($colors, 'black');
}

.form {
  display: flex;
  border-bottom: 1px solid map-get($colors, 'black-border');
}

.input {
  flex: 1 1 0;
  min-width: 0;
  border: none;
  outline: none;
  padding: px(6) 0;
  font-family: $nlFont;
  font-size: px(11);
  color: map-get($colors, 'black');
  background: transparent;
}

.send {
  flex-shrink: 0;
  border: none;
  cursor: pointer;
  padding: px(6) px(16);
  background: map-get($colors, 'black-border');
  color: map-get($colors, 'white');
  font-family: $nlFont;
  font-size: px(11);
  letter-spacing: px(0.5);

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.feedback {
  margin: 0;
  font-family: $nlFont;
  font-size: px(11);
  color: map-get($colors, 'black');
}

.feedbackError {
  margin: 0;
  font-family: $nlFont;
  font-size: px(11);
  color: map-get($colors, 'red');
}

.legal {
  margin: 0;
  font-family: $nlFont;
  font-size: px(10);
  line-height: px(14);
  color: map-get($colors, 'gray-light');

  .legalLink {
    color: map-get($colors, 'gray-light');
    text-decoration: underline;
  }
}
```

- [ ] **Step 2: Crear `components/Layout/NewsletterPopup/NewsletterPopup.tsx`**

```tsx
'use client'

import {hasCookie, setCookie} from 'cookies-next'
import Link from 'next/link'
import {FormEvent, useEffect, useState} from 'react'
import {LazyImage} from '@/components/Common'
import {useNewsletterSubscribe} from '@/hooks/useNewsletterSubscribe'
import type {NewsletterPopup as NewsletterPopupData} from '@/sanity/types'
import s from './NewsletterPopup.module.scss'

export default function NewsletterPopup({data}: {data?: NewsletterPopupData}) {
  const [visible, setVisible] = useState(false)
  const [email, setEmail] = useState('')
  const {status, subscribe} = useNewsletterSubscribe()

  const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'site'
  const seenCookie = `${clientId}_newsletter_25`
  const consentCookie = `${clientId}_localConsent_25`
  const enabled = Boolean(data?.enabled)
  const delayMs = (data?.delaySeconds ?? 10) * 1000

  useEffect(() => {
    if (!enabled || hasCookie(seenCookie)) return

    let shown = false
    let delayDone = false

    const maybeShow = () => {
      if (shown) return
      // Solo cuando ha pasado el retardo Y el banner de cookies está resuelto.
      if (delayDone && hasCookie(consentCookie)) {
        shown = true
        setVisible(true)
      }
    }

    const timer = setTimeout(() => {
      delayDone = true
      maybeShow()
    }, delayMs)

    const onConsent = () => maybeShow()
    window.addEventListener('mikmax:consentchange', onConsent)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('mikmax:consentchange', onConsent)
    }
  }, [enabled, delayMs, seenCookie, consentCookie])

  function dismiss() {
    setVisible(false)
    setCookie(seenCookie, '1', {maxAge: 60 * 60 * 24 * 30})
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (status === 'submitting' || status === 'success') return
    // El hook marca la cookie del pop-up al tener éxito.
    void subscribe(email)
  }

  if (!enabled || !visible || !data) return null

  return (
    <div className={s.overlay} onClick={dismiss}>
      <div className={s.card} onClick={(e) => e.stopPropagation()}>
        {data.image?.imageUrl && (
          <div className={s.media}>
            <LazyImage
              src={data.image.imageUrl}
              alt={data.image.alt ?? ''}
              fill
              sizes="(min-width: 768px) 369px, 100vw"
              className={s.img}
            />
          </div>
        )}
        <div className={s.body}>
          <button type="button" className={s.close} onClick={dismiss}>
            Close
          </button>

          {data.heading && <p className={s.heading}>{data.heading}</p>}

          <form className={s.form} onSubmit={onSubmit} noValidate>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className={s.input}
              disabled={status === 'submitting' || status === 'success'}
            />
            <button
              type="submit"
              className={s.send}
              disabled={status === 'submitting' || status === 'success' || !email}
            >
              {status === 'submitting' ? '…' : 'Send'}
            </button>
          </form>

          {status === 'success' && <p className={s.feedback}>Thanks for subscribing.</p>}
          {status === 'already' && <p className={s.feedback}>You&apos;re already subscribed.</p>}
          {status === 'error' && <p className={s.feedbackError}>Something went wrong. Try again.</p>}

          {data.legalText && (
            <p className={s.legal}>
              {data.legalText}{' '}
              <Link href="/legal/privacy-policy" className={s.legalLink}>
                privacy policy
              </Link>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
```

> `LazyImage` con `fill` necesita un contenedor posicionado con tamaño: `.media` lo aporta. El patrón `.media > :global(.wrapper)` + `.img { object-fit: cover }` espeja `LookCard`.

- [ ] **Step 3: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add components/Layout/NewsletterPopup
git commit -m "feat(newsletter): componente NewsletterPopup (modal Mailchimp)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Montar en el layout + corregir enlace de CookieConsent

**Files:**
- Modify: `app/(frontend)/layout.tsx`, `components/Common/CookieConsent/CookieConsent.tsx`

- [ ] **Step 1: Montar el pop-up en `app/(frontend)/layout.tsx`**

1. Imports:
```tsx
import NewsletterPopup from '@/components/Layout/NewsletterPopup/NewsletterPopup'
import {getNewsletterPopup} from '@/sanity/queries/common/newsletterPopup'
```
2. En el `Promise.all` existente, añadir `getNewsletterPopup()`:
```tsx
  const [footerData, bannerData, newsletterPopupData] = await Promise.all([
    getFooter(),
    getBanner(),
    getNewsletterPopup(),
  ])
```
3. Dentro de `<ShopProvider>`, junto a `<CookieConsent />`, montar:
```tsx
            <NewsletterPopup data={newsletterPopupData} />
```

> El pop-up es client component y decide por sí mismo si mostrarse (cookie/consent/retardo); montarlo siempre es correcto. No va dentro de `ConsentGate` (no es un pixel; es funcional/transaccional).

- [ ] **Step 2: Corregir el enlace de `CookieConsent`** (`components/Common/CookieConsent/CookieConsent.tsx`)

Cambiar el `href` del enlace "Cookie Notice" de `/privacy-policy` a `/legal/privacy-policy`:
```tsx
              <Link href="/legal/privacy-policy" className={s.link}>
                Cookie Notice
              </Link>
```

- [ ] **Step 3: Verificar typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: ambos PASS.

- [ ] **Step 4: Commit**

```bash
git add "app/(frontend)/layout.tsx" components/Common/CookieConsent/CookieConsent.tsx
git commit -m "feat(newsletter): montar pop-up en el layout; enlace legal a /legal/privacy-policy

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Verificación final y comprobación visual

**Files:** (ninguno de código)

- [ ] **Step 1: Lint + typecheck + build**

Run:
```bash
npm run typecheck && npm run lint && npm run build
```
Expected: los tres PASS. (Si el build falla por permisos en `.next` —artefactos root de builds previas—, `sudo rm -rf .next` y reintentar; no es fallo de código.)

- [ ] **Step 2: Crear el contenido en el Studio**

`npm run dev` → `/admin` → Settings → **Pop-up newsletter**: activar, subir imagen (+ alt), poner título (p. ej. "Subscribe for 10% off your next order"), texto legal y retardo. Publish.

- [ ] **Step 3: Comprobación visual** (`localhost:3000`)

1. Con la cookie de consentimiento ya aceptada y sin la cookie `*_newsletter_25` (borrar cookies si hace falta): el pop-up aparece a los ~10s.
2. Verificar contra el Figma: desktop = imagen izquierda | formulario derecha; móvil = imagen arriba | formulario abajo; botón "Close", input + "Send", texto legal + enlace "privacy policy" → `/legal/privacy-policy`.
3. **Coordinación:** si el banner de cookies sigue abierto, el pop-up NO aparece hasta aceptarlo/rechazarlo.
4. Suscribirse → mensaje de éxito y, al recargar, NO reaparece (cookie). Cerrar (Close o clic fuera) → tampoco reaparece.
5. Suscribirse desde el formulario del footer también suprime el pop-up (misma cookie).
6. Con el toggle desactivado en Sanity → no aparece nunca.

- [ ] **Step 4: Commit (si hubo ajustes visuales)**

```bash
git add -A
git commit -m "fix(newsletter): ajustes visuales del pop-up

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notas de cierre

- **Decisiones del spec:** disparo ~10s/1 vez por visitante coordinado con el banner de cookies; contenido en Sanity; enlace `/legal/privacy-policy`; hook compartido; la oferta 10% la entrega Mailchimp (fuera del front).
- **Reutiliza:** `/api/subscribeUser`, la cookie/evento de consentimiento (`mikmax:consentchange`), `LazyImage`.
- **Skill útil:** `pixel-perfect` para afinar la tarjeta/imagen contra el Figma en el Task 6.
