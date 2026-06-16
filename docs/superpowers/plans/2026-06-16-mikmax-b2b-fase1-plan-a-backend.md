# B2B Fase 1 — Plan A (Backend de registro y validación) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el backend completo del alta B2B: validación automática (VIES, Companies House, email, país), scoring, ramificación APPROVED/REVIEW/REJECTED, persistencia en Sanity (`b2bApplication`), creación de customer en Shopify con tags+metafields, emails transaccionales (Mailgun) y las dos API routes (`/api/b2b/register`, `/api/b2b/admin/[action]`).

**Architecture:** Validadores puros y testeables en `lib/b2b/validation/`, orquestados por la API route. La solicitud **siempre** se persiste en Sanity. El customer Shopify se crea al aprobar (auto o manual) vía Storefront `customerCreate` + Admin API para tags/metafields. Emails vía Mailgun. Sin Shopify Functions (diferidas a Fase 2).

**Tech Stack:** Next.js 15 (App Router, route handlers) · TypeScript · Sanity client (escritura server-only) · Shopify Storefront + Admin API · Mailgun REST · Vitest (nuevo).

**Spec:** `docs/superpowers/specs/2026-06-16-mikmax-b2b-fase1-registro-design.md`

---

## File structure (lo que crea/modifica este plan)

```
Crear:
  vitest.config.ts                         Config de tests
  types/b2b.ts                             Tipos del dominio B2B (input, señales, score, resultado)
  lib/b2b/validation/vatPrefixes.ts        Mapa prefijo VAT → país ISO-2
  lib/b2b/validation/country.ts            Coherencia país ↔ prefijo VAT
  lib/b2b/validation/email.ts              Detección de dominios genéricos
  lib/b2b/validation/vies.ts               Cliente VIES (REST) + comportamiento neutro ante caída
  lib/b2b/validation/companiesHouse.ts     Cliente Companies House (REST, UK)
  lib/b2b/validation/score.ts             Agregación de señales + umbrales de decisión
  lib/b2b/shopify.ts                       createB2BCustomer + addCustomerTags + setB2BMetafields (Admin)
  lib/b2b/email/mailgun.ts                 Cliente Mailgun (envío)
  lib/b2b/email/templates.ts               Plantillas approved/review/rejected/internal/more_info
  lib/b2b/application.ts                   Sanity write client + create/update b2bApplication
  lib/sanityWriteClient.ts                 Cliente Sanity con token de escritura (server-only)
  app/api/b2b/register/route.ts            POST: valida, puntúa, ramifica
  app/api/b2b/admin/[action]/route.ts      POST: approve | reject | more_info
  sanity/schemas/documents/b2bApplication.ts   Schema del documento
  __tests__/b2b/country.test.ts
  __tests__/b2b/email.test.ts
  __tests__/b2b/vies.test.ts
  __tests__/b2b/companiesHouse.test.ts
  __tests__/b2b/score.test.ts

Modificar:
  package.json                             devDeps vitest + script "test"
  lib/shopify.js                           getUser: añadir metafields b2b.validated / b2b.client_type
  sanity/schemas/index.ts (o donde se registren)   registrar b2bApplication
  sanity/desk/index.ts                     añadir b2bApplication a hiddenDocTypes + entry de lista
  .env.local / .env.example                nuevas env vars (documentar)
```

**Decisión de testing:** los validadores puros (`country`, `email`, `score`) y los clientes con red mockeable (`vies`, `companiesHouse`) se prueban con Vitest. Las piezas de integración (`lib/b2b/shopify.ts`, `mailgun.ts`, `application.ts`, las route handlers) **no** llevan test unitario en este plan — se verifican con smoke manual en staging (ver Plan A §"Cierre"). Se escriben con funciones puras inyectables donde aporta.

---

## Task 0: Setup de Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Instalar Vitest**

Run:
```bash
npm install -D vitest
```
Expected: vitest aparece en devDependencies.

- [ ] **Step 2: Crear `vitest.config.ts`**

```ts
import {defineConfig} from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
  resolve: {
    alias: {'@': path.resolve(__dirname, '.')},
  },
})
```

- [ ] **Step 3: Añadir script de test a `package.json`**

En el bloque `"scripts"`, añadir:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verificar que el runner arranca**

Run: `npm test`
Expected: termina con "No test files found" (aún no hay tests) y exit code 0, o un mensaje equivalente sin error de configuración.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest for b2b validation tests"
```

---

## Task 1: Tipos del dominio B2B

**Files:**
- Create: `types/b2b.ts`

- [ ] **Step 1: Crear `types/b2b.ts`**

```ts
// Tipos del dominio B2B (Fase 1). Props de componentes y formas de datos del frontend
// van en types/ (CLAUDE.md). Los tipos derivados de GROQ irían en sanity/types/.

export type B2bClientType = 'reseller' | 'designer'

export type B2bDecision = 'approved' | 'review' | 'rejected'

export type B2bStatus = 'pending' | 'approved' | 'rejected' | 'more_info'

export interface B2bRegisterInput {
  clientType: B2bClientType
  country: string // ISO-2, ej. 'ES'
  legalCompanyName: string
  vatNumber: string
  companyWebsite?: string
  corporateEmail: string
  fiscalAddress: string
  password: string
}

// Señales parciales que producen los validadores.
export interface ValidationSignals {
  vatValid: boolean // VIES o Companies House válido
  vatServiceAvailable: boolean // false si el servicio externo no respondió
  corporateEmail: boolean
  websitePresent: boolean
  countryMatchesVat: boolean
  clientTypeDeclared: boolean
}

export interface ScoreResult {
  score: number
  decision: B2bDecision
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores nuevos.

- [ ] **Step 3: Commit**

```bash
git add types/b2b.ts
git commit -m "feat(b2b): add domain types"
```

---

## Task 2: Coherencia país ↔ prefijo VAT

**Files:**
- Create: `lib/b2b/validation/vatPrefixes.ts`
- Create: `lib/b2b/validation/country.ts`
- Test: `__tests__/b2b/country.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`__tests__/b2b/country.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {countryMatchesVat, parseVatPrefix} from '@/lib/b2b/validation/country'

describe('parseVatPrefix', () => {
  it('extrae el prefijo de 2 letras en mayúsculas', () => {
    expect(parseVatPrefix('ESB12345678')).toBe('ES')
    expect(parseVatPrefix('  es b1234 ')).toBe('ES')
  })
  it('devuelve null si no empieza por dos letras', () => {
    expect(parseVatPrefix('12345678')).toBeNull()
  })
})

describe('countryMatchesVat', () => {
  it('true cuando el prefijo VAT corresponde al país', () => {
    expect(countryMatchesVat('ES', 'ESB12345678')).toBe(true)
  })
  it('mapea el prefijo griego EL a GR', () => {
    expect(countryMatchesVat('GR', 'EL123456789')).toBe(true)
  })
  it('mapea UK (prefijo GB) al país GB', () => {
    expect(countryMatchesVat('GB', 'GB123456789')).toBe(true)
  })
  it('false cuando no corresponden', () => {
    expect(countryMatchesVat('FR', 'ESB12345678')).toBe(false)
  })
  it('false cuando el VAT no tiene prefijo', () => {
    expect(countryMatchesVat('ES', '12345678')).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `npx vitest run __tests__/b2b/country.test.ts`
Expected: FAIL — "Cannot find module '@/lib/b2b/validation/country'".

- [ ] **Step 3: Crear `lib/b2b/validation/vatPrefixes.ts`**

```ts
// Prefijo de número VAT → país ISO-2 declarado. La mayoría coincide con el ISO-2,
// salvo Grecia (EL → GR). Reino Unido usa GB.
export const VAT_PREFIX_TO_COUNTRY: Record<string, string> = {
  AT: 'AT', BE: 'BE', BG: 'BG', CY: 'CY', CZ: 'CZ', DE: 'DE', DK: 'DK',
  EE: 'EE', EL: 'GR', ES: 'ES', FI: 'FI', FR: 'FR', GB: 'GB', HR: 'HR',
  HU: 'HU', IE: 'IE', IT: 'IT', LT: 'LT', LU: 'LU', LV: 'LV', MT: 'MT',
  NL: 'NL', PL: 'PL', PT: 'PT', RO: 'RO', SE: 'SE', SI: 'SI', SK: 'SK',
}
```

- [ ] **Step 4: Crear `lib/b2b/validation/country.ts`**

```ts
import {VAT_PREFIX_TO_COUNTRY} from './vatPrefixes'

// Extrae el prefijo de 2 letras del VAT (en mayúsculas), ignorando espacios.
export function parseVatPrefix(vatNumber: string): string | null {
  const cleaned = (vatNumber || '').replace(/\s/g, '').toUpperCase()
  const m = cleaned.match(/^([A-Z]{2})/)
  return m ? m[1] : null
}

// True si el prefijo del VAT mapea al país declarado.
export function countryMatchesVat(country: string, vatNumber: string): boolean {
  const prefix = parseVatPrefix(vatNumber)
  if (!prefix) return false
  const mapped = VAT_PREFIX_TO_COUNTRY[prefix]
  if (!mapped) return false
  return mapped === (country || '').toUpperCase()
}
```

- [ ] **Step 5: Ejecutar el test (debe pasar)**

Run: `npx vitest run __tests__/b2b/country.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add lib/b2b/validation/vatPrefixes.ts lib/b2b/validation/country.ts __tests__/b2b/country.test.ts
git commit -m "feat(b2b): country-vat coherence validator"
```

---

## Task 3: Detección de email corporativo

**Files:**
- Create: `lib/b2b/validation/email.ts`
- Test: `__tests__/b2b/email.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`__tests__/b2b/email.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {isCorporateEmail} from '@/lib/b2b/validation/email'

describe('isCorporateEmail', () => {
  it('false para dominios genéricos', () => {
    expect(isCorporateEmail('a@gmail.com')).toBe(false)
    expect(isCorporateEmail('a@hotmail.com')).toBe(false)
    expect(isCorporateEmail('a@yahoo.es')).toBe(false)
    expect(isCorporateEmail('a@outlook.com')).toBe(false)
    expect(isCorporateEmail('a@icloud.com')).toBe(false)
  })
  it('true para dominios corporativos', () => {
    expect(isCorporateEmail('buyer@mikmax.com')).toBe(true)
    expect(isCorporateEmail('compras@hotelria.es')).toBe(true)
  })
  it('insensible a mayúsculas y espacios', () => {
    expect(isCorporateEmail('  A@GMAIL.com ')).toBe(false)
  })
  it('false para email malformado', () => {
    expect(isCorporateEmail('noesunemail')).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `npx vitest run __tests__/b2b/email.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Crear `lib/b2b/validation/email.ts`**

```ts
// Dominios de email genéricos (no corporativos). Ampliable.
const GENERIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.es', 'hotmail.co.uk',
  'yahoo.com', 'yahoo.es', 'yahoo.co.uk',
  'outlook.com', 'outlook.es', 'live.com', 'msn.com',
  'icloud.com', 'me.com',
  'aol.com', 'protonmail.com', 'gmx.com',
])

// True si el email tiene forma válida y su dominio NO es genérico.
export function isCorporateEmail(email: string): boolean {
  const cleaned = (email || '').trim().toLowerCase()
  const m = cleaned.match(/^[^@\s]+@([^@\s]+\.[^@\s]+)$/)
  if (!m) return false
  return !GENERIC_DOMAINS.has(m[1])
}
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `npx vitest run __tests__/b2b/email.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/b2b/validation/email.ts __tests__/b2b/email.test.ts
git commit -m "feat(b2b): corporate email validator"
```

---

## Task 4: Cliente VIES (EU VAT)

> Usamos el endpoint REST oficial de VIES (`/check-vat-number`, JSON), que supersede al SOAP clásico y es más fácil de testear. Una caída del servicio se trata como **señal neutra**, nunca rechazo.

**Files:**
- Create: `lib/b2b/validation/vies.ts`
- Test: `__tests__/b2b/vies.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`__tests__/b2b/vies.test.ts`:
```ts
import {describe, it, expect, vi, afterEach} from 'vitest'
import {checkVies} from '@/lib/b2b/validation/vies'

afterEach(() => vi.restoreAllMocks())

describe('checkVies', () => {
  it('valid + available cuando VIES dice valid:true', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({valid: true, name: 'ACME SL', address: 'Calle 1'}),
    })))
    const r = await checkVies('ESB12345678')
    expect(r).toEqual({valid: true, available: true, name: 'ACME SL', address: 'Calle 1'})
  })

  it('invalid + available cuando VIES dice valid:false', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({valid: false}),
    })))
    const r = await checkVies('ESB00000000')
    expect(r.valid).toBe(false)
    expect(r.available).toBe(true)
  })

  it('available:false (neutro) si el VAT no tiene prefijo parseable', async () => {
    const r = await checkVies('123')
    expect(r).toEqual({valid: false, available: false})
  })

  it('available:false (neutro) si fetch lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network')
    }))
    const r = await checkVies('ESB12345678')
    expect(r).toEqual({valid: false, available: false})
  })

  it('available:false (neutro) si el servicio responde no-ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: false, status: 500, json: async () => ({})})))
    const r = await checkVies('ESB12345678')
    expect(r.available).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `npx vitest run __tests__/b2b/vies.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Crear `lib/b2b/validation/vies.ts`**

```ts
import {parseVatPrefix} from './country'

export interface ViesResult {
  valid: boolean
  available: boolean // false → servicio no concluyente (no rechazar)
  name?: string
  address?: string
}

const VIES_URL = 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number'

// Comprueba un VAT intracomunitario en VIES. Nunca lanza: ante cualquier fallo
// devuelve {valid:false, available:false} para que el scoring lo trate como neutro.
export async function checkVies(vatNumber: string): Promise<ViesResult> {
  const prefix = parseVatPrefix(vatNumber)
  if (!prefix) return {valid: false, available: false}

  const number = (vatNumber || '').replace(/\s/g, '').toUpperCase().slice(prefix.length)

  try {
    const res = await fetch(VIES_URL, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({countryCode: prefix, vatNumber: number}),
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return {valid: false, available: false}
    const json = await res.json()
    return {
      valid: Boolean(json?.valid),
      available: true,
      name: json?.name || undefined,
      address: json?.address || undefined,
    }
  } catch {
    return {valid: false, available: false}
  }
}
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `npx vitest run __tests__/b2b/vies.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/b2b/validation/vies.ts __tests__/b2b/vies.test.ts
git commit -m "feat(b2b): VIES vat validator (neutral on failure)"
```

---

## Task 5: Cliente Companies House (UK)

**Files:**
- Create: `lib/b2b/validation/companiesHouse.ts`
- Test: `__tests__/b2b/companiesHouse.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`__tests__/b2b/companiesHouse.test.ts`:
```ts
import {describe, it, expect, vi, afterEach, beforeEach} from 'vitest'
import {checkCompaniesHouse} from '@/lib/b2b/validation/companiesHouse'

beforeEach(() => {
  process.env.COMPANIES_HOUSE_API_KEY = 'test-key'
})
afterEach(() => vi.restoreAllMocks())

describe('checkCompaniesHouse', () => {
  it('valid cuando la empresa existe y está activa', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({company_status: 'active', company_name: 'ACME LTD'}),
    })))
    const r = await checkCompaniesHouse('GB12345678')
    expect(r).toEqual({valid: true, available: true, name: 'ACME LTD'})
  })

  it('invalid si la empresa no está activa', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({company_status: 'dissolved', company_name: 'OLD LTD'}),
    })))
    const r = await checkCompaniesHouse('GB99999999')
    expect(r.valid).toBe(false)
    expect(r.available).toBe(true)
  })

  it('invalid + available si responde 404 (no existe)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ok: false, status: 404, json: async () => ({})})))
    const r = await checkCompaniesHouse('GB00000000')
    expect(r).toEqual({valid: false, available: true})
  })

  it('neutro (available:false) sin API key', async () => {
    delete process.env.COMPANIES_HOUSE_API_KEY
    const r = await checkCompaniesHouse('GB12345678')
    expect(r).toEqual({valid: false, available: false})
  })

  it('neutro (available:false) si fetch lanza', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('network')
    }))
    const r = await checkCompaniesHouse('GB12345678')
    expect(r).toEqual({valid: false, available: false})
  })
})
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `npx vitest run __tests__/b2b/companiesHouse.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Crear `lib/b2b/validation/companiesHouse.ts`**

```ts
export interface CompaniesHouseResult {
  valid: boolean
  available: boolean // false → servicio no concluyente (no rechazar)
  name?: string
}

// El "company number" UK son los dígitos tras el prefijo GB (o el propio número).
function toCompanyNumber(vatNumber: string): string {
  return (vatNumber || '').replace(/\s/g, '').toUpperCase().replace(/^GB/, '')
}

// Companies House REST: Basic auth con la API key como usuario y password vacío.
export async function checkCompaniesHouse(vatNumber: string): Promise<CompaniesHouseResult> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY
  if (!apiKey) return {valid: false, available: false}

  const number = toCompanyNumber(vatNumber)
  const auth = Buffer.from(`${apiKey}:`).toString('base64')

  try {
    const res = await fetch(`https://api.company-information.service.gov.uk/company/${number}`, {
      headers: {Authorization: `Basic ${auth}`},
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (res.status === 404) return {valid: false, available: true}
    if (!res.ok) return {valid: false, available: false}
    const json = await res.json()
    const active = json?.company_status === 'active'
    return {valid: active, available: true, name: json?.company_name || undefined}
  } catch {
    return {valid: false, available: false}
  }
}
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `npx vitest run __tests__/b2b/companiesHouse.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/b2b/validation/companiesHouse.ts __tests__/b2b/companiesHouse.test.ts
git commit -m "feat(b2b): Companies House validator (UK)"
```

---

## Task 6: Scoring y decisión

**Files:**
- Create: `lib/b2b/validation/score.ts`
- Test: `__tests__/b2b/score.test.ts`

- [ ] **Step 1: Escribir el test que falla**

`__tests__/b2b/score.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {scoreApplication} from '@/lib/b2b/validation/score'
import type {ValidationSignals} from '@/types/b2b'

const base: ValidationSignals = {
  vatValid: false,
  vatServiceAvailable: true,
  corporateEmail: false,
  websitePresent: false,
  countryMatchesVat: false,
  clientTypeDeclared: false,
}

describe('scoreApplication', () => {
  it('APPROVED con VAT válido + email + web + país (90)', () => {
    const r = scoreApplication({
      ...base,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
    })
    expect(r.score).toBe(90)
    expect(r.decision).toBe('approved')
  })

  it('APPROVED exacto en 85 (VAT+email+país+tipo)', () => {
    const r = scoreApplication({
      ...base,
      vatValid: true,
      corporateEmail: true,
      countryMatchesVat: true,
      clientTypeDeclared: true,
    })
    expect(r.score).toBe(85)
    expect(r.decision).toBe('approved')
  })

  it('REVIEW cuando VIES no está disponible (cae sin los 40 → 60)', () => {
    const r = scoreApplication({
      ...base,
      vatValid: false,
      vatServiceAvailable: false,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
      clientTypeDeclared: false,
    })
    expect(r.score).toBe(50)
    expect(r.decision).toBe('review')
  })

  it('REJECTED por debajo de 50', () => {
    const r = scoreApplication({...base, clientTypeDeclared: true}) // 10
    expect(r.score).toBe(10)
    expect(r.decision).toBe('rejected')
  })

  it('UK con Companies House válido cuenta como vatValid (40) y puede aprobar', () => {
    // El orquestador setea vatValid=true cuando Companies House valida.
    const r = scoreApplication({
      ...base,
      vatValid: true,
      corporateEmail: true,
      websitePresent: true,
      countryMatchesVat: true,
    })
    expect(r.decision).toBe('approved')
  })
})
```

- [ ] **Step 2: Ejecutar el test (debe fallar)**

Run: `npx vitest run __tests__/b2b/score.test.ts`
Expected: FAIL — módulo no encontrado.

- [ ] **Step 3: Crear `lib/b2b/validation/score.ts`**

```ts
import type {ValidationSignals, ScoreResult, B2bDecision} from '@/types/b2b'

const POINTS = {
  vatValid: 40,
  corporateEmail: 20,
  websitePresent: 15,
  countryMatchesVat: 15,
  clientTypeDeclared: 10,
}

const APPROVE_AT = 85
const REVIEW_AT = 50

export function scoreApplication(signals: ValidationSignals): ScoreResult {
  let score = 0
  if (signals.vatValid) score += POINTS.vatValid
  if (signals.corporateEmail) score += POINTS.corporateEmail
  if (signals.websitePresent) score += POINTS.websitePresent
  if (signals.countryMatchesVat) score += POINTS.countryMatchesVat
  if (signals.clientTypeDeclared) score += POINTS.clientTypeDeclared

  let decision: B2bDecision = 'rejected'
  if (score >= APPROVE_AT) decision = 'approved'
  else if (score >= REVIEW_AT) decision = 'review'

  return {score, decision}
}
```

- [ ] **Step 4: Ejecutar el test (debe pasar)**

Run: `npx vitest run __tests__/b2b/score.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Ejecutar toda la suite**

Run: `npm test`
Expected: PASS — todos los archivos `__tests__/b2b/*` en verde.

- [ ] **Step 6: Commit**

```bash
git add lib/b2b/validation/score.ts __tests__/b2b/score.test.ts
git commit -m "feat(b2b): scoring and decision thresholds"
```

---

## Task 7: Cliente Sanity de escritura + CRUD de `b2bApplication`

**Files:**
- Create: `lib/sanityWriteClient.ts`
- Create: `lib/b2b/application.ts`

- [ ] **Step 1: Crear `lib/sanityWriteClient.ts`**

```ts
import 'server-only'
import {createClient} from 'next-sanity'
import {apiVersion, dataset, projectId} from '@/sanity/env'

// Cliente Sanity con token de escritura. SOLO server-side (server-only impide el import en cliente).
export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
})
```

> Si `@/sanity/env` no exporta `apiVersion/dataset/projectId`, ajustar el import a la ruta real usada por `sanity/queries/index.tsx` (que importa de `'../env'`).

- [ ] **Step 2: Crear `lib/b2b/application.ts`**

```ts
import 'server-only'
import {sanityWriteClient} from '@/lib/sanityWriteClient'
import type {B2bRegisterInput, B2bStatus} from '@/types/b2b'

interface CreateArgs {
  input: B2bRegisterInput
  status: B2bStatus
  validationScore: number
  internalNotes?: string
  shopifyCustomerId?: string
}

// Crea el documento b2bApplication. NUNCA persiste la contraseña.
export async function createB2bApplication(args: CreateArgs): Promise<{_id: string}> {
  const {input, status, validationScore, internalNotes, shopifyCustomerId} = args
  const now = new Date().toISOString()
  const doc = {
    _type: 'b2bApplication',
    applicantName: input.legalCompanyName,
    companyName: input.legalCompanyName,
    vatNumber: input.vatNumber,
    country: input.country,
    clientType: input.clientType,
    corporateEmail: input.corporateEmail,
    companyWebsite: input.companyWebsite || undefined,
    fiscalAddress: input.fiscalAddress,
    status,
    validationScore,
    internalNotes: internalNotes || undefined,
    shopifyCustomerId: shopifyCustomerId || undefined,
    createdAt: now,
    updatedAt: now,
  }
  const created = await sanityWriteClient.create(doc)
  return {_id: created._id}
}

// Actualiza estado + campos al aprobar/rechazar/pedir info desde el panel admin.
export async function updateB2bApplication(
  id: string,
  patch: {status?: B2bStatus; shopifyCustomerId?: string; internalNotes?: string},
): Promise<void> {
  await sanityWriteClient
    .patch(id)
    .set({...patch, updatedAt: new Date().toISOString()})
    .commit()
}

// Lee una aplicación (para la route admin: necesita email/clientType para crear el customer).
export async function getB2bApplication(id: string) {
  return sanityWriteClient.fetch(
    `*[_type == "b2bApplication" && _id == $id][0]{
      _id, corporateEmail, companyName, clientType, country, status, shopifyCustomerId
    }`,
    {id},
  )
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores nuevos (si `next-sanity` no está en deps, ya lo está por `sanity/queries/index.tsx`).

- [ ] **Step 4: Commit**

```bash
git add lib/sanityWriteClient.ts lib/b2b/application.ts
git commit -m "feat(b2b): sanity write client + b2bApplication CRUD"
```

---

## Task 8: Schema Sanity `b2bApplication` + desk

**Files:**
- Create: `sanity/schemas/documents/b2bApplication.ts`
- Modify: el index de schemas (donde se registran los documents) y `sanity/desk/index.ts`

- [ ] **Step 1: Localizar el registro de schemas**

Run: `npx rg -l "documents" sanity/schemas` y abrir el archivo que arma el array de `types` (p. ej. `sanity/schemas/index.ts`). Identificar cómo se importan otros documents (p. ej. `product`, `look`).

- [ ] **Step 2: Crear `sanity/schemas/documents/b2bApplication.ts`**

```ts
import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'b2bApplication',
  title: 'Solicitud B2B',
  type: 'document',
  fields: [
    defineField({name: 'applicantName', title: 'Solicitante', type: 'string'}),
    defineField({name: 'companyName', title: 'Empresa', type: 'string'}),
    defineField({name: 'vatNumber', title: 'VAT / NIF', type: 'string'}),
    defineField({name: 'country', title: 'País', type: 'string'}),
    defineField({
      name: 'clientType',
      title: 'Tipo de cliente',
      type: 'string',
      options: {list: ['reseller', 'designer']},
    }),
    defineField({name: 'corporateEmail', title: 'Email corporativo', type: 'string'}),
    defineField({name: 'companyWebsite', title: 'Web', type: 'url'}),
    defineField({name: 'fiscalAddress', title: 'Dirección fiscal', type: 'text'}),
    defineField({
      name: 'status',
      title: 'Estado',
      type: 'string',
      options: {list: ['pending', 'approved', 'rejected', 'more_info']},
      initialValue: 'pending',
    }),
    defineField({name: 'validationScore', title: 'Puntuación', type: 'number'}),
    defineField({name: 'internalNotes', title: 'Notas internas', type: 'text'}),
    defineField({name: 'shopifyCustomerId', title: 'Shopify Customer ID', type: 'string'}),
    defineField({name: 'createdAt', title: 'Creado', type: 'datetime'}),
    defineField({name: 'updatedAt', title: 'Actualizado', type: 'datetime'}),
  ],
  preview: {
    select: {title: 'companyName', subtitle: 'status'},
  },
})
```

- [ ] **Step 3: Registrar el schema**

En el index de schemas, importar y añadir `b2bApplication` al array de `types` (replicando el patrón de los demás documents).

- [ ] **Step 4: Añadir a `hiddenDocTypes` y a la lista del desk**

En `sanity/desk/index.ts`: añadir `'b2bApplication'` a `hiddenDocTypes` (igual que `product`, `look`, etc.) y crear un `S.listItem` para verlas. Patrón mínimo:

```ts
S.listItem()
  .title('Solicitudes B2B')
  .child(
    S.documentTypeList('b2bApplication')
      .title('Solicitudes B2B')
      .filter('_type == "b2bApplication"')
      .defaultOrdering([{field: 'createdAt', direction: 'desc'}]),
  ),
```

- [ ] **Step 5: Verificar que el Studio carga**

Run: `npm run typecheck`
Expected: sin errores. (El arranque visual del Studio se verifica en el smoke manual.)

- [ ] **Step 6: Commit**

```bash
git add sanity/schemas/documents/b2bApplication.ts sanity/schemas sanity/desk/index.ts
git commit -m "feat(b2b): b2bApplication sanity schema + desk list"
```

---

## Task 9: Shopify — crear customer B2B con tags y metafields

**Files:**
- Create: `lib/b2b/shopify.ts`
- Modify: `lib/shopify-admin.js` (añadir `setCustomerB2bData` + `customerTagsAdd`)

- [ ] **Step 1: Añadir helpers Admin a `lib/shopify-admin.js`**

Al final del archivo, exportar:

```js
// Añade tags a un customer. customerId = gid://shopify/Customer/123
export async function customerTagsAdd(customerId, tags) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured — tags not added.'}
  }
  const query = `
    mutation tagsAdd($id: ID!, $tags: [String!]!) {
      tagsAdd(id: $id, tags: $tags) {
        node { id }
        userErrors { field message }
      }
    }
  `
  try {
    const json = await adminData(query, {id: customerId, tags})
    const errors = json?.data?.tagsAdd?.userErrors ?? []
    if (errors.length) return {error: errors[0].message}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}

// Escribe los metafields B2B (namespace "b2b"). customerId = gid://shopify/Customer/123
export async function setCustomerB2bData(customerId, {clientType, discountGroup}) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured — b2b metafields not saved.'}
  }
  const query = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id }
        userErrors { field message }
      }
    }
  `
  const variables = {
    metafields: [
      {ownerId: customerId, namespace: 'b2b', key: 'client_type', type: 'single_line_text_field', value: clientType},
      {ownerId: customerId, namespace: 'b2b', key: 'validated', type: 'single_line_text_field', value: 'true'},
      {ownerId: customerId, namespace: 'b2b', key: 'discount_group', type: 'single_line_text_field', value: discountGroup},
    ],
  }
  try {
    const json = await adminData(query, variables)
    const errors = json?.data?.metafieldsSet?.userErrors ?? []
    if (errors.length) return {error: errors[0].message}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}

// Crea un customer desde Admin SIN contraseña y le envía invitación de activación.
// Para el flujo REVIEW (aprobación manual posterior). Devuelve {id} o {error}.
export async function adminCustomerCreate({email, firstName}) {
  if (!STATIC_TOKEN && (!CLIENT_ID || !CLIENT_SECRET)) {
    return {error: 'Admin API not configured — customer not created.'}
  }
  const query = `
    mutation customerCreate($input: CustomerInput!) {
      customerCreate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }
  `
  try {
    const json = await adminData(query, {input: {email, firstName}})
    const errors = json?.data?.customerCreate?.userErrors ?? []
    if (errors.length) return {error: errors[0].message}
    return {id: json?.data?.customerCreate?.customer?.id}
  } catch (err) {
    return {error: String(err)}
  }
}
```

- [ ] **Step 2: Crear `lib/b2b/shopify.ts`**

```ts
import 'server-only'
import {customerCreate} from '@/lib/shopify'
// @ts-expect-error — lib/shopify-admin.js no tiene tipos
import {customerTagsAdd, setCustomerB2bData, adminCustomerCreate} from '@/lib/shopify-admin'
import type {B2bClientType} from '@/types/b2b'

const discountGroupFor = (t: B2bClientType) => (t === 'reseller' ? 'wholesale' : 'designer')

// Flujo AUTO-APPROVED: crea el customer con la contraseña elegida (Storefront) y le
// añade tags + metafields b2b (Admin). Devuelve {customerId} o {error}.
export async function createApprovedB2bCustomer(args: {
  email: string
  password: string
  companyName: string
  clientType: B2bClientType
}): Promise<{customerId?: string; error?: string}> {
  const created = await customerCreate(args.email, args.password, {firstName: args.companyName})
  if (created?.error) return {error: 'shopify_create_failed'}
  const errs = created?.customerCreate?.customerUserErrors ?? []
  if (errs.length) return {error: errs[0].message}
  const customerId: string | undefined = created?.customerCreate?.customer?.id
  if (!customerId) return {error: 'no_customer_id'}

  await customerTagsAdd(customerId, ['b2b-approved', args.clientType])
  await setCustomerB2bData(customerId, {
    clientType: args.clientType,
    discountGroup: discountGroupFor(args.clientType),
  })
  return {customerId}
}

// Flujo REVIEW→APROBADO: crea el customer sin contraseña (Admin) + tags + metafields.
// El email de activación lo dispara la route admin con el flujo recover existente.
export async function createReviewedB2bCustomer(args: {
  email: string
  companyName: string
  clientType: B2bClientType
}): Promise<{customerId?: string; error?: string}> {
  const created = await adminCustomerCreate({email: args.email, firstName: args.companyName})
  if (created?.error) return {error: created.error}
  const customerId: string | undefined = created?.id
  if (!customerId) return {error: 'no_customer_id'}

  await customerTagsAdd(customerId, ['b2b-approved', args.clientType])
  await setCustomerB2bData(customerId, {
    clientType: args.clientType,
    discountGroup: discountGroupFor(args.clientType),
  })
  return {customerId}
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores nuevos.

- [ ] **Step 4: Commit**

```bash
git add lib/shopify-admin.js lib/b2b/shopify.ts
git commit -m "feat(b2b): create shopify b2b customer (tags + metafields)"
```

---

## Task 10: Emails con Mailgun

**Files:**
- Create: `lib/b2b/email/mailgun.ts`
- Create: `lib/b2b/email/templates.ts`

- [ ] **Step 1: Crear `lib/b2b/email/mailgun.ts`**

```ts
import 'server-only'

const API_KEY = process.env.MAILGUN_API_KEY
const DOMAIN = process.env.MAILGUN_DOMAIN
// Región US por defecto; para cuentas EU usar 'https://api.eu.mailgun.net'.
const BASE = process.env.MAILGUN_BASE_URL || 'https://api.mailgun.net'

interface SendArgs {
  to: string
  subject: string
  html: string
  from?: string
}

// Envía un email vía Mailgun REST. Nunca lanza: devuelve {ok} o {error} para no
// romper el flujo de alta si el email falla.
export async function sendEmail({to, subject, html, from}: SendArgs): Promise<{ok?: boolean; error?: string}> {
  if (!API_KEY || !DOMAIN) return {error: 'Mailgun not configured'}
  const sender = from || `Mikmax B2B <noreply@${DOMAIN}>`
  const auth = Buffer.from(`api:${API_KEY}`).toString('base64')
  const body = new URLSearchParams({from: sender, to, subject, html})
  try {
    const res = await fetch(`${BASE}/v3/${DOMAIN}/messages`, {
      method: 'POST',
      headers: {Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded'},
      body,
      cache: 'no-store',
    })
    if (!res.ok) return {error: `Mailgun ${res.status}`}
    return {ok: true}
  } catch (err) {
    return {error: String(err)}
  }
}
```

- [ ] **Step 2: Crear `lib/b2b/email/templates.ts`**

```ts
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikmax.com'

const wrap = (inner: string) =>
  `<div style="font-family:Arial,sans-serif;font-size:15px;color:#111;line-height:1.5">${inner}</div>`

export function approvedEmail(companyName: string) {
  return {
    subject: 'Tu cuenta B2B de Mikmax está activa',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>Tu cuenta de empresa ha sido aprobada. Ya puedes iniciar sesión y comprar con tus condiciones.</p>
       <p><a href="${SITE}/b2b">Acceder a Mikmax for Business</a></p>`,
    ),
  }
}

// Para aprobaciones desde el panel (REVIEW): incluye enlace para fijar contraseña.
export function approvedWithActivationEmail(companyName: string, activationUrl: string) {
  return {
    subject: 'Tu cuenta B2B de Mikmax está activa — crea tu contraseña',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>Hemos aprobado tu cuenta de empresa. Crea tu contraseña para empezar:</p>
       <p><a href="${activationUrl}">Crear contraseña y acceder</a></p>`,
    ),
  }
}

export function reviewEmail(companyName: string) {
  return {
    subject: 'Hemos recibido tu solicitud B2B',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>Estamos revisando tu solicitud de cuenta de empresa. Te escribiremos en cuanto la validemos.</p>`,
    ),
  }
}

export function rejectedEmail(companyName: string) {
  return {
    subject: 'Necesitamos más información sobre tu solicitud B2B',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>No hemos podido validar automáticamente tu solicitud. Responde a este correo con tu CIF/VAT y datos
       de empresa para continuar.</p>`,
    ),
  }
}

export function moreInfoEmail(companyName: string) {
  return {
    subject: 'Necesitamos completar tu solicitud B2B',
    html: wrap(
      `<p>Hola ${companyName},</p>
       <p>Para continuar con tu alta necesitamos información adicional. Responde a este correo y te ayudamos.</p>`,
    ),
  }
}

export function internalReviewEmail(data: {
  companyName: string
  vatNumber: string
  country: string
  clientType: string
  corporateEmail: string
  companyWebsite?: string
  fiscalAddress: string
  score: number
  notes?: string
}) {
  return {
    subject: `[B2B REVIEW] ${data.companyName} (score ${data.score})`,
    html: wrap(
      `<p><strong>Nueva solicitud B2B en revisión</strong></p>
       <ul>
         <li>Empresa: ${data.companyName}</li>
         <li>VAT: ${data.vatNumber}</li>
         <li>País: ${data.country}</li>
         <li>Tipo: ${data.clientType}</li>
         <li>Email: ${data.corporateEmail}</li>
         <li>Web: ${data.companyWebsite || '—'}</li>
         <li>Dirección fiscal: ${data.fiscalAddress}</li>
         <li>Score: ${data.score}</li>
         <li>Notas: ${data.notes || '—'}</li>
       </ul>
       <p>Revisar en Sanity Studio → Solicitudes B2B.</p>`,
    ),
  }
}
```

- [ ] **Step 3: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add lib/b2b/email/mailgun.ts lib/b2b/email/templates.ts
git commit -m "feat(b2b): mailgun client + email templates"
```

---

## Task 11: Route handler `/api/b2b/register`

**Files:**
- Create: `app/api/b2b/register/route.ts`

- [ ] **Step 1: Crear `app/api/b2b/register/route.ts`**

```ts
import {NextResponse} from 'next/server'
import type {B2bRegisterInput, ValidationSignals} from '@/types/b2b'
import {checkVies} from '@/lib/b2b/validation/vies'
import {checkCompaniesHouse} from '@/lib/b2b/validation/companiesHouse'
import {isCorporateEmail} from '@/lib/b2b/validation/email'
import {countryMatchesVat} from '@/lib/b2b/validation/country'
import {scoreApplication} from '@/lib/b2b/validation/score'
import {createB2bApplication} from '@/lib/b2b/application'
import {createApprovedB2bCustomer} from '@/lib/b2b/shopify'
import {sendEmail} from '@/lib/b2b/email/mailgun'
import {
  approvedEmail,
  reviewEmail,
  rejectedEmail,
  internalReviewEmail,
} from '@/lib/b2b/email/templates'

export const runtime = 'nodejs'

function isValidPayload(b: Partial<B2bRegisterInput>): b is B2bRegisterInput {
  return Boolean(
    b &&
      (b.clientType === 'reseller' || b.clientType === 'designer') &&
      b.country &&
      b.legalCompanyName &&
      b.vatNumber &&
      b.corporateEmail &&
      b.fiscalAddress &&
      b.password &&
      b.password.length >= 8,
  )
}

export async function POST(req: Request) {
  let input: Partial<B2bRegisterInput>
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({error: 'invalid_json'}, {status: 400})
  }
  if (!isValidPayload(input)) {
    return NextResponse.json({error: 'invalid_payload'}, {status: 400})
  }

  const isUK = input.country.toUpperCase() === 'GB'
  const vies = isUK ? {valid: false, available: false} : await checkVies(input.vatNumber)
  const ch = isUK ? await checkCompaniesHouse(input.vatNumber) : {valid: false, available: false}

  const vatValid = vies.valid || ch.valid
  const vatServiceAvailable = isUK ? ch.available : vies.available

  const signals: ValidationSignals = {
    vatValid,
    vatServiceAvailable,
    corporateEmail: isCorporateEmail(input.corporateEmail),
    websitePresent: Boolean(input.companyWebsite),
    countryMatchesVat: countryMatchesVat(input.country, input.vatNumber),
    clientTypeDeclared: Boolean(input.clientType),
  }

  const {score, decision} = scoreApplication(signals)
  const notes = !vatServiceAvailable
    ? `Servicio de validación VAT no disponible (${isUK ? 'Companies House' : 'VIES'}) — verificar manualmente.`
    : undefined

  // --- APPROVED ---
  if (decision === 'approved') {
    const result = await createApprovedB2bCustomer({
      email: input.corporateEmail,
      password: input.password,
      companyName: input.legalCompanyName,
      clientType: input.clientType,
    })
    if (result.error || !result.customerId) {
      // Fallback seguro: no perder la solicitud → pasa a revisión.
      await createB2bApplication({
        input,
        status: 'pending',
        validationScore: score,
        internalNotes: `Auto-aprobada pero falló la creación del customer: ${result.error}. Revisar manualmente.`,
      })
      const internal = internalReviewEmail({...input, score, notes: `create_failed: ${result.error}`})
      await sendEmail({to: process.env.INTERNAL_NOTIFICATION_EMAIL || '', ...internal})
      return NextResponse.json({status: 'review'})
    }
    await createB2bApplication({
      input,
      status: 'approved',
      validationScore: score,
      shopifyCustomerId: result.customerId,
    })
    const mail = approvedEmail(input.legalCompanyName)
    await sendEmail({to: input.corporateEmail, ...mail})
    return NextResponse.json({status: 'approved'})
  }

  // --- REVIEW ---
  if (decision === 'review') {
    await createB2bApplication({input, status: 'pending', validationScore: score, internalNotes: notes})
    const toCustomer = reviewEmail(input.legalCompanyName)
    await sendEmail({to: input.corporateEmail, ...toCustomer})
    const internal = internalReviewEmail({
      companyName: input.legalCompanyName,
      vatNumber: input.vatNumber,
      country: input.country,
      clientType: input.clientType,
      corporateEmail: input.corporateEmail,
      companyWebsite: input.companyWebsite,
      fiscalAddress: input.fiscalAddress,
      score,
      notes,
    })
    await sendEmail({to: process.env.INTERNAL_NOTIFICATION_EMAIL || '', ...internal})
    return NextResponse.json({status: 'review'})
  }

  // --- REJECTED ---
  await createB2bApplication({input, status: 'rejected', validationScore: score})
  const mail = rejectedEmail(input.legalCompanyName)
  await sendEmail({to: input.corporateEmail, ...mail})
  return NextResponse.json({status: 'rejected'})
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Verificar build de la route**

Run: `npm run build`
Expected: compila; aparece `/api/b2b/register` en el listado de rutas (ƒ).

- [ ] **Step 4: Commit**

```bash
git add app/api/b2b/register/route.ts
git commit -m "feat(b2b): /api/b2b/register route (validate, score, branch)"
```

---

## Task 12: Route handler `/api/b2b/admin/[action]`

**Files:**
- Create: `app/api/b2b/admin/[action]/route.ts`

- [ ] **Step 1: Crear `app/api/b2b/admin/[action]/route.ts`**

```ts
import {NextResponse} from 'next/server'
import {getB2bApplication, updateB2bApplication} from '@/lib/b2b/application'
import {createReviewedB2bCustomer} from '@/lib/b2b/shopify'
import {customerRecover} from '@/lib/shopify'
import {sendEmail} from '@/lib/b2b/email/mailgun'
import {
  approvedWithActivationEmail,
  rejectedEmail,
  moreInfoEmail,
} from '@/lib/b2b/email/templates'
import type {B2bClientType} from '@/types/b2b'

export const runtime = 'nodejs'

const ACTIONS = new Set(['approve', 'reject', 'more_info'])

export async function POST(req: Request, {params}: {params: Promise<{action: string}>}) {
  const {action} = await params
  if (!ACTIONS.has(action)) {
    return NextResponse.json({error: 'unknown_action'}, {status: 404})
  }

  // Auth simple por secreto compartido (header). El Studio lo envía.
  const secret = req.headers.get('x-b2b-admin-secret')
  if (!secret || secret !== process.env.B2B_ADMIN_ACTION_SECRET) {
    return NextResponse.json({error: 'unauthorized'}, {status: 401})
  }

  let body: {id?: string}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({error: 'invalid_json'}, {status: 400})
  }
  if (!body.id) return NextResponse.json({error: 'missing_id'}, {status: 400})

  const app = await getB2bApplication(body.id)
  if (!app) return NextResponse.json({error: 'not_found'}, {status: 404})

  if (action === 'reject') {
    await updateB2bApplication(body.id, {status: 'rejected'})
    await sendEmail({to: app.corporateEmail, ...rejectedEmail(app.companyName)})
    return NextResponse.json({status: 'rejected'})
  }

  if (action === 'more_info') {
    await updateB2bApplication(body.id, {status: 'more_info'})
    await sendEmail({to: app.corporateEmail, ...moreInfoEmail(app.companyName)})
    return NextResponse.json({status: 'more_info'})
  }

  // approve: crea el customer (sin password) + activación por email.
  const result = await createReviewedB2bCustomer({
    email: app.corporateEmail,
    companyName: app.companyName,
    clientType: app.clientType as B2bClientType,
  })
  if (result.error || !result.customerId) {
    return NextResponse.json({error: result.error || 'create_failed'}, {status: 502})
  }
  await updateB2bApplication(body.id, {status: 'approved', shopifyCustomerId: result.customerId})

  // Dispara el flujo de recuperación existente para que el cliente fije contraseña.
  await customerRecover(app.corporateEmail)
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mikmax.com'
  await sendEmail({
    to: app.corporateEmail,
    ...approvedWithActivationEmail(app.companyName, `${site}/login`),
  })
  return NextResponse.json({status: 'approved'})
}
```

> Nota: `customerRecover` envía el email de reset nativo de Shopify; nuestro `approvedWithActivationEmail` es el aviso de bienvenida que apunta a `/login`. Si se prefiere un único email, omitir uno de los dos en implementación.

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Verificar build**

Run: `npm run build`
Expected: compila; aparece `/api/b2b/admin/[action]`.

- [ ] **Step 4: Commit**

```bash
git add app/api/b2b/admin/[action]/route.ts
git commit -m "feat(b2b): /api/b2b/admin/[action] route (approve/reject/more_info)"
```

---

## Task 13: Panel admin en Sanity Studio (document actions)

**Files:**
- Create: `sanity/actions/b2bActions.tsx`
- Modify: `sanity.config.ts` (registrar document actions para `b2bApplication`)

- [ ] **Step 1: Crear `sanity/actions/b2bActions.tsx`**

```tsx
import {useState} from 'react'
import type {DocumentActionComponent, DocumentActionProps} from 'sanity'

// Llama a nuestra API route con el secreto compartido. El secreto se expone al Studio
// vía variable de entorno SANITY_STUDIO_B2B_ADMIN_SECRET (mismo valor que B2B_ADMIN_ACTION_SECRET).
async function callAdmin(action: string, id: string) {
  const site = process.env.SANITY_STUDIO_SITE_URL || ''
  const res = await fetch(`${site}/api/b2b/admin/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-b2b-admin-secret': process.env.SANITY_STUDIO_B2B_ADMIN_SECRET || '',
    },
    body: JSON.stringify({id}),
  })
  return res.json()
}

function makeAction(action: 'approve' | 'reject' | 'more_info', label: string): DocumentActionComponent {
  return (props: DocumentActionProps) => {
    const [loading, setLoading] = useState(false)
    return {
      label: loading ? `${label}…` : label,
      disabled: props.draft != null || loading,
      onHandle: async () => {
        setLoading(true)
        await callAdmin(action, props.id)
        setLoading(false)
        props.onComplete()
      },
    }
  }
}

export const b2bApprove = makeAction('approve', 'Aprobar')
export const b2bReject = makeAction('reject', 'Rechazar')
export const b2bMoreInfo = makeAction('more_info', 'Pedir info')
```

- [ ] **Step 2: Registrar las actions en `sanity.config.ts`**

En la config, dentro de `document.actions`, añadir las acciones solo para `b2bApplication`:

```ts
import {b2bApprove, b2bReject, b2bMoreInfo} from './sanity/actions/b2bActions'

// dentro de defineConfig({ ... document: { actions: (prev, ctx) => ... } })
document: {
  actions: (prev, ctx) =>
    ctx.schemaType === 'b2bApplication'
      ? [...prev, b2bApprove, b2bReject, b2bMoreInfo]
      : prev,
},
```

> Si `sanity.config.ts` ya define `document.actions`, integrar la condición en la función existente en lugar de duplicarla.

- [ ] **Step 3: Documentar env del Studio**

Añadir a `.env.local` (y `.env.example`):
```
SANITY_STUDIO_SITE_URL=https://www.mikmax.com
SANITY_STUDIO_B2B_ADMIN_SECRET=<mismo valor que B2B_ADMIN_ACTION_SECRET>
```

- [ ] **Step 4: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add sanity/actions/b2bActions.tsx sanity.config.ts .env.example
git commit -m "feat(b2b): sanity studio approve/reject/more_info actions"
```

---

## Task 14: Extender `getUser` con metafields B2B (para el gating en Plan B)

**Files:**
- Modify: `lib/shopify.js` (query de `getUser`)

- [ ] **Step 1: Añadir los metafields b2b a la query de `getUser`**

En `lib/shopify.js`, dentro del bloque `customer { ... }` de `getUser`, junto al `metafield(namespace: "custom", key: "birthday")` existente, añadir:

```graphql
b2bValidated: metafield(namespace: "b2b", key: "validated") { value }
b2bClientType: metafield(namespace: "b2b", key: "client_type") { value }
```

> Requiere que esos metafields tengan **visibilidad Storefront** activada en Shopify Admin (ver checklist del spec §14). Si no, devolverán null y el gating de `/b2b/area` caerá a "no B2B".

- [ ] **Step 2: Verificar typecheck y build**

Run: `npm run typecheck && npm run build`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/shopify.js
git commit -m "feat(b2b): expose b2b metafields in getUser for gating"
```

---

## Task 15: Documentar env vars

**Files:**
- Modify: `.env.example` (o crear si no existe)

- [ ] **Step 1: Añadir las nuevas variables**

```
# B2B Fase 1
COMPANIES_HOUSE_API_KEY=
MAILGUN_API_KEY=
MAILGUN_DOMAIN=
MAILGUN_BASE_URL=https://api.mailgun.net
INTERNAL_NOTIFICATION_EMAIL=
B2B_ADMIN_ACTION_SECRET=
SANITY_WRITE_TOKEN=
# Studio
SANITY_STUDIO_SITE_URL=
SANITY_STUDIO_B2B_ADMIN_SECRET=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs(b2b): document new env vars"
```

---

## Cierre del Plan A — verificación final

- [ ] **Suite de tests verde**

Run: `npm test`
Expected: todos los `__tests__/b2b/*` PASS.

- [ ] **Typecheck + lint + build limpios**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: sin errores.

- [ ] **Smoke manual en staging** (requiere env vars del checklist §14 del spec)

1. `POST /api/b2b/register` con un VAT EU válido + email corporativo → respuesta `{status:'approved'}`, customer creado en Shopify con tags `b2b-approved`+tipo y metafields `b2b.*`, doc `b2bApplication` con `status:'approved'`, email de bienvenida recibido.
2. `POST /api/b2b/register` con datos dudosos (sin web, VIES caído simulado) → `{status:'review'}`, doc `pending`, email al cliente + interno.
3. En Sanity Studio → Solicitudes B2B → abrir la pendiente → **Aprobar** → customer creado, doc `approved`, email de activación recibido.
4. `POST /api/b2b/register` con score <50 → `{status:'rejected'}`, email de rechazo.

---

## Self-review (cobertura vs spec)

| Requisito spec | Task |
|---|---|
| Campos del formulario (validación server) | 11 (`isValidPayload`) |
| VIES + neutro ante caída | 4 |
| Companies House (UK) + 40 pts | 5 + 11 (`vatValid = vies \|\| ch`) |
| Email genérico | 3 |
| Coherencia país-VAT | 2 |
| Scoring + umbrales | 6 |
| Ramas APPROVED/REVIEW/REJECTED | 11 |
| Persistencia siempre en Sanity | 7 + 11 (fallback) |
| Customer + tags + metafields | 9 |
| Contraseña: approved vs review/activación | 9 (`createApproved`/`createReviewed`) + 12 |
| Emails Mailgun (4 tipos + interno) | 10 + 11 + 12 |
| Schema b2bApplication + desk | 8 |
| Panel admin approve/reject/more_info | 12 + 13 |
| Metafields para gating | 14 |
| Env vars | 15 |

**Pendiente para Plan B:** landing `/b2b`, `RegisterForm` + `/b2b/register`, wiring login B2B, `/b2b/area` + guard, item de menú.
