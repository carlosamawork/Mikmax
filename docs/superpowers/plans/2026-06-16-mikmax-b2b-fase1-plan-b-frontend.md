# B2B Fase 1 — Plan B (Frontend: landing, registro, login, área) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir la cara visible del B2B Fase 1: la landing `/b2b` ("Mikmax for Business" del Figma `32:14795`), el formulario de alta `/b2b/register` (que consume `/api/b2b/register` del Plan A), el login B2B reutilizando el auth B2C, y el área profesional mínima protegida `/b2b/area`.

**Architecture:** Server Components para shells de página y guards; Client Components solo para los formularios interactivos. Se reutiliza al máximo el sistema de auth existente (`loginAction`, cookie `mikmax_customer_token`, `getCurrentCustomer`) y los patrones de `components/Account/` (AuthField, authForm.module.scss). El gating de `/b2b/area` lee el metafield `b2b.validated` que el Plan A expuso en `getUser`.

**Tech Stack:** Next.js 15 (App Router) · TypeScript · SCSS Modules (mobile-first, mixin `from()`) · LazyImage/LazyVideo · Skills `figma-maquetador` + `pixel-perfect` para la landing.

**Depende de:** Plan A (tipos `types/b2b.ts`, route `/api/b2b/register`, `getUser` extendido). Ejecutar Plan A antes o en paralelo; Task 2 de este plan necesita la route operativa para el smoke.

**Spec:** `docs/superpowers/specs/2026-06-16-mikmax-b2b-fase1-registro-design.md` · **Figma:** frame `32:14795`.

---

## File structure (lo que crea/modifica este plan)

```
Crear:
  app/(frontend)/b2b/page.tsx                      Landing "Mikmax for Business" (server)
  app/(frontend)/b2b/B2b.module.scss               Estilos de la landing
  app/(frontend)/b2b/register/page.tsx             Shell del registro (server)
  app/(frontend)/b2b/area/layout.tsx               Guard por metafield b2b.validated
  app/(frontend)/b2b/area/page.tsx                 Área profesional mínima
  app/(frontend)/b2b/area/Area.module.scss
  components/B2B/B2bRegisterForm/B2bRegisterForm.tsx        Formulario de alta (client)
  components/B2B/B2bRegisterForm/B2bRegisterForm.module.scss
  components/B2B/B2bLogin/B2bLogin.tsx              Bloque login de la landing (client)
  components/B2B/B2bLogin/B2bLogin.module.scss
  components/B2B/B2bHero/B2bHero.tsx               Hero de la landing (server)
  components/B2B/index.ts                           Barrel
  lib/b2b/isB2bApproved.ts                          Helper de gating

Modificar:
  types/account.ts                                 Customer: añadir b2bValidated / b2bClientType
  (Sanity) singleton settings/menu                  Item de menú "Mikmax for Business" → /b2b
```

---

## Task 1: Extender el tipo `Customer` + helper de gating

**Files:**
- Modify: `types/account.ts`
- Create: `lib/b2b/isB2bApproved.ts`

- [ ] **Step 1: Añadir los metafields B2B al tipo `Customer`**

En `types/account.ts`, dentro del type `Customer`, junto a `metafield`, añadir:
```ts
b2bValidated?: {value: string} | null
b2bClientType?: {value: string} | null
```

> Estos campos los rellena la query `getUser` extendida en el Plan A (Task 14) con los alias `b2bValidated` / `b2bClientType`.

- [ ] **Step 2: Crear `lib/b2b/isB2bApproved.ts`**

```ts
import type {Customer} from '@/types/account'

// True si el customer está validado como B2B (metafield b2b.validated === 'true').
export function isB2bApproved(customer: Customer | null | undefined): boolean {
  return customer?.b2bValidated?.value === 'true'
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add types/account.ts lib/b2b/isB2bApproved.ts
git commit -m "feat(b2b): customer b2b metafields type + isB2bApproved helper"
```

---

## Task 2: Formulario de alta `B2bRegisterForm`

**Files:**
- Create: `components/B2B/B2bRegisterForm/B2bRegisterForm.tsx`
- Create: `components/B2B/B2bRegisterForm/B2bRegisterForm.module.scss`

- [ ] **Step 1: Crear `components/B2B/B2bRegisterForm/B2bRegisterForm.tsx`**

```tsx
'use client'

import {FormEvent, useState} from 'react'
import Link from 'next/link'
import type {B2bClientType, B2bRegisterInput} from '@/types/b2b'
import s from './B2bRegisterForm.module.scss'

// Países soportados en Fase 1 (EU + UK). Ampliable.
const COUNTRIES: {code: string; name: string}[] = [
  {code: 'ES', name: 'España'},
  {code: 'FR', name: 'France'},
  {code: 'IT', name: 'Italia'},
  {code: 'DE', name: 'Deutschland'},
  {code: 'PT', name: 'Portugal'},
  {code: 'NL', name: 'Netherlands'},
  {code: 'BE', name: 'Belgique'},
  {code: 'IE', name: 'Ireland'},
  {code: 'GB', name: 'United Kingdom'},
]

type ResultStatus = 'approved' | 'review' | 'rejected'

const RESULT_COPY: Record<ResultStatus, {title: string; body: string}> = {
  approved: {
    title: 'Welcome to Mikmax for Business',
    body: 'Tu cuenta ha sido aprobada. Ya puedes iniciar sesión con tu email y contraseña.',
  },
  review: {
    title: 'Estamos revisando tu solicitud',
    body: 'Hemos recibido tus datos. Te escribiremos en cuanto validemos tu empresa.',
  },
  rejected: {
    title: 'Necesitamos más información',
    body: 'No hemos podido validar tu solicitud automáticamente. Revisa tu email para continuar.',
  },
}

const EMPTY: B2bRegisterInput = {
  clientType: 'reseller',
  country: 'ES',
  legalCompanyName: '',
  vatNumber: '',
  companyWebsite: '',
  corporateEmail: '',
  fiscalAddress: '',
  password: '',
}

export default function B2bRegisterForm() {
  const [form, setForm] = useState<B2bRegisterInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ResultStatus | null>(null)

  function set<K extends keyof B2bRegisterInput>(key: K, value: B2bRegisterInput[K]) {
    setForm((f) => ({...f, [key]: value}))
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/b2b/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError('No hemos podido procesar la solicitud. Revisa los datos e inténtalo de nuevo.')
        setLoading(false)
        return
      }
      setResult(data.status as ResultStatus)
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  if (result) {
    const copy = RESULT_COPY[result]
    return (
      <div className={s.result} role="status">
        <p className={s.resultTitle}>{copy.title}</p>
        <p className={s.resultBody}>{copy.body}</p>
        {result === 'approved' && (
          <Link href="/b2b" className={s.resultLink}>
            Ir a iniciar sesión
          </Link>
        )}
      </div>
    )
  }

  return (
    <form className={s.form} onSubmit={onSubmit} noValidate>
      <p className={s.heading}>Create a business account</p>

      <fieldset className={s.clientType}>
        <legend className={s.srOnly}>Tipo de cliente</legend>
        {(['reseller', 'designer'] as B2bClientType[]).map((t) => (
          <label key={t} className={s.radio}>
            <input
              type="radio"
              name="clientType"
              value={t}
              checked={form.clientType === t}
              onChange={() => set('clientType', t)}
            />
            {t === 'reseller' ? 'Reseller' : 'Interior Designer'}
          </label>
        ))}
      </fieldset>

      <div className={s.fields}>
        <select
          className={s.select}
          value={form.country}
          onChange={(e) => set('country', e.target.value)}
          aria-label="País"
          required
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          className={s.input}
          placeholder="Legal company name"
          value={form.legalCompanyName}
          onChange={(e) => set('legalCompanyName', e.target.value)}
          autoComplete="organization"
          required
        />
        <input
          className={s.input}
          placeholder="VAT number"
          value={form.vatNumber}
          onChange={(e) => set('vatNumber', e.target.value)}
          required
        />
        <input
          className={s.input}
          type="url"
          placeholder="Company website"
          value={form.companyWebsite}
          onChange={(e) => set('companyWebsite', e.target.value)}
          autoComplete="url"
        />
        <input
          className={s.input}
          type="email"
          placeholder="Corporate email"
          value={form.corporateEmail}
          onChange={(e) => set('corporateEmail', e.target.value)}
          autoComplete="email"
          required
        />
        <textarea
          className={s.textarea}
          placeholder="Fiscal address"
          value={form.fiscalAddress}
          onChange={(e) => set('fiscalAddress', e.target.value)}
          rows={3}
          required
        />
        <input
          className={s.input}
          type="password"
          placeholder="Password (min. 8 characters)"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>

      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={s.submit} disabled={loading}>
        {loading ? '…' : 'Create account'}
      </button>

      <p className={s.altBottom}>
        Already have a business account?{' '}
        <Link href="/b2b" className={s.altLink}>
          Sign in
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Crear `components/B2B/B2bRegisterForm/B2bRegisterForm.module.scss`**

Reutiliza tokens del proyecto y el patrón de `components/Account/authForm.module.scss`.

```scss
@use '@/styles/common/variables' as *;
@use '@/styles/mixins/mixins' as *;

.form {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;

  @include from(sm) {
    max-width: px(360);
  }
}

.heading {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: px(13);
  line-height: px(20);
  color: map-get($colors, 'primary-text');
  text-align: center;
}

.clientType {
  display: flex;
  gap: px(16);
  justify-content: center;
  width: 100%;
  margin-top: px(20);
  border: none;
  padding: 0;
}

.radio {
  display: flex;
  align-items: center;
  gap: px(6);
  font-family: $MonumentGrotesk;
  font-size: px(12);
}

.fields {
  display: flex;
  flex-direction: column;
  gap: px(8);
  width: 100%;
  margin-top: px(20);
}

.input,
.select,
.textarea {
  width: 100%;
  height: px(36);
  padding: 0 px(12);
  border: px(1) solid map-get($colors, 'black-border');
  background: map-get($colors, 'white');
  font-family: $MonumentGrotesk;
  font-size: px(12);
  color: map-get($colors, 'primary-text');
}

.textarea {
  height: auto;
  padding: px(10) px(12);
  resize: vertical;
}

.submit {
  width: 100%;
  height: px(36);
  margin-top: px(16);
  border: none;
  background: map-get($colors, 'black-border');
  color: map-get($colors, 'white');
  font-family: $MonumentGrotesk;
  font-size: px(11);
  letter-spacing: px(0.5);
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
}

.error {
  width: 100%;
  margin-top: px(8);
  font-family: $MonumentGrotesk;
  font-size: px(11);
  color: map-get($colors, 'red');
  text-align: center;
}

.altBottom {
  margin-top: px(20);
  font-family: $MonumentGrotesk;
  font-size: px(11);
  text-align: center;
}

.altLink {
  text-decoration: underline;
}

.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: px(12);
  text-align: center;

  @include from(sm) {
    max-width: px(360);
  }
}

.resultTitle {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: px(15);
}

.resultBody {
  font-family: $MonumentGrotesk;
  font-size: px(12);
  line-height: px(18);
}

.resultLink {
  margin-top: px(8);
  text-decoration: underline;
  font-family: $MonumentGrotesk;
  font-size: px(12);
}

.srOnly {
  position: absolute;
  width: px(1);
  height: px(1);
  overflow: hidden;
  clip: rect(0 0 0 0);
}
```

> Verificar que `$MonumentGrotesk`, `$colors` con claves `primary-text`/`black-border`/`white`/`red`, y el mixin `from()` existen en `styles/common/variables` y `styles/mixins/mixins` (lo usan los componentes de auth). Si una clave de color no existe, sustituir por la equivalente real del mapa `$colors`.

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/B2B/B2bRegisterForm
git commit -m "feat(b2b): B2bRegisterForm component"
```

---

## Task 3: Página `/b2b/register`

**Files:**
- Create: `app/(frontend)/b2b/register/page.tsx`

- [ ] **Step 1: Crear `app/(frontend)/b2b/register/page.tsx`**

Reutiliza `AuthLayout` (2 columnas form+imagen) como las pantallas de auth B2C.

```tsx
import type {Metadata} from 'next'
import AuthLayout from '@/components/Account/AuthLayout/AuthLayout'
import B2bRegisterForm from '@/components/B2B/B2bRegisterForm/B2bRegisterForm'

export const metadata: Metadata = {
  title: 'Create a business account',
  robots: {index: false, follow: false},
}

export default function B2bRegisterPage() {
  return (
    <AuthLayout>
      <B2bRegisterForm />
    </AuthLayout>
  )
}
```

- [ ] **Step 2: Verificar build de la ruta**

Run: `npm run build`
Expected: compila; aparece `/b2b/register`.

- [ ] **Step 3: Commit**

```bash
git add app/(frontend)/b2b/register/page.tsx
git commit -m "feat(b2b): /b2b/register page"
```

---

## Task 4: Bloque de login de la landing `B2bLogin`

**Files:**
- Create: `components/B2B/B2bLogin/B2bLogin.tsx`
- Create: `components/B2B/B2bLogin/B2bLogin.module.scss`

- [ ] **Step 1: Crear `components/B2B/B2bLogin/B2bLogin.tsx`**

Reutiliza el `loginAction` y el `AuthField` existentes. Tras login correcto, lleva a `/b2b/area` (el guard redirige a `/b2b` si no es B2B).

```tsx
'use client'

import {FormEvent, useState} from 'react'
import Link from 'next/link'
import {useRouter} from 'next/navigation'
import AuthField from '@/components/Account/AuthField/AuthField'
import {loginAction} from '@/app/(frontend)/login/actions'
import s from './B2bLogin.module.scss'

export default function B2bLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    const res = await loginAction({email, password})
    if (!res.ok) {
      setLoading(false)
      setError(res.error)
      return
    }
    router.push('/b2b/area')
    router.refresh()
  }

  return (
    <form className={s.login} onSubmit={onSubmit} noValidate>
      <p className={s.heading}>Create a business account</p>
      <div className={s.fields}>
        <AuthField
          name="b2b-email"
          type="email"
          placeholder="Email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          required
        />
        <AuthField
          name="b2b-password"
          type="password"
          placeholder="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={s.submit} disabled={loading}>
        {loading ? '…' : 'Sign in'}
      </button>
      <Link href="/login/forgot" className={s.forgot}>
        Forgot password?
      </Link>
      <p className={s.alt}>
        New to Mikmax?{' '}
        <Link href="/b2b/register" className={s.altLink}>
          Sign up here
        </Link>
      </p>
    </form>
  )
}
```

- [ ] **Step 2: Crear `components/B2B/B2bLogin/B2bLogin.module.scss`**

```scss
@use '@/styles/common/variables' as *;
@use '@/styles/mixins/mixins' as *;

.login {
  display: flex;
  flex-direction: column;
  width: 100%;

  @include from(sm) {
    max-width: px(320);
  }
}

.heading {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: px(13);
  line-height: px(20);
}

.fields {
  display: flex;
  flex-direction: column;
  gap: px(8);
  margin-top: px(16);
}

.submit {
  width: 100%;
  height: px(36);
  margin-top: px(12);
  border: none;
  background: map-get($colors, 'black-border');
  color: map-get($colors, 'white');
  font-family: $MonumentGrotesk;
  font-size: px(11);
  letter-spacing: px(0.5);
  cursor: pointer;

  &:disabled {
    opacity: 0.6;
  }
}

.error {
  margin-top: px(8);
  font-family: $MonumentGrotesk;
  font-size: px(11);
  color: map-get($colors, 'red');
}

.forgot,
.alt {
  margin-top: px(12);
  font-family: $MonumentGrotesk;
  font-size: px(11);
}

.altLink {
  text-decoration: underline;
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add components/B2B/B2bLogin
git commit -m "feat(b2b): B2bLogin block (reuses loginAction)"
```

---

## Task 5: Landing `/b2b` ("Mikmax for Business")

> Maquetación del frame Figma `32:14795`. **Usar la skill `figma-maquetador`** para extraer estructura/medidas reales del frame y la skill `pixel-perfect` para el ajuste fino. Las medidas/colores exactos se vuelcan al `.module.scss` durante la implementación (no se pueden hardcodear aquí sin el dato del Figma). El esqueleto de secciones y composición sí queda fijado abajo.

**Files:**
- Create: `components/B2B/B2bHero/B2bHero.tsx`
- Create: `components/B2B/index.ts`
- Create: `app/(frontend)/b2b/page.tsx`
- Create: `app/(frontend)/b2b/B2b.module.scss`

**Anatomía del frame `32:14795` (confirmada por screenshot):**
1. Bloque "Create a business account" = **login** (`B2bLogin`) + imagen a la derecha.
2. Sección de **consultoría** (texto + imagen). Contenido estático en Fase 1.
3. **Download catalog** (CTA a recurso/PDF).
4. **Newsletter** "Keep in touch" → reutiliza el `NewsletterForm` existente.
5. **Footer** → ya lo pinta el layout `(frontend)`.

- [ ] **Step 1: Crear `components/B2B/B2bHero/B2bHero.tsx`**

Server component: layout 2 columnas (login + imagen). La imagen se sirve con `LazyImage`.

```tsx
import {LazyImage} from '@/components/Common'
import B2bLogin from '@/components/B2B/B2bLogin/B2bLogin'
import s from '@/app/(frontend)/b2b/B2b.module.scss'

export default function B2bHero({imageSrc, imageAlt}: {imageSrc: string; imageAlt: string}) {
  return (
    <section className={s.hero}>
      <div className={s.heroLogin}>
        <B2bLogin />
      </div>
      <div className={s.heroImage}>
        <LazyImage src={imageSrc} alt={imageAlt} fill sizes="(min-width: 768px) 50vw, 100vw" />
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Crear `components/B2B/index.ts` (barrel)**

```ts
export {default as B2bHero} from './B2bHero/B2bHero'
export {default as B2bLogin} from './B2bLogin/B2bLogin'
export {default as B2bRegisterForm} from './B2bRegisterForm/B2bRegisterForm'
```

- [ ] **Step 3: Crear `app/(frontend)/b2b/page.tsx`**

```tsx
import type {Metadata} from 'next'
import {LazyImage} from '@/components/Common'
import NewsletterForm from '@/components/Layout/NewsletterForm/NewsletterForm'
import {B2bHero} from '@/components/B2B'
import s from './B2b.module.scss'

export const metadata: Metadata = {
  title: 'Mikmax for Business',
  description: 'Cuenta profesional Mikmax: textil de hostelería para revendedores e interioristas.',
}

// Imágenes y textos de la landing: estáticos en Fase 1 (candidatos a Sanity en Fase 3).
const HERO_IMAGE = '/images/b2b/hero.jpg'
const CONSULTANCY_IMAGE = '/images/b2b/consultancy.jpg'

export default function B2bLandingPage() {
  return (
    <main className={s.page}>
      <B2bHero imageSrc={HERO_IMAGE} imageAlt="Mikmax for Business" />

      <section className={s.consultancy}>
        <div className={s.consultancyImage}>
          <LazyImage
            src={CONSULTANCY_IMAGE}
            alt="Hospitality textile consultancy"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
          />
        </div>
        <div className={s.consultancyText}>
          <p>
            We provide consultancy on care and maintenance for hospitality textiles. This includes
            selecting the right laundry processes, detergents and drying methods to preserve fiber
            integrity and extend product lifespan.
          </p>
        </div>
      </section>

      <section className={s.catalog}>
        <a className={s.catalogCta} href="/catalogs/mikmax-business.pdf" download>
          Download catalog
        </a>
      </section>

      <section className={s.newsletter}>
        <NewsletterForm />
      </section>
    </main>
  )
}
```

> Confirmar la ruta de import real de `NewsletterForm` (en el spec MVP está en `components/Layout/`). Ajustar si difiere. Colocar `hero.jpg`/`consultancy.jpg` en `public/images/b2b/` (exportadas del Figma vía `figma-maquetador`) y el PDF en `public/catalogs/`.

- [ ] **Step 4: Crear `app/(frontend)/b2b/B2b.module.scss`**

Esqueleto mobile-first; **completar medidas/colores reales desde el Figma** con `figma-maquetador`/`pixel-perfect`.

```scss
@use '@/styles/common/variables' as *;
@use '@/styles/mixins/mixins' as *;

.page {
  width: 100%;
}

.hero {
  display: flex;
  flex-direction: column;

  @include from(sm) {
    flex-direction: row;
  }
}

.heroLogin {
  padding: px(24);

  @include from(sm) {
    flex: 1;
    padding: px(48);
  }
}

.heroImage {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;

  @include from(sm) {
    flex: 1;
    aspect-ratio: auto;
  }
}

.consultancy {
  display: flex;
  flex-direction: column;

  @include from(sm) {
    flex-direction: row;
  }
}

.consultancyImage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;

  @include from(sm) {
    flex: 1;
  }
}

.consultancyText {
  padding: px(24);
  font-family: $MonumentGrotesk;
  font-size: px(12);
  line-height: px(18);

  @include from(sm) {
    flex: 1;
    padding: px(48);
  }
}

.catalog {
  display: flex;
  justify-content: center;
  padding: px(32) px(24);
}

.catalogCta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: px(36);
  padding: 0 px(24);
  background: map-get($colors, 'black-border');
  color: map-get($colors, 'white');
  font-family: $MonumentGrotesk;
  font-size: px(11);
  letter-spacing: px(0.5);
}

.newsletter {
  padding: px(32) px(24);
}
```

- [ ] **Step 5: Verificar typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: sin errores; aparece `/b2b`.

- [ ] **Step 6: Ajuste pixel-perfect**

Abrir el Figma `32:14795` con `figma-maquetador`, volcar tipografías/espaciados/colores reales al `.module.scss`, exportar las imágenes a `public/images/b2b/`, y afinar con `pixel-perfect`. Verificar mobile (375px) y desktop (1440px) sin overflow.

- [ ] **Step 7: Commit**

```bash
git add app/(frontend)/b2b/page.tsx app/(frontend)/b2b/B2b.module.scss components/B2B
git commit -m "feat(b2b): Mikmax for Business landing page"
```

---

## Task 6: Área profesional protegida `/b2b/area`

**Files:**
- Create: `app/(frontend)/b2b/area/layout.tsx`
- Create: `app/(frontend)/b2b/area/page.tsx`
- Create: `app/(frontend)/b2b/area/Area.module.scss`

- [ ] **Step 1: Crear `app/(frontend)/b2b/area/layout.tsx` (guard)**

```tsx
import type {ReactNode} from 'react'
import {redirect} from 'next/navigation'
import {getCurrentCustomer} from '@/lib/auth/customer'
import {isB2bApproved} from '@/lib/b2b/isB2bApproved'

export default async function B2bAreaLayout({children}: {children: ReactNode}) {
  const session = await getCurrentCustomer()
  if (!session) redirect('/b2b')
  if (!isB2bApproved(session.customer)) redirect('/b2b')
  return <>{children}</>
}
```

- [ ] **Step 2: Crear `app/(frontend)/b2b/area/page.tsx` (mínima)**

```tsx
import {getCurrentCustomer} from '@/lib/auth/customer'
import s from './Area.module.scss'

// Área profesional mínima (Fase 1). Versión rica (política comercial, exención IVA,
// contacto asignado desde Sanity) → Fase 3.
export default async function B2bAreaPage() {
  const session = await getCurrentCustomer()
  const clientType = session?.customer.b2bClientType?.value
  const condition = clientType === 'designer' ? 'Interior Designer' : 'Reseller'

  return (
    <main className={s.area}>
      <h1 className={s.title}>Mikmax for Business</h1>
      <dl className={s.meta}>
        <div className={s.row}>
          <dt>Condición</dt>
          <dd>{condition}</dd>
        </div>
        <div className={s.row}>
          <dt>Contacto comercial</dt>
          <dd>business@mikmax.com</dd>
        </div>
      </dl>
      <p className={s.note}>
        Tus condiciones comerciales se aplican automáticamente en el carrito y el checkout.
      </p>
    </main>
  )
}
```

- [ ] **Step 3: Crear `app/(frontend)/b2b/area/Area.module.scss`**

```scss
@use '@/styles/common/variables' as *;
@use '@/styles/mixins/mixins' as *;

.area {
  max-width: px(720);
  margin: 0 auto;
  padding: px(48) px(24);
}

.title {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: px(20);
  margin-bottom: px(24);
}

.meta {
  display: flex;
  flex-direction: column;
  gap: px(12);
}

.row {
  display: flex;
  justify-content: space-between;
  border-bottom: px(1) solid map-get($colors, 'black-border');
  padding-bottom: px(8);
  font-family: $MonumentGrotesk;
  font-size: px(12);
}

.note {
  margin-top: px(24);
  font-family: $MonumentGrotesk;
  font-size: px(11);
  line-height: px(16);
}
```

- [ ] **Step 4: Verificar typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: sin errores; aparece `/b2b/area`.

- [ ] **Step 5: Commit**

```bash
git add app/(frontend)/b2b/area
git commit -m "feat(b2b): protected professional area (minimal)"
```

---

## Task 7: Item de menú "Mikmax for Business" → `/b2b`

**Files:**
- Modify: contenido de Sanity (singleton `settings` → menú) — no es cambio de código si el menú es data-driven.

> **RESUELTO (2026-06-16):** El nav ES data-driven desde Sanity. El header se construye a partir de `settings.menu.links[]` en `sanity/queries/common/settings.ts` (array de `lnInternal`/`lnExternal`/`MenuGroup`/`MenuShop`). NO hay array hardcodeado en ningún componente. Por tanto Task 7 es una **acción de contenido**, no de código.
>
> **Acción para el usuario (en Sanity Studio):** Singleton `settings` → `menu` → `links` → añadir un nuevo link **interno/externo** con:
> - Label / title: `Mikmax for Business`
> - Destino / url: `/b2b`
>
> No se genera commit de código para Task 7.

- [ ] **Step 1: Comprobar cómo se renderiza el nav**

Run: `npx rg -n "Mikmax for Business" app components` y `npx rg -n "menu" sanity/queries/common/header.ts`
Determinar si el item del menú existe en el Figma como dato editable en Sanity (singleton `settings`) o está hardcodeado.

- [ ] **Step 2a: Si el menú es data-driven (Sanity)**

Añadir en Sanity Studio (singleton `settings` → menú) un link interno con label "Mikmax for Business" y destino `/b2b`. No requiere cambio de código. Documentar en el commit que es un cambio de contenido.

- [ ] **Step 2b: Si está hardcodeado en un componente**

Localizar el array de items del header y añadir `{label: 'Mikmax for Business', href: '/b2b'}` respetando el tipo existente. Verificar con `npm run typecheck`.

- [ ] **Step 3: Verificar navegación**

Build + smoke: el item del header lleva a `/b2b`.

Run: `npm run build`
Expected: sin errores.

- [ ] **Step 4: Commit (solo si hubo cambio de código)**

```bash
git add components
git commit -m "feat(b2b): header link to Mikmax for Business"
```

---

## Cierre del Plan B — verificación final

- [ ] **Typecheck + lint + build limpios**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: sin errores. Rutas presentes: `/b2b`, `/b2b/register`, `/b2b/area`.

- [ ] **Smoke manual en staging** (con Plan A desplegado y env vars del checklist §14 del spec)

1. `/b2b` renderiza landing maquetada; el login funciona y, con un customer B2B aprobado, entra a `/b2b/area`.
2. Un customer **no B2B** que intenta `/b2b/area` → redirige a `/b2b`.
3. `/b2b/register` envía el formulario y muestra el estado correcto (approved/review/rejected) según los datos.
4. Tras una alta auto-aprobada, hacer login en `/b2b` con esas credenciales → `/b2b/area` muestra la condición (Reseller/Designer).
5. Mobile (375px) y desktop (1440px) sin overflow horizontal.

---

## Self-review (cobertura vs spec)

| Requisito spec | Task |
|---|---|
| Landing `/b2b` (Figma 32:14795) | 5 |
| Bloque login B2B (reutiliza auth B2C) | 4 + 5 |
| Formulario de alta con todos los campos + password | 2 |
| `/b2b/register` page | 3 |
| Consume `/api/b2b/register` y muestra approved/review/rejected | 2 |
| `/b2b/area` protegida por metafield `b2b.validated` | 6 + 1 |
| Newsletter reutilizado | 5 |
| Item de menú "Mikmax for Business" | 7 |
| Imágenes con LazyImage, mobile-first, sin `<img>` | 5 + 6 |

**Cierra la Fase 1.** Fuera de alcance (Fase 2/3): descuentos en checkout (Functions), `wholesale_price` en catálogo, incentivo de carrito para designers, área profesional rica.
```
