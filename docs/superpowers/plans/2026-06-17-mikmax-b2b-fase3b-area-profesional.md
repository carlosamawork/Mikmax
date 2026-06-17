# B2B Fase 3B — Área profesional rica (Sanity, por grupo) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La página `mikmax-for-business/area` muestra política comercial, condiciones de compra y fiscalidad/exención — distintas por grupo (reseller vs designer) y editables desde Sanity, además de la condición y el contacto.

**Architecture:** Un singleton Sanity `b2bArea` con un bloque por grupo (rich text). Una query con tag de revalidación. La página detecta el grupo del cliente y renderiza su bloque con PortableText.

**Tech Stack:** Sanity v3 · Next.js 15 · @portabletext/react.

**Spec:** `docs/superpowers/specs/2026-06-17-mikmax-b2b-fase3-design.md`

> Patrones del proyecto: singletons en `sanity/schemas/singletons/` (modelo: `mikmaxForBusiness.ts`, `settings.ts`); rich text = `type: 'body'` (`sanity/schemas/blocks/body.tsx`); desk en `sanity/desk/` + `LOCKED_DOCUMENT_TYPES` en `sanity/constants.ts`; el webhook de revalidación ya etiqueta por `_type` automáticamente (`app/api/revalidate/route.ts`), así que el tag `b2bArea` se invalida solo al publicar.

---

## File structure
```
sanity/schemas/objects/b2bAreaGroup.ts   NUEVO  object: política/condiciones/fiscalidad/contacto por grupo
sanity/schemas/singletons/b2bArea.ts      NUEVO  singleton: intro + reseller + designer
sanity/schemas/index.ts                   MOD    registrar ambos
sanity/constants.ts                        MOD    LOCKED_DOCUMENT_TYPES += 'b2bArea'
sanity/desk/b2bAreaStructure.ts            NUEVO  item de menú del Studio
sanity/desk/index.ts                       MOD    añadir el structure + hiddenDocTypes
sanity/queries/queries/b2bArea.ts          NUEVO  getB2bArea() con tag 'b2bArea'
sanity/types/...                           MOD    tipo B2bAreaData
app/(frontend)/mikmax-for-business/area/page.tsx       MOD  render por grupo + PortableText
app/(frontend)/mikmax-for-business/area/Area.module.scss  MOD  estilos de las secciones
```

---

## Task 1: Schema `b2bAreaGroup` + singleton `b2bArea`

**REQUIRED SUB-SKILL:** usa **sanity-schema-builder** para esta tarea (registro de singleton, desk, hiddenDocTypes siguiendo los templates del proyecto).

**Files:** Create `sanity/schemas/objects/b2bAreaGroup.ts`, `sanity/schemas/singletons/b2bArea.ts`, `sanity/desk/b2bAreaStructure.ts`; Modify `sanity/schemas/index.ts`, `sanity/constants.ts`, `sanity/desk/index.ts`.

- [ ] **Step 1: Object `b2bAreaGroup`** — `sanity/schemas/objects/b2bAreaGroup.ts`:
```ts
import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'b2bAreaGroup',
  title: 'Condiciones de grupo',
  type: 'object',
  fields: [
    defineField({name: 'commercialPolicy', title: 'Política comercial', type: 'body'}),
    defineField({name: 'purchaseConditions', title: 'Condiciones de compra', type: 'body'}),
    defineField({name: 'taxInfo', title: 'Fiscalidad / exención IVA', type: 'body'}),
    defineField({name: 'contactName', title: 'Contacto comercial (nombre)', type: 'string'}),
    defineField({name: 'contactEmail', title: 'Contacto comercial (email)', type: 'string'}),
  ],
})
```

- [ ] **Step 2: Singleton `b2bArea`** — `sanity/schemas/singletons/b2bArea.ts`:
```ts
import {defineType, defineField} from 'sanity'

export default defineType({
  name: 'b2bArea',
  title: 'Área profesional B2B',
  type: 'document',
  fields: [
    defineField({name: 'intro', title: 'Introducción (compartida)', type: 'body'}),
    defineField({name: 'reseller', title: 'Reseller', type: 'b2bAreaGroup'}),
    defineField({name: 'designer', title: 'Interior Designer', type: 'b2bAreaGroup'}),
  ],
  preview: {prepare: () => ({title: 'Área profesional B2B'})},
})
```

- [ ] **Step 3: Registrar en `sanity/schemas/index.ts`** — importar ambos y añadirlos a los arrays correspondientes (el singleton al grupo de documents/singletons, el object al de objects), siguiendo cómo está registrado `mikmaxForBusiness`.

- [ ] **Step 4: `LOCKED_DOCUMENT_TYPES`** — en `sanity/constants.ts`, añadir `'b2bArea'`:
```ts
export const LOCKED_DOCUMENT_TYPES = ['settings', 'home', 'media.tag', 'mikmaxForBusiness', 'b2bArea']
```

- [ ] **Step 5: Desk structure** — `sanity/desk/b2bAreaStructure.ts` (modelar en `mikmaxForBusinessStructure.ts`):
```ts
import type {StructureBuilder} from 'sanity/structure'

export default function b2bAreaStructure(S: StructureBuilder) {
  return S.listItem()
    .title('Área profesional B2B')
    .child(S.editor().title('Área profesional B2B').schemaType('b2bArea').documentId('b2bArea'))
}
```
Y en `sanity/desk/index.ts`: importar `b2bAreaStructure`, añadirlo a la lista de items (junto a `mikmaxForBusinessStructure(S)`), y asegurarse de que `b2bArea` queda fuera de la lista genérica vía el filtro `hiddenDocTypes` (añadir `'b2bArea'` donde se listan los tipos ocultos).

- [ ] **Step 6: Verificar el Studio** — Run: `npm run dev` (usuario). En `/admin` aparece "Área profesional B2B" como singleton editable, con secciones Reseller / Interior Designer, cada una con política / condiciones / fiscalidad / contacto. typecheck: `npm run typecheck` sin errores.

- [ ] **Step 7: Commit**
```bash
git add sanity/schemas/objects/b2bAreaGroup.ts sanity/schemas/singletons/b2bArea.ts sanity/schemas/index.ts sanity/constants.ts sanity/desk/b2bAreaStructure.ts sanity/desk/index.ts
git commit -m "feat(b2b): b2bArea singleton (per-group commercial terms) + studio"
```

---

## Task 2: Query `getB2bArea()` + tipo

**Files:**
- Create: `sanity/queries/queries/b2bArea.ts`
- Modify: `sanity/types/` (añadir `B2bAreaData`)

- [ ] **Step 1: Tipo** — en `sanity/types/` (donde viven los tipos de respuestas GROQ; sigue el barrel existente), añadir:
```ts
import type {PortableTextBlock} from '@portabletext/types'

export interface B2bAreaGroupData {
  commercialPolicy?: PortableTextBlock[]
  purchaseConditions?: PortableTextBlock[]
  taxInfo?: PortableTextBlock[]
  contactName?: string
  contactEmail?: string
}

export interface B2bAreaData {
  intro?: PortableTextBlock[]
  reseller?: B2bAreaGroupData
  designer?: B2bAreaGroupData
}
```
(Si el proyecto ya tiene un tipo para `body`, úsalo en vez de `PortableTextBlock[]`.)

- [ ] **Step 2: Query** — `sanity/queries/queries/b2bArea.ts` (modelar en `mikmaxForBusiness.ts`):
```ts
import {groq} from 'next-sanity'
import {client} from '..'
import type {B2bAreaData} from '@/sanity/types'

const groupProjection = groq`{
  commercialPolicy,
  purchaseConditions,
  taxInfo,
  contactName,
  contactEmail
}`

export async function getB2bArea(): Promise<B2bAreaData | null> {
  return client.fetch<B2bAreaData | null>(
    groq`*[_type == "b2bArea"][0]{
      intro,
      "reseller": reseller${groupProjection},
      "designer": designer${groupProjection}
    }`,
    {},
    {next: {tags: ['b2bArea'], revalidate: 3600}},
  )
}
```

- [ ] **Step 3: typecheck** — Run: `npm run typecheck` · Expected: sin errores.

- [ ] **Step 4: Registrar el tag** — en el CLAUDE.md "Tags activos hoy", añadir `b2bArea` a la lista (documentación). No hace falta tocar `app/api/revalidate/route.ts` (etiqueta por `_type` automáticamente).

- [ ] **Step 5: Commit**
```bash
git add sanity/queries/queries/b2bArea.ts sanity/types CLAUDE.md
git commit -m "feat(b2b): getB2bArea query + type + revalidate tag"
```

---

## Task 3: Render del área por grupo

**Files:**
- Modify: `app/(frontend)/mikmax-for-business/area/page.tsx`
- Modify: `app/(frontend)/mikmax-for-business/area/Area.module.scss`

> Antes de escribir: localiza el componente PortableText que el proyecto ya usa para renderizar `body` (ej. en páginas legales o page builder). Grep: `grep -rn "PortableText\|@portabletext/react" components/ app/`. Reutilízalo (NO crees uno nuevo). Si hace falta afinarlo, usa la skill **portabletext-renderer**.

- [ ] **Step 1: Reescribir `area/page.tsx`**:
```tsx
import {getCurrentCustomer} from '@/lib/auth/customer'
import {getB2bArea} from '@/sanity/queries/queries/b2bArea'
import s from './Area.module.scss'
// import del componente PortableText existente del proyecto (ajusta la ruta al real):
import RichText from '@/components/Common/RichText' // ← usa el componente real localizado en el paso previo

export default async function B2bAreaPage() {
  const session = await getCurrentCustomer()
  const isDesigner = session?.customer.b2bClientType?.value === 'designer'
  const condition = isDesigner ? 'Interior Designer' : 'Reseller'

  const data = await getB2bArea()
  const group = isDesigner ? data?.designer : data?.reseller
  const contactEmail = group?.contactEmail || 'business@mikmax.com'

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
          <dd>
            {group?.contactName ? `${group.contactName} · ` : ''}
            <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </dd>
        </div>
      </dl>

      {data?.intro && (
        <section className={s.section}>
          <RichText value={data.intro} />
        </section>
      )}
      {group?.commercialPolicy && (
        <section className={s.section}>
          <h2 className={s.heading}>Política comercial</h2>
          <RichText value={group.commercialPolicy} />
        </section>
      )}
      {group?.purchaseConditions && (
        <section className={s.section}>
          <h2 className={s.heading}>Condiciones de compra</h2>
          <RichText value={group.purchaseConditions} />
        </section>
      )}
      {group?.taxInfo && (
        <section className={s.section}>
          <h2 className={s.heading}>Fiscalidad</h2>
          <RichText value={group.taxInfo} />
        </section>
      )}

      {!group && (
        <p className={s.note}>
          Tus condiciones comerciales se aplican automáticamente en el carrito y el checkout.
        </p>
      )}
    </main>
  )
}
```
> Ajusta el import y la prop del componente PortableText al real del proyecto (puede ser `<PortableText value={...} components={...}/>` directo de `@portabletext/react`). El resto de la lógica (grupo, fallbacks) no cambia.

- [ ] **Step 2: SCSS** — en `Area.module.scss`, añadir estilos mobile-first para `.section` y `.heading` (margen entre secciones, tipografía de heading), anidados según el HTML. Reutiliza variables del proyecto.

- [ ] **Step 3: typecheck + prettier** — Run: `npm run typecheck` y `npx prettier --check "app/(frontend)/mikmax-for-business/area/page.tsx"` · Expected: limpios.

- [ ] **Step 4: Verificación** — Smoke manual: crea contenido en `b2bArea` (reseller y designer distintos) en el Studio; logueado como reseller ves su bloque, como designer el suyo; sin doc en Sanity → versión mínima (condición + contacto + nota).

- [ ] **Step 5: Commit**
```bash
git add "app/(frontend)/mikmax-for-business/area/page.tsx" "app/(frontend)/mikmax-for-business/area/Area.module.scss"
git commit -m "feat(b2b): rich professional area per group (policy/conditions/tax/contact)"
```

---

## Self-review (cobertura vs spec, sub-feature B)

| Requisito spec | Task |
|---|---|
| Condiciones distintas por grupo (Sanity) | 1 (schema), 3 (selección por grupo) |
| Política comercial / condiciones / fiscalidad (rich text) | 1, 3 |
| Contacto comercial (por grupo) | 1, 3 |
| Condición (Reseller / Interior Designer) | 3 |
| Editable desde Studio (singleton) | 1 |
| Query con tag de revalidación | 2 |
| Degradar sin doc → área mínima | 3 (fallbacks) |

**Nota ejecutor:** localiza y REUTILIZA el componente PortableText existente; no crees uno nuevo. La revalidación de `b2bArea` funciona sola (el webhook etiqueta por `_type`); solo hay que documentar el tag.
