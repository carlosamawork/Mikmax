/**
 * scripts/migrate-i18n.ts
 *
 * Migrates plain scalar values (string | text | body) to the
 * sanity-plugin-internationalized-array shape:
 *   [{_key: 'en', _type: '<valueTypeName>', value: <original>}]
 *
 * VALUE TYPE NAMES — derived from createValueSchemaTypeName.ts in the plugin:
 *   export function createValueSchemaTypeName(schemaType) { return `${schemaType.name}Value` }
 * So: 'string' → 'internationalizedArrayStringValue'
 *     'text'   → 'internationalizedArrayTextValue'
 *     'body'   → 'internationalizedArrayBodyValue'
 *
 * USAGE
 *   Dry-run (default):   npx ts-node scripts/migrate-i18n.ts
 *   Execute:             npx ts-node scripts/migrate-i18n.ts --execute
 *   Override dataset:    npx ts-node scripts/migrate-i18n.ts --dataset=staging
 *
 * SAFETY
 *   - Dry-run by default. Writes nothing without --execute.
 *   - Idempotent: values already in internationalized-array shape (array whose
 *     items are objects with a _key) are skipped.
 *   - store.* fields on product documents are never touched.
 *   - Only explicit, path-based transforms per type — no global name-based wrapping.
 */

import {createClient} from '@sanity/client'

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const EXECUTE = process.argv.includes('--execute')

const datasetArg = process.argv.find((a) => a.startsWith('--dataset='))
const DATASET = datasetArg
  ? datasetArg.split('=')[1]
  : process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production'

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

console.log('='.repeat(72))
console.log(
  EXECUTE
    ? '  MODE: EXECUTE — data will be mutated'
    : '  MODE: DRY RUN — no data will be written',
)
console.log(`  Dataset: ${DATASET}`)
console.log('='.repeat(72))
if (!EXECUTE) {
  console.log('  Run with --execute to apply changes.\n')
}

// ---------------------------------------------------------------------------
// Sanity client
// ---------------------------------------------------------------------------

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: DATASET,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
})

// ---------------------------------------------------------------------------
// Value-type name constants
// (rule: `${schemaType.name}Value` — see createValueSchemaTypeName.ts)
// ---------------------------------------------------------------------------

const STRING_VALUE_TYPE = 'internationalizedArrayStringValue'
const TEXT_VALUE_TYPE = 'internationalizedArrayTextValue'
const BODY_VALUE_TYPE = 'internationalizedArrayBodyValue'

// ---------------------------------------------------------------------------
// Wrapping helpers
// ---------------------------------------------------------------------------

type ValueType =
  | typeof STRING_VALUE_TYPE
  | typeof TEXT_VALUE_TYPE
  | typeof BODY_VALUE_TYPE

/** Returns true if the value is already in internationalized-array shape. */
function isAlreadyWrapped(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    '_key' in (value[0] as object)
  )
}

/**
 * Wraps a scalar value (string | text) or PortableText block array (body)
 * into the internationalized-array shape for the 'en' locale.
 * Returns null if the value is already wrapped or nil.
 */
function wrapValue(value: unknown, valueType: ValueType): unknown[] | null {
  if (value === null || value === undefined) return null
  if (isAlreadyWrapped(value)) return null // already wrapped — skip
  return [{_key: 'en', _type: valueType, value}]
}

// ---------------------------------------------------------------------------
// Low-level path utilities
// ---------------------------------------------------------------------------

/** Safely read a nested value from an object using dot-notation path segments. */
function getIn(obj: Record<string, unknown>, segments: string[]): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return segments.reduce<any>((cur, seg) => (cur != null ? cur[seg] : undefined), obj)
}

/** Safely set a nested value, returning a shallow-cloned copy of the root. */
function setIn(
  obj: Record<string, unknown>,
  segments: string[],
  value: unknown,
): Record<string, unknown> {
  if (segments.length === 0) return obj
  const [head, ...tail] = segments
  const existing = (obj[head] ?? {}) as Record<string, unknown>
  return {
    ...obj,
    [head]: tail.length === 0 ? value : setIn(existing, tail, value),
  }
}

// ---------------------------------------------------------------------------
// Field descriptor type
// ---------------------------------------------------------------------------

interface ScalarField {
  /** Dot-notation path relative to the document (or block object) root */
  path: string
  /** The target value type for wrapping */
  valueType: ValueType
}

// ---------------------------------------------------------------------------
// Transform helpers
// ---------------------------------------------------------------------------

/**
 * Apply a list of scalar fields to a plain object (document or embedded object).
 * Returns {patched, changes} where `patched` is the mutated copy and
 * `changes` is the number of fields that were actually wrapped.
 */
function applyScalarFields(
  obj: Record<string, unknown>,
  fields: ScalarField[],
): {patched: Record<string, unknown>; changes: number} {
  let patched = {...obj}
  let changes = 0
  for (const {path, valueType} of fields) {
    const segments = path.split('.')
    const current = getIn(patched, segments)
    const wrapped = wrapValue(current, valueType)
    if (wrapped !== null) {
      patched = setIn(patched, segments, wrapped) as Record<string, unknown>
      changes++
    }
  }
  return {patched, changes}
}

/**
 * Walk an array of objects (e.g. pageBuilder blocks, legalPage sections),
 * apply transforms to each element based on a per-`_type` field map, and
 * return a new array + total change count.
 */
function transformArrayByType(
  arr: unknown[],
  fieldsByType: Record<string, ScalarField[]>,
): {patched: unknown[]; changes: number} {
  let totalChanges = 0
  const patched = arr.map((item) => {
    if (typeof item !== 'object' || item === null) return item
    const block = item as Record<string, unknown>
    const blockType = block['_type'] as string | undefined
    if (!blockType) return block
    const fields = fieldsByType[blockType]
    if (!fields || fields.length === 0) return block
    const {patched: patchedBlock, changes} = applyScalarFields(block, fields)
    totalChanges += changes
    return patchedBlock
  })
  return {patched, changes: totalChanges}
}

// ---------------------------------------------------------------------------
// SEO helper — shared by look, set, legalPage, etc.
// seo.page type: title (internationalizedArrayString), description (internationalizedArrayText)
// seo (global, settings): title (internationalizedArrayString), description (internationalizedArrayText)
// ---------------------------------------------------------------------------

const SEO_PAGE_FIELDS: ScalarField[] = [
  {path: 'title', valueType: STRING_VALUE_TYPE},
  {path: 'description', valueType: TEXT_VALUE_TYPE},
]

/**
 * Applies SEO-page wrapping to a `seo` sub-object embedded in `doc`.
 * Returns {patched, changes}.
 */
function transformSeoPage(
  doc: Record<string, unknown>,
  seoKey = 'seo',
): {patched: Record<string, unknown>; changes: number} {
  const seoObj = doc[seoKey] as Record<string, unknown> | undefined
  if (!seoObj || typeof seoObj !== 'object') return {patched: doc, changes: 0}
  const {patched: patchedSeo, changes} = applyScalarFields(seoObj, SEO_PAGE_FIELDS)
  if (changes === 0) return {patched: doc, changes: 0}
  return {patched: {...doc, [seoKey]: patchedSeo}, changes}
}

// ---------------------------------------------------------------------------
// pageBuilder block scalar fields
// Used by: home, page, mikmaxForBusiness
// ---------------------------------------------------------------------------

/** Scalar fields inside a twoColumnCell object (body + caption). */
const TWO_COLUMN_CELL_FIELDS: ScalarField[] = [
  {path: 'body', valueType: BODY_VALUE_TYPE},
  {path: 'caption', valueType: STRING_VALUE_TYPE},
]

/**
 * Full pageBuilder transform: handles all blocks including those with
 * nested arrays (heroCampaign.slides[].title, featuredSection.slides[].title)
 * and nested objects (twoColumn.left / right → twoColumnCell).
 */
function transformPageBuilder(
  pageBuilder: unknown[],
): {patched: unknown[]; changes: number} {
  let totalChanges = 0

  const patched = pageBuilder.map((item) => {
    if (typeof item !== 'object' || item === null) return item
    let block = item as Record<string, unknown>
    const blockType = block['_type'] as string | undefined

    // --- block.heroCampaign: slides[].title ---
    if (blockType === 'block.heroCampaign') {
      const slides = block['slides'] as unknown[] | undefined
      if (Array.isArray(slides)) {
        const {patched: patchedSlides, changes} = transformArrayByType(slides, {
          heroCampaignSlide: [{path: 'title', valueType: STRING_VALUE_TYPE}],
        })
        if (changes > 0) {
          block = {...block, slides: patchedSlides}
          totalChanges += changes
        }
      }
      return block
    }

    // --- block.campaignImageVideo: headline ---
    if (blockType === 'block.campaignImageVideo') {
      const {patched: patchedBlock, changes} = applyScalarFields(block, [
        {path: 'headline', valueType: STRING_VALUE_TYPE},
      ])
      totalChanges += changes
      return patchedBlock
    }

    // --- block.featuredSection: slides[].title ---
    if (blockType === 'block.featuredSection') {
      const slides = block['slides'] as unknown[] | undefined
      if (Array.isArray(slides)) {
        const {patched: patchedSlides, changes} = transformArrayByType(slides, {
          featuredSlide: [{path: 'title', valueType: STRING_VALUE_TYPE}],
        })
        if (changes > 0) {
          block = {...block, slides: patchedSlides}
          totalChanges += changes
        }
      }
      return block
    }

    // --- block.imageWithProduct: feature.title ---
    if (blockType === 'block.imageWithProduct') {
      const {patched: patchedBlock, changes} = applyScalarFields(block, [
        {path: 'feature.title', valueType: STRING_VALUE_TYPE},
      ])
      totalChanges += changes
      return patchedBlock
    }

    // --- block.productModule: title ---
    if (blockType === 'block.productModule') {
      const {patched: patchedBlock, changes} = applyScalarFields(block, [
        {path: 'title', valueType: STRING_VALUE_TYPE},
      ])
      totalChanges += changes
      return patchedBlock
    }

    // --- block.lookModule: title ---
    if (blockType === 'block.lookModule') {
      const {patched: patchedBlock, changes} = applyScalarFields(block, [
        {path: 'title', valueType: STRING_VALUE_TYPE},
      ])
      totalChanges += changes
      return patchedBlock
    }

    // --- block.setModule: title, subtitle ---
    if (blockType === 'block.setModule') {
      const {patched: patchedBlock, changes} = applyScalarFields(block, [
        {path: 'title', valueType: STRING_VALUE_TYPE},
        {path: 'subtitle', valueType: STRING_VALUE_TYPE},
      ])
      totalChanges += changes
      return patchedBlock
    }

    // --- block.richText: body ---
    if (blockType === 'block.richText') {
      const {patched: patchedBlock, changes} = applyScalarFields(block, [
        {path: 'body', valueType: BODY_VALUE_TYPE},
      ])
      totalChanges += changes
      return patchedBlock
    }

    // --- block.twoColumn: left.body, left.caption, right.body, right.caption ---
    if (blockType === 'block.twoColumn') {
      let sideChanges = 0
      for (const side of ['left', 'right'] as const) {
        const cell = block[side] as Record<string, unknown> | undefined
        if (cell && typeof cell === 'object') {
          const {patched: patchedCell, changes: cellChanges} = applyScalarFields(
            cell,
            TWO_COLUMN_CELL_FIELDS,
          )
          if (cellChanges > 0) {
            block = {...block, [side]: patchedCell}
            sideChanges += cellChanges
          }
        }
      }
      totalChanges += sideChanges
      return block
    }

    // --- block.downloadButton: title, description ---
    if (blockType === 'block.downloadButton') {
      const {patched: patchedBlock, changes} = applyScalarFields(block, [
        {path: 'title', valueType: STRING_VALUE_TYPE},
        {path: 'description', valueType: TEXT_VALUE_TYPE},
      ])
      totalChanges += changes
      return patchedBlock
    }

    // Unknown block type — pass through unchanged
    return block
  })

  return {patched, changes: totalChanges}
}

// ---------------------------------------------------------------------------
// Utility: extract only the top-level keys that changed
// ---------------------------------------------------------------------------

/**
 * Given original doc and patched doc, returns an object containing only
 * the top-level keys whose values differ. Used to build the minimum patch.
 */
function buildTopLevelPatch(
  original: Record<string, unknown>,
  patched: Record<string, unknown>,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {}
  for (const key of Object.keys(patched)) {
    if (patched[key] !== original[key]) {
      patch[key] = patched[key]
    }
  }
  return patch
}

// ---------------------------------------------------------------------------
// Per-document transform functions
// ---------------------------------------------------------------------------

/** legalPage */
function transformLegalPage(doc: Record<string, unknown>): {
  patch: Record<string, unknown>
  changes: number
} {
  let patched = {...doc}
  let totalChanges = 0

  // top-level title (internationalizedArrayString)
  const wrappedTitle = wrapValue(patched['title'], STRING_VALUE_TYPE)
  if (wrappedTitle) {
    patched = {...patched, title: wrappedTitle}
    totalChanges++
  }

  // top-level seo (seo.page — title string + description text)
  const {patched: withSeo, changes: seoChanges} = transformSeoPage(patched, 'seo')
  if (seoChanges > 0) {
    patched = withSeo
    totalChanges += seoChanges
  }

  // sections[] — each section has: title (string), body (body), seo (seo.page)
  const sections = patched['sections'] as unknown[] | undefined
  if (Array.isArray(sections)) {
    let sectionChanges = 0
    const patchedSections = sections.map((s) => {
      if (typeof s !== 'object' || s === null) return s
      let section = s as Record<string, unknown>

      // section.title
      const wrappedSectionTitle = wrapValue(section['title'], STRING_VALUE_TYPE)
      if (wrappedSectionTitle) {
        section = {...section, title: wrappedSectionTitle}
        sectionChanges++
      }

      // section.body
      const wrappedBody = wrapValue(section['body'], BODY_VALUE_TYPE)
      if (wrappedBody) {
        section = {...section, body: wrappedBody}
        sectionChanges++
      }

      // section.seo (seo.page)
      const {patched: sectionWithSeo, changes: secSeoChanges} = transformSeoPage(section, 'seo')
      if (secSeoChanges > 0) {
        section = sectionWithSeo
        sectionChanges += secSeoChanges
      }

      return section
    })
    if (sectionChanges > 0) {
      patched = {...patched, sections: patchedSections}
      totalChanges += sectionChanges
    }
  }

  return {patch: buildTopLevelPatch(doc, patched), changes: totalChanges}
}

/**
 * product — ONLY propiedadesMaterial, recomendacionesLavado, usoRecomendado.
 * store.* is NEVER touched (Shopify-synced, read-only).
 */
function transformProduct(doc: Record<string, unknown>): {
  patch: Record<string, unknown>
  changes: number
} {
  const FIELDS: ScalarField[] = [
    {path: 'propiedadesMaterial', valueType: BODY_VALUE_TYPE},
    {path: 'recomendacionesLavado', valueType: BODY_VALUE_TYPE},
    {path: 'usoRecomendado', valueType: BODY_VALUE_TYPE},
  ]
  const {patched, changes} = applyScalarFields(doc, FIELDS)
  return {patch: buildTopLevelPatch(doc, patched), changes}
}

/** look */
function transformLook(doc: Record<string, unknown>): {
  patch: Record<string, unknown>
  changes: number
} {
  let patched = {...doc}
  let totalChanges = 0

  const FIELDS: ScalarField[] = [
    {path: 'title', valueType: STRING_VALUE_TYPE},
    {path: 'description', valueType: TEXT_VALUE_TYPE},
    {path: 'propiedadesMaterial', valueType: BODY_VALUE_TYPE},
    {path: 'recomendacionesLavado', valueType: BODY_VALUE_TYPE},
    {path: 'usoRecomendado', valueType: BODY_VALUE_TYPE},
  ]
  const {patched: withFields, changes: fieldChanges} = applyScalarFields(patched, FIELDS)
  if (fieldChanges > 0) {
    patched = withFields
    totalChanges += fieldChanges
  }

  // seo (seo.page)
  const {patched: withSeo, changes: seoChanges} = transformSeoPage(patched, 'seo')
  if (seoChanges > 0) {
    patched = withSeo
    totalChanges += seoChanges
  }

  return {patch: buildTopLevelPatch(doc, patched), changes: totalChanges}
}

/** set */
function transformSet(doc: Record<string, unknown>): {
  patch: Record<string, unknown>
  changes: number
} {
  let patched = {...doc}
  let totalChanges = 0

  const FIELDS: ScalarField[] = [
    {path: 'title', valueType: STRING_VALUE_TYPE},
    {path: 'description', valueType: TEXT_VALUE_TYPE},
    {path: 'propiedadesMaterial', valueType: BODY_VALUE_TYPE},
    {path: 'recomendacionesLavado', valueType: BODY_VALUE_TYPE},
    {path: 'usoRecomendado', valueType: BODY_VALUE_TYPE},
  ]
  const {patched: withFields, changes: fieldChanges} = applyScalarFields(patched, FIELDS)
  if (fieldChanges > 0) {
    patched = withFields
    totalChanges += fieldChanges
  }

  // seo (seo.page)
  const {patched: withSeo, changes: seoChanges} = transformSeoPage(patched, 'seo')
  if (seoChanges > 0) {
    patched = withSeo
    totalChanges += seoChanges
  }

  return {patch: buildTopLevelPatch(doc, patched), changes: totalChanges}
}

/**
 * b2bArea singleton
 *   intro                                    internationalizedArrayBody
 *   reseller.commercialPolicy                internationalizedArrayBody
 *   reseller.purchaseConditions              internationalizedArrayBody
 *   reseller.taxInfo                         internationalizedArrayBody
 *   designer.commercialPolicy                internationalizedArrayBody
 *   designer.purchaseConditions              internationalizedArrayBody
 *   designer.taxInfo                         internationalizedArrayBody
 * NOT: contactName, contactEmail (plain strings)
 */
function transformB2bArea(doc: Record<string, unknown>): {
  patch: Record<string, unknown>
  changes: number
} {
  let patched = {...doc}
  let totalChanges = 0

  // top-level intro
  const wrappedIntro = wrapValue(patched['intro'], BODY_VALUE_TYPE)
  if (wrappedIntro) {
    patched = {...patched, intro: wrappedIntro}
    totalChanges++
  }

  // reseller and designer — b2bAreaGroup objects
  const GROUP_FIELDS: ScalarField[] = [
    {path: 'commercialPolicy', valueType: BODY_VALUE_TYPE},
    {path: 'purchaseConditions', valueType: BODY_VALUE_TYPE},
    {path: 'taxInfo', valueType: BODY_VALUE_TYPE},
  ]
  for (const groupKey of ['reseller', 'designer'] as const) {
    const group = patched[groupKey] as Record<string, unknown> | undefined
    if (!group || typeof group !== 'object') continue
    const {patched: patchedGroup, changes} = applyScalarFields(group, GROUP_FIELDS)
    if (changes > 0) {
      patched = {...patched, [groupKey]: patchedGroup}
      totalChanges += changes
    }
  }

  return {patch: buildTopLevelPatch(doc, patched), changes: totalChanges}
}

/** post */
function transformPost(doc: Record<string, unknown>): {
  patch: Record<string, unknown>
  changes: number
} {
  const FIELDS: ScalarField[] = [
    {path: 'title', valueType: STRING_VALUE_TYPE},
    {path: 'content', valueType: BODY_VALUE_TYPE},
  ]
  const {patched, changes} = applyScalarFields(doc, FIELDS)
  return {patch: buildTopLevelPatch(doc, patched), changes}
}

/**
 * settings singleton
 *
 * Internationalised fields confirmed from schemas:
 *   banner.text                                string
 *   footer.newsletter.title                    string
 *   footer.newsletter.body                     text
 *   footer.newsletter.placeholder              string
 *   footer.newsletter.buttonLabel              string
 *   footer.columns[].title                     string  (footerColumn/footerColumnShop/footerColumnSocial all have it)
 *   footer.regions[].label                     string
 *   newsletterPopup.heading                    string
 *   newsletterPopup.legalText                  string
 *   notFoundPage.title                         string
 *   notFoundPage.body                          text
 *   menu.links[]{_type=menuGroup}.label        string
 *   menu.links[]{_type=menuShop}.label         string
 *   seo.title                                  string  (global seo object)
 *   seo.description                            text
 *
 * NOT internationalized (plain strings, skip):
 *   menu.links[]{linkInternal}.title
 *   menu.links[]{linkExternal}.title
 *   footer.regions[].code / currency
 *   banner.url
 */
function transformSettings(doc: Record<string, unknown>): {
  patch: Record<string, unknown>
  changes: number
} {
  let patched = {...doc}
  let totalChanges = 0

  // banner.text
  const banner = patched['banner'] as Record<string, unknown> | undefined
  if (banner && typeof banner === 'object') {
    const wrapped = wrapValue(banner['text'], STRING_VALUE_TYPE)
    if (wrapped) {
      patched = {...patched, banner: {...banner, text: wrapped}}
      totalChanges++
    }
  }

  // footer
  const footer = patched['footer'] as Record<string, unknown> | undefined
  if (footer && typeof footer === 'object') {
    let patchedFooter = {...footer}
    let footerChanges = 0

    // footer.newsletter
    const newsletter = patchedFooter['newsletter'] as Record<string, unknown> | undefined
    if (newsletter && typeof newsletter === 'object') {
      const NL_FIELDS: ScalarField[] = [
        {path: 'title', valueType: STRING_VALUE_TYPE},
        {path: 'body', valueType: TEXT_VALUE_TYPE},
        {path: 'placeholder', valueType: STRING_VALUE_TYPE},
        {path: 'buttonLabel', valueType: STRING_VALUE_TYPE},
      ]
      const {patched: patchedNl, changes: nlChanges} = applyScalarFields(newsletter, NL_FIELDS)
      if (nlChanges > 0) {
        patchedFooter = {...patchedFooter, newsletter: patchedNl}
        footerChanges += nlChanges
      }
    }

    // footer.columns[].title — all column variants have .title as internationalizedArrayString
    const columns = patchedFooter['columns'] as unknown[] | undefined
    if (Array.isArray(columns)) {
      let colChanges = 0
      const patchedColumns = columns.map((col) => {
        if (typeof col !== 'object' || col === null) return col
        const column = col as Record<string, unknown>
        const wrapped = wrapValue(column['title'], STRING_VALUE_TYPE)
        if (wrapped) {
          colChanges++
          return {...column, title: wrapped}
        }
        return column
      })
      if (colChanges > 0) {
        patchedFooter = {...patchedFooter, columns: patchedColumns}
        footerChanges += colChanges
      }
    }

    // footer.regions[].label
    const regions = patchedFooter['regions'] as unknown[] | undefined
    if (Array.isArray(regions)) {
      let regChanges = 0
      const patchedRegions = regions.map((reg) => {
        if (typeof reg !== 'object' || reg === null) return reg
        const region = reg as Record<string, unknown>
        const wrapped = wrapValue(region['label'], STRING_VALUE_TYPE)
        if (wrapped) {
          regChanges++
          return {...region, label: wrapped}
        }
        return region
      })
      if (regChanges > 0) {
        patchedFooter = {...patchedFooter, regions: patchedRegions}
        footerChanges += regChanges
      }
    }

    if (footerChanges > 0) {
      patched = {...patched, footer: patchedFooter}
      totalChanges += footerChanges
    }
  }

  // newsletterPopup.heading + legalText
  const popup = patched['newsletterPopup'] as Record<string, unknown> | undefined
  if (popup && typeof popup === 'object') {
    const POPUP_FIELDS: ScalarField[] = [
      {path: 'heading', valueType: STRING_VALUE_TYPE},
      {path: 'legalText', valueType: STRING_VALUE_TYPE},
    ]
    const {patched: patchedPopup, changes} = applyScalarFields(popup, POPUP_FIELDS)
    if (changes > 0) {
      patched = {...patched, newsletterPopup: patchedPopup}
      totalChanges += changes
    }
  }

  // notFoundPage.title + body
  const notFoundPage = patched['notFoundPage'] as Record<string, unknown> | undefined
  if (notFoundPage && typeof notFoundPage === 'object') {
    const NFP_FIELDS: ScalarField[] = [
      {path: 'title', valueType: STRING_VALUE_TYPE},
      {path: 'body', valueType: TEXT_VALUE_TYPE},
    ]
    const {patched: patchedNfp, changes} = applyScalarFields(notFoundPage, NFP_FIELDS)
    if (changes > 0) {
      patched = {...patched, notFoundPage: patchedNfp}
      totalChanges += changes
    }
  }

  // menu.links[]{menuGroup | menuShop}.label — only these two variants are internationalised
  const menu = patched['menu'] as Record<string, unknown> | undefined
  if (menu && typeof menu === 'object') {
    const links = menu['links'] as unknown[] | undefined
    if (Array.isArray(links)) {
      let linkChanges = 0
      const patchedLinks = links.map((link) => {
        if (typeof link !== 'object' || link === null) return link
        const linkObj = link as Record<string, unknown>
        const linkType = linkObj['_type'] as string | undefined
        if (linkType === 'menuGroup' || linkType === 'menuShop') {
          const wrapped = wrapValue(linkObj['label'], STRING_VALUE_TYPE)
          if (wrapped) {
            linkChanges++
            return {...linkObj, label: wrapped}
          }
        }
        return linkObj
      })
      if (linkChanges > 0) {
        patched = {...patched, menu: {...menu, links: patchedLinks}}
        totalChanges += linkChanges
      }
    }
  }

  // seo (global seo object: title internationalizedArrayString, description internationalizedArrayText)
  const seoGlobal = patched['seo'] as Record<string, unknown> | undefined
  if (seoGlobal && typeof seoGlobal === 'object') {
    const SEO_GLOBAL_FIELDS: ScalarField[] = [
      {path: 'title', valueType: STRING_VALUE_TYPE},
      {path: 'description', valueType: TEXT_VALUE_TYPE},
    ]
    const {patched: patchedSeo, changes} = applyScalarFields(seoGlobal, SEO_GLOBAL_FIELDS)
    if (changes > 0) {
      patched = {...patched, seo: patchedSeo}
      totalChanges += changes
    }
  }

  return {patch: buildTopLevelPatch(doc, patched), changes: totalChanges}
}

/**
 * home, page, mikmaxForBusiness — all have a pageBuilder array.
 *
 * SEO notes (verified against schemas):
 *   home            → seo.home  — title is plain string, NOT internationalised. SKIP.
 *   page            → seo.page  — title internationalizedArrayString. WRAP.
 *   mikmaxForBusiness → seo.page — title internationalizedArrayString. WRAP.
 */
function transformPageBuilderDoc(
  doc: Record<string, unknown>,
  opts: {hasSeoPage: boolean},
): {patch: Record<string, unknown>; changes: number} {
  let patched = {...doc}
  let totalChanges = 0

  // pageBuilder array
  const pageBuilder = patched['pageBuilder'] as unknown[] | undefined
  if (Array.isArray(pageBuilder)) {
    const {patched: patchedPb, changes} = transformPageBuilder(pageBuilder)
    if (changes > 0) {
      patched = {...patched, pageBuilder: patchedPb}
      totalChanges += changes
    }
  }

  // seo — only wrap for docs using seo.page (page, mikmaxForBusiness)
  if (opts.hasSeoPage) {
    const {patched: withSeo, changes: seoChanges} = transformSeoPage(patched, 'seo')
    if (seoChanges > 0) {
      patched = withSeo
      totalChanges += seoChanges
    }
  }

  return {patch: buildTopLevelPatch(doc, patched), changes: totalChanges}
}

// ---------------------------------------------------------------------------
// Document type registry
// ---------------------------------------------------------------------------

interface DocTypeConfig {
  type: string
  transform: (doc: Record<string, unknown>) => {patch: Record<string, unknown>; changes: number}
}

const DOC_TYPE_CONFIGS: DocTypeConfig[] = [
  {type: 'legalPage', transform: transformLegalPage},
  {type: 'product', transform: transformProduct},
  {type: 'look', transform: transformLook},
  {type: 'set', transform: transformSet},
  {type: 'b2bArea', transform: transformB2bArea},
  {type: 'post', transform: transformPost},
  {type: 'settings', transform: transformSettings},
  {
    type: 'home',
    transform: (doc) => transformPageBuilderDoc(doc, {hasSeoPage: false}),
  },
  {
    type: 'page',
    transform: (doc) => transformPageBuilderDoc(doc, {hasSeoPage: true}),
  },
  {
    type: 'mikmaxForBusiness',
    transform: (doc) => transformPageBuilderDoc(doc, {hasSeoPage: true}),
  },
]

// ---------------------------------------------------------------------------
// Main processing loop
// ---------------------------------------------------------------------------

async function processType(config: DocTypeConfig): Promise<void> {
  const {type, transform} = config

  // Fetch all docs of this type (published + drafts — both live in the same dataset)
  const docs = await client.fetch<Record<string, unknown>[]>(
    `*[_type == $type]`,
    {type},
  )

  console.log(`\n[${type}] found ${docs.length} doc(s)`)

  let updated = 0
  let skipped = 0

  for (const doc of docs) {
    const id = doc['_id'] as string
    const {patch, changes} = transform(doc)

    if (changes === 0) {
      skipped++
      console.log(`  SKIP  ${id}  (already up to date)`)
      continue
    }

    console.log(`  ${EXECUTE ? 'PATCH' : 'WOULD PATCH'}  ${id}  (${changes} field(s))`)

    if (EXECUTE) {
      // Single atomic patch of all changed top-level fields per document
      await client.patch(id).set(patch).commit()
    }

    updated++
  }

  console.log(`  → ${updated} to update, ${skipped} skipped`)
}

async function main(): Promise<void> {
  for (const config of DOC_TYPE_CONFIGS) {
    await processType(config)
  }

  console.log('\n' + '='.repeat(72))
  console.log(EXECUTE ? 'Migration complete.' : 'Dry run complete. No data was written.')
  console.log('='.repeat(72))
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
