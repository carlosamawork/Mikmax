# B2B Fase 3C — Registro global (todos los países → revisión) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir el alta B2B desde cualquier país; UE+UK se validan automáticamente, el resto (no verificable) va SIEMPRE a revisión manual (nunca auto-rechazo).

**Architecture:** Lista ISO completa en el formulario; un helper `isVerifiableCountry` (UE+GB, derivado de `VAT_PREFIX_TO_COUNTRY`); la decisión de `scoreApplication` se fuerza a `review` cuando el país no es verificable.

**Tech Stack:** Next.js 15 · TypeScript · Vitest.

**Spec:** `docs/superpowers/specs/2026-06-17-mikmax-b2b-fase3-design.md`

---

## File structure
```
lib/b2b/countries.ts                 NUEVO  lista ISO completa {code,name}
lib/b2b/validation/vatPrefixes.ts    MOD    + VERIFIABLE_COUNTRIES + isVerifiableCountry
lib/b2b/validation/score.ts          MOD    decision forzada a review si país no verificable
types/b2b.ts                         MOD    ValidationSignals + countryVerifiable
app/api/b2b/register/route.ts        MOD    pasa countryVerifiable + skip VIES en no-verificable
components/B2B/B2bRegisterForm/B2bRegisterForm.tsx  MOD  usa la lista completa
__tests__/b2b/verifiable.test.ts     NUEVO  tests de isVerifiableCountry + decisión
```

---

## Task 1: `isVerifiableCountry` — TDD

**Files:**
- Modify: `lib/b2b/validation/vatPrefixes.ts`
- Test: `__tests__/b2b/verifiable.test.ts`

- [ ] **Step 1: Test que falla** — `__tests__/b2b/verifiable.test.ts`:
```ts
import {describe, it, expect} from 'vitest'
import {isVerifiableCountry, VERIFIABLE_COUNTRIES} from '@/lib/b2b/validation/vatPrefixes'

describe('isVerifiableCountry', () => {
  it('UE y UK son verificables', () => {
    expect(isVerifiableCountry('ES')).toBe(true)
    expect(isVerifiableCountry('gb')).toBe(true) // case-insensitive
    expect(isVerifiableCountry('GR')).toBe(true) // Grecia (mapeada desde prefijo EL)
    expect(isVerifiableCountry('DE')).toBe(true)
  })
  it('fuera de UE+UK no es verificable', () => {
    expect(isVerifiableCountry('US')).toBe(false)
    expect(isVerifiableCountry('CH')).toBe(false)
    expect(isVerifiableCountry('')).toBe(false)
  })
  it('VERIFIABLE_COUNTRIES incluye GB y GR, no US', () => {
    expect(VERIFIABLE_COUNTRIES.has('GB')).toBe(true)
    expect(VERIFIABLE_COUNTRIES.has('GR')).toBe(true)
    expect(VERIFIABLE_COUNTRIES.has('US')).toBe(false)
  })
})
```

- [ ] **Step 2: Ejecutar (falla)** — Run: `npx vitest run __tests__/b2b/verifiable.test.ts` · Expected: FAIL (no export).

- [ ] **Step 3: Añadir a `lib/b2b/validation/vatPrefixes.ts`** (al final, debajo del map existente):
```ts
// Países cuyo VAT se puede validar automáticamente: UE (VIES) + UK (Companies House).
// Son los valores del mapa de prefijos (incluye GR vía EL y GB).
export const VERIFIABLE_COUNTRIES = new Set(Object.values(VAT_PREFIX_TO_COUNTRY))

export function isVerifiableCountry(country: string): boolean {
  return VERIFIABLE_COUNTRIES.has((country || '').toUpperCase())
}
```

- [ ] **Step 4: Ejecutar (pasa)** — Run: `npx vitest run __tests__/b2b/verifiable.test.ts` · Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/b2b/validation/vatPrefixes.ts __tests__/b2b/verifiable.test.ts
git commit -m "feat(b2b): isVerifiableCountry helper (EU + UK)"
```

---

## Task 2: Decisión forzada a review si país no verificable — TDD

**Files:**
- Modify: `types/b2b.ts` (añadir campo a `ValidationSignals`)
- Modify: `lib/b2b/validation/score.ts`
- Test: `__tests__/b2b/score.test.ts` (añadir casos)

- [ ] **Step 1: Añadir el campo al tipo** — en `types/b2b.ts`, en la interfaz `ValidationSignals`, añadir:
```ts
  countryVerifiable: boolean
```

- [ ] **Step 2: Escribir tests nuevos** — añadir a `__tests__/b2b/score.test.ts` un bloque:
```ts
import {scoreApplication} from '@/lib/b2b/validation/score'

const base = {
  corporateEmail: true,
  websitePresent: true,
  countryMatchesVat: false,
  clientTypeDeclared: true,
}

describe('scoreApplication — país verificable vs no verificable', () => {
  it('verificable: usa los umbrales normales', () => {
    expect(scoreApplication({...base, vatValid: true, countryVerifiable: true}).decision).toBe('approved') // 40+20+15+0+10=85
    expect(scoreApplication({...base, vatValid: false, countryVerifiable: true}).decision).toBe('review') // 45
    expect(scoreApplication({vatValid: false, corporateEmail: false, websitePresent: false, countryMatchesVat: false, clientTypeDeclared: true, countryVerifiable: true}).decision).toBe('rejected') // 10
  })
  it('NO verificable: siempre review, sea cual sea el score', () => {
    expect(scoreApplication({...base, vatValid: false, countryVerifiable: false}).decision).toBe('review') // 45 -> review
    expect(scoreApplication({vatValid: false, corporateEmail: false, websitePresent: false, countryMatchesVat: false, clientTypeDeclared: true, countryVerifiable: false}).decision).toBe('review') // 10 -> review (no rejected)
    expect(scoreApplication({...base, vatValid: true, countryVerifiable: false}).decision).toBe('review') // 85 -> review (no approved)
  })
})
```

- [ ] **Step 3: Ejecutar (falla)** — Run: `npx vitest run __tests__/b2b/score.test.ts` · Expected: FAIL (countryVerifiable se ignora).

- [ ] **Step 4: Implementar** — en `lib/b2b/validation/score.ts`, reemplazar el bloque de decisión por:
```ts
  let decision: B2bDecision = 'rejected'
  if (score >= APPROVE_AT) decision = 'approved'
  else if (score >= REVIEW_AT) decision = 'review'

  // País no verificable (fuera de UE+UK): no se puede validar el VAT, así que nunca
  // se auto-aprueba ni se auto-rechaza — siempre a revisión manual.
  if (!signals.countryVerifiable) decision = 'review'

  return {score, decision}
```

- [ ] **Step 5: Ejecutar (pasa)** — Run: `npx vitest run __tests__/b2b/score.test.ts` · Expected: PASS.

- [ ] **Step 6: typecheck** — Run: `npm run typecheck` · Expected: error en `app/api/b2b/register/route.ts` porque `signals` aún no incluye `countryVerifiable` (lo arregla la Task 3). Si ya lo arreglaste, sin errores.

- [ ] **Step 7: Commit**
```bash
git add types/b2b.ts lib/b2b/validation/score.ts __tests__/b2b/score.test.ts
git commit -m "feat(b2b): non-verifiable country always goes to review"
```

---

## Task 3: Wire en el register route

**Files:**
- Modify: `app/api/b2b/register/route.ts`

- [ ] **Step 1: Importar el helper** — añadir junto a los otros imports de validación:
```ts
import {isVerifiableCountry} from '@/lib/b2b/validation/vatPrefixes'
```

- [ ] **Step 2: Calcular verifiable + saltar VIES en no-verificable** — reemplazar el bloque actual (líneas ~48-50):
```ts
  const isUK = input.country.toUpperCase() === 'GB'
  const vies = isUK ? {valid: false, available: false} : await checkVies(input.vatNumber)
  const ch = isUK ? await checkCompaniesHouse(input.vatNumber) : {valid: false, available: false}
```
por:
```ts
  const country = input.country.toUpperCase()
  const verifiable = isVerifiableCountry(country)
  const isUK = country === 'GB'
  // VIES solo para UE (verificable y no UK); Companies House solo UK; resto se salta (neutral).
  const vies = verifiable && !isUK ? await checkVies(input.vatNumber) : {valid: false, available: false}
  const ch = isUK ? await checkCompaniesHouse(input.vatNumber) : {valid: false, available: false}
```

- [ ] **Step 3: Añadir `countryVerifiable` al objeto `signals`** — en el objeto que se pasa a `scoreApplication` (alrededor de la línea 60, junto a `countryMatchesVat`), añadir:
```ts
    countryVerifiable: verifiable,
```

- [ ] **Step 4: typecheck** — Run: `npm run typecheck` · Expected: sin errores.

- [ ] **Step 5: Commit**
```bash
git add "app/api/b2b/register/route.ts"
git commit -m "feat(b2b): pass country verifiability into the decision"
```

---

## Task 4: Lista ISO completa de países

**Files:**
- Create: `lib/b2b/countries.ts`
- Modify: `components/B2B/B2bRegisterForm/B2bRegisterForm.tsx`

- [ ] **Step 1: Crear `lib/b2b/countries.ts`** con la lista ISO-3166-1 alpha-2 completa, ordenada por nombre. Incluir las 249 entradas estándar. Estructura (extracto — incluir TODAS):
```ts
// Lista ISO-3166-1 alpha-2. Países UE+UK se validan automáticamente; el resto va a revisión.
export const COUNTRIES: {code: string; name: string}[] = [
  {code: 'AF', name: 'Afghanistan'},
  {code: 'AL', name: 'Albania'},
  {code: 'DE', name: 'Alemania'},
  {code: 'AD', name: 'Andorra'},
  // … (lista completa ISO-3166-1 alpha-2, ordenada alfabéticamente por name) …
  {code: 'ES', name: 'España'},
  {code: 'US', name: 'Estados Unidos'},
  {code: 'FR', name: 'France'},
  {code: 'GB', name: 'United Kingdom'},
  {code: 'CH', name: 'Suiza'},
  // … resto …
]
```
> El ejecutor debe pegar la lista ISO completa (no abreviar). Puede generarla con `Intl.DisplayNames(['es'], {type: 'region'})` en un script de un solo uso, o copiar una lista canónica. Requisito: ≥ 200 entradas, cada una `{code: ISO-2, name}`, sin duplicados, ordenada por `name`, e incluir obligatoriamente ES, GB, US, y todos los de UE.

- [ ] **Step 2: Usar la lista en el form** — en `components/B2B/B2bRegisterForm/B2bRegisterForm.tsx`:
  1. Borrar el `const COUNTRIES = [...]` local (las 9 entradas).
  2. Importar: `import {COUNTRIES} from '@/lib/b2b/countries'`
  3. El `<select>` que mapea `COUNTRIES` no cambia (sigue `COUNTRIES.map(...)`). `EMPTY.country` sigue `'ES'`.

- [ ] **Step 3: typecheck + prettier** — Run: `npm run typecheck` y `npx prettier --check lib/b2b/countries.ts components/B2B/B2bRegisterForm/B2bRegisterForm.tsx` · Expected: limpios.

- [ ] **Step 4: Verificación manual** — `npm run dev` (lo lanza el usuario): el selector de país en `/mikmax-for-business/register` muestra la lista completa; ES por defecto.

- [ ] **Step 5: Commit**
```bash
git add lib/b2b/countries.ts components/B2B/B2bRegisterForm/B2bRegisterForm.tsx
git commit -m "feat(b2b): full ISO country list in the register form"
```

---

## Self-review (cobertura vs spec, sub-feature C)

| Requisito spec | Task |
|---|---|
| Lista ISO completa en el form | 4 |
| Concepto "país verificable" (UE+GB) | 1 |
| País no verificable → siempre review | 2, 3 |
| País verificable → umbrales normales | 2 |
| No-verificable nunca auto-aprueba (sin VAT) | 2 (regla `!verifiable` va al final, override) |
| Ficha interna con país+score (ya existe) | — (sin cambios) |
| Tests de helper + decisión | 1, 2 |

**Nota:** los emails y el panel Sanity no cambian — un alta no-verificable cae en `review`, que ya guarda en Sanity + email "estamos revisando" + ficha interna (flujo Fase 1 intacto).
