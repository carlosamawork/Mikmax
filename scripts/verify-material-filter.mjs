// Verifica el filtro de material contra datos reales del store.
// Uso: node --env-file=.env.local scripts/verify-material-filter.mjs [material-slug]
// Ej.: node --env-file=.env.local scripts/verify-material-filter.mjs cotton

const domain = process.env.SHOPIFY_STORE_DOMAIN
const token = process.env.SHOPIFY_STOREFRONT_ACCESSTOKEN
const apiVersion = process.env.SHOPIFY_API_VERSION || '2025-10'
const target = (process.argv[2] || 'cotton').toLowerCase()

const slugify = (label) =>
  label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const mf = (alias, key) => `
  ${alias}: metafield(namespace: "shopify", key: "${key}") {
    references(first: 10) { nodes { ... on Metaobject { fields { key value } } } }
  }`

const query = `
  query {
    products(first: 250) {
      nodes {
        handle
        ${mf('coverMaterial', 'cover-material')}
        ${mf('fillerMaterial', 'filler-material')}
        ${mf('fabric', 'fabric')}
      }
    }
  }`

const res = await fetch(`https://${domain}/api/${apiVersion}/graphql.json`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': token},
  body: JSON.stringify({query}),
})
const json = await res.json()
if (json.errors) {
  console.error(JSON.stringify(json.errors, null, 2))
  process.exit(1)
}

const productSlugs = (p) => {
  const out = new Set()
  for (const k of ['coverMaterial', 'fillerMaterial', 'fabric']) {
    for (const n of p[k]?.references?.nodes ?? []) {
      const label = n.fields?.find((f) => f.key === 'label')?.value
      if (label) out.add(slugify(label))
    }
  }
  return out
}

const nodes = json?.data?.products?.nodes ?? []
const all = new Set()
const matches = []
for (const p of nodes) {
  const slugs = productSlugs(p)
  for (const s of slugs) all.add(s)
  if (slugs.has(target)) matches.push(p.handle)
}

console.log(`Materiales presentes en el catálogo: ${[...all].sort().join(', ') || '(ninguno)'}`)
console.log(`\nProductos con material "${target}" (${matches.length}):`)
for (const h of matches) console.log(`  - ${h}`)
if (!all.has(target)) console.log(`\n⚠️  "${target}" no existe; prueba uno de la lista de arriba.`)
